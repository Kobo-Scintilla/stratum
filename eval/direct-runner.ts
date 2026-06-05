// Direct eval runner.
//
// For every (task, mode) pair we drive an OpenAI-compatible chat completion
// loop through Bifrost and capture per-call metrics. In `with-tools` mode the
// model receives the four Flue tool definitions (execute / compress / search
// / index) and we dispatch each tool call to the real implementation; in
// `no-tools` mode the model must answer in text alone.
//
// Output: a markdown table to stdout and a JSON dump under eval/results/.

import OpenAI from 'openai';
import type {
	ChatCompletionMessageParam,
	ChatCompletionMessageToolCall,
	ChatCompletionTool
} from 'openai/resources/chat/completions';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOL_DEFS } from './direct-tool-defs.js';
import { BASELINE_TOOL_DEFS, dispatchBaseline } from './baseline-tool-defs.js';
import { checkAnswer, type CheckResult } from './direct-ground-truth.js';
import { EVAL_TASKS, getTask, type EvalTask } from './direct-tasks.js';
import { executeTool } from '../src/lib/server/tools/execute.js';
import { compressTool } from '../src/lib/server/tools/compress.js';
import { searchTool, indexTool } from '../src/lib/server/tools/search.js';

// ── CLI parsing ─────────────────────────────────────────────────────────

type Mode = 'with-tools' | 'node-tools' | 'no-tools';

function parseArgs(argv: string[]): { taskId?: string; mode?: Mode; list: boolean } {
	const out: { taskId?: string; mode?: Mode; list: boolean } = { list: false };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--task') out.taskId = argv[++i];
		else if (a === '--mode') {
			const m = argv[++i];
			if (m !== 'with-tools' && m !== 'node-tools' && m !== 'no-tools') {
				throw new Error(`--mode must be with-tools, node-tools, or no-tools, got ${m}`);
			}
			out.mode = m;
		} else if (a === '--list') out.list = true;
	}
	return out;
}

// ── Tool dispatch ──────────────────────────────────────────────────────

// search.ts exports both `searchTool` and `indexTool`; the others are
// single-export. We look up by `${name}Tool` from a small map.
const TOOL_REGISTRY: Record<string, { execute: (a: unknown) => Promise<string> }> = {
	execute: executeTool as unknown as { execute: (a: unknown) => Promise<string> },
	compress: compressTool as unknown as { execute: (a: unknown) => Promise<string> },
	search: searchTool as unknown as { execute: (a: unknown) => Promise<string> },
	index: indexTool as unknown as { execute: (a: unknown) => Promise<string> }
};

async function dispatchTool(name: string, args: unknown): Promise<string> {
	const t = TOOL_REGISTRY[name];
	if (!t) return `unknown tool ${name}`;
	try {
		return await t.execute(args);
	} catch (e) {
		return `error: ${(e as Error).message}`;
	}
}

// ── Per-run metrics ────────────────────────────────────────────────────

type RunResult = {
	taskId: string;
	mode: Mode;
	totalIn: number;
	totalOut: number;
	totalReason: number;
	turns: number;
	toolCalls: number;
	toolLog: Array<{ name: string; argsPreview: string }>;
	wallMs: number;
	finalAnswer: string;
	success: boolean;
	gtReason: string;
	error?: string;
};

function argsPreview(args: unknown): string {
	let s: string;
	try {
		s = JSON.stringify(args);
	} catch {
		s = String(args);
	}
	return s.length > 120 ? s.slice(0, 117) + '...' : s;
}

// ── Single (task, mode) run ────────────────────────────────────────────

const SYSTEM_WITH_TOOLS =
	'You have tools: execute, compress, search, index. Use them when they help. ' +
	'Reply with the final answer when you are done. If the task asks for a number, reply with only the integer.';

const SYSTEM_NODE_TOOLS =
	'You have access to three Node-backed tools: shell (runs shell commands), read_file (reads files), write_file (writes files). ' +
	'Use them when they help. Reply with the final answer when you are done.';

const SYSTEM_NO_TOOLS =
	'You have no tools. Answer the question in text only. ' +
	'If the task asks for a number, reply with only the integer.';

const SAFETY_TURN_CAP = 20;

type DispatchFn = (name: string, args: unknown) => Promise<string>;

async function runOne(
	client: OpenAI,
	task: EvalTask,
	mode: Mode,
	model: string,
	dispatchFn: DispatchFn
): Promise<RunResult> {
	const tools: ChatCompletionTool[] =
		mode === 'with-tools' ? TOOL_DEFS : mode === 'node-tools' ? BASELINE_TOOL_DEFS : [];
	const system: string =
		mode === 'with-tools' ? SYSTEM_WITH_TOOLS : mode === 'node-tools' ? SYSTEM_NODE_TOOLS : SYSTEM_NO_TOOLS;
	const messages: ChatCompletionMessageParam[] = [
		{ role: 'system', content: system },
		{ role: 'user', content: task.prompt }
	];


	let totalIn = 0;
	let totalOut = 0;
	let totalReason = 0;
	let turns = 0;
	let toolCalls = 0;
	const toolLog: RunResult['toolLog'] = [];
	const t0 = Date.now();
	let finalAnswer = '';
	let error: string | undefined;

	try {
		for (let i = 0; i < SAFETY_TURN_CAP; i++) {
			const r = await client.chat.completions.create({
				model,
				messages,
				tools: tools.length ? tools : undefined,
				tool_choice: tools.length ? 'auto' : 'none',
				temperature: 0,
				max_tokens: 2048
			});

			const msg = r.choices[0].message;
			turns++;
			totalIn += r.usage?.prompt_tokens ?? 0;
			totalOut += r.usage?.completion_tokens ?? 0;
			totalReason += r.usage?.completion_tokens_details?.reasoning_tokens ?? 0;

			// OpenAI SDK accepts the assistant message back into the history; cast
			// to the param shape (response has a few extra fields like `refusal`).
			messages.push(msg as ChatCompletionMessageParam);

			const tcs: ChatCompletionMessageToolCall[] = msg.tool_calls ?? [];
			if (tcs.length === 0) {
				finalAnswer = msg.content ?? '';
				break;
			}

			for (const tc of tcs) {
				toolCalls++;
				let parsed: unknown = {};
				try {
					parsed = JSON.parse(tc.function.arguments);
				} catch {
					parsed = tc.function.arguments;
				}
				toolLog.push({ name: tc.function.name, argsPreview: argsPreview(parsed) });
				const result = await dispatchFn(tc.function.name, parsed);
				messages.push({
					role: 'tool',
					tool_call_id: tc.id,
					content: result
				});
			}

			// If the model produced text alongside the tool calls, keep it
			// as a candidate answer if the next turn has no tool calls.
			if (msg.content) finalAnswer = msg.content;
		}
	} catch (e) {
		error = (e as Error).message;
	}

	const wall = Date.now() - t0;
	const verdict: CheckResult = error
		? { pass: false, reason: `error: ${error}` }
		: checkAnswer(finalAnswer, task.groundTruth);

	return {
		taskId: task.id,
		mode,
		totalIn,
		totalOut,
		totalReason,
		turns,
		toolCalls,
		toolLog,
		wallMs: wall,
		finalAnswer,
		success: verdict.pass,
		gtReason: verdict.reason,
		error
	};
}

// ── Reporting ──────────────────────────────────────────────────────────

function pad(s: string | number, n: number, right = false): string {
	const str = String(s);
	if (str.length >= n) return str.slice(0, n);
	const fill = ' '.repeat(n - str.length);
	return right ? fill + str : str + fill;
}

function renderTable(results: RunResult[]): string {
	const header = [
		pad('task', 18),
		pad('mode', 11),
		pad('in_tok', 8, true),
		pad('out_tok', 8, true),
		pad('turns', 6, true),
		pad('tools', 6, true),
		pad('success', 8),
		pad('wall_ms', 9, true)
	].join(' | ');
	const sep = header.split(' | ').map((c) => '-'.repeat(c.length)).join('-+-');
	const rows = results.map((r) =>
		[
			pad(r.taskId, 18),
			pad(r.mode, 11),
			pad(r.totalIn, 8, true),
			pad(r.totalOut, 8, true),
			pad(r.turns, 6, true),
			pad(r.toolCalls, 6, true),
			pad(r.success ? 'PASS' : 'FAIL', 8),
			pad(r.wallMs, 9, true)
		].join(' | ')
	);
	return [header, sep, ...rows].join('\n');
}

type Aggregate = { count: number; meanIn: number; meanOut: number; meanReason: number; success: number };

function aggregate(results: RunResult[]): Record<Mode, Aggregate> {
	const out: Record<Mode, Aggregate> = {
		'with-tools': { count: 0, meanIn: 0, meanOut: 0, meanReason: 0, success: 0 },
		'node-tools': { count: 0, meanIn: 0, meanOut: 0, meanReason: 0, success: 0 },
		'no-tools': { count: 0, meanIn: 0, meanOut: 0, meanReason: 0, success: 0 }
	};
	for (const r of results) {
		const a = out[r.mode];
		a.count++;
		a.meanIn += r.totalIn;
		a.meanOut += r.totalOut;
		a.meanReason += r.totalReason;
		a.success += r.success ? 1 : 0;
	}
	for (const m of Object.keys(out) as Mode[]) {
		const a = out[m];
		if (a.count > 0) {
			a.meanIn = Math.round(a.meanIn / a.count);
			a.meanOut = Math.round(a.meanOut / a.count);
			a.meanReason = Math.round(a.meanReason / a.count);
		}
	}
	return out;
}

function renderSummary(results: RunResult[]): string {
	const agg = aggregate(results);
	const lines: string[] = ['\nSummary by mode:'];
	for (const m of ['with-tools', 'node-tools', 'no-tools'] as Mode[]) {
		const a = agg[m];
		if (a.count === 0) {
			lines.push(`  ${m.padEnd(11)} (no runs)`);
			continue;
		}
		lines.push(
			`  ${m.padEnd(11)} n=${a.count}  mean_in_tok=${a.meanIn}  mean_out_tok=${a.meanOut} ` +
				`(reason=${a.meanReason})  success=${a.success}/${a.count} ` +
				`(${(100 * a.success / a.count).toFixed(0)}%)`
		);
	}
	return lines.join('\n');
}

// ── Entry point ────────────────────────────────────────────────────────

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	if (args.list) {
		console.log('Available tasks:');
		for (const t of EVAL_TASKS) console.log(`  - ${t.id}  [${t.category}]`);
		return;
	}

	const taskIds: string[] = args.taskId ? [args.taskId] : EVAL_TASKS.map((t) => t.id);
	const modes: Mode[] = args.mode ? [args.mode] : ['with-tools', 'node-tools', 'no-tools'];

	const baseURL = process.env.BIFROST_URL || 'http://172.18.0.2:8080/v1';
	const model = process.env.EVAL_MODEL || 'b-opencodezen/deepseek-v4-flash-free';
	const client = new OpenAI({ baseURL, apiKey: 'none' });

	console.log(`# Eval runner (direct)`);
	console.log(`baseURL: ${baseURL}`);
	console.log(`model:   ${model}`);
	console.log(`tasks:   ${taskIds.join(', ')}`);
	console.log(`modes:   ${modes.join(', ')}\n`);

	const results: RunResult[] = [];
	for (const tid of taskIds) {
		const task = getTask(tid);
		if (!task) {
			console.error(`unknown task: ${tid} (use --list to see available)`);
			process.exitCode = 2;
			return;
		}
		for (const mode of modes) {
			process.stdout.write(`[${task.id} / ${mode}] running... `);
			const r = await runOne(client, task, mode, model, mode === 'node-tools' ? dispatchBaseline : dispatchTool);
			results.push(r);
			const verdict = r.error ? `ERROR (${r.error.slice(0, 80)})` : r.success ? 'PASS' : 'FAIL';
			console.log(
				`${verdict}  in=${r.totalIn} out=${r.totalOut} turns=${r.turns} tools=${r.toolCalls} wall=${r.wallMs}ms`
			);
			if (r.error) {
				console.log(`  error: ${r.error}`);
			} else {
				console.log(`  answer: ${r.finalAnswer.replace(/\n/g, ' ').slice(0, 200)}`);
				console.log(`  verdict: ${r.gtReason}`);
			}
		}
	}

	console.log('\n' + renderTable(results));
	console.log(renderSummary(results));

	// Persist JSON
	const here = dirname(fileURLToPath(import.meta.url));
	const outDir = join(here, 'results');
	await mkdir(outDir, { recursive: true });
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	const outFile = join(outDir, `run-${stamp}.json`);
	await writeFile(
		outFile,
		JSON.stringify(
			{
				baseURL,
				model,
				startedAt: new Date().toISOString(),
				results
			},
			null,
			2
		)
	);
	console.log(`\nWrote ${outFile}`);
}

main().catch((e) => {
	console.error('runner failed:', e);
	process.exit(1);
});
