import { adaptTool, ExecuteParams } from './types';
import { spawn } from 'node:child_process';
import Database from 'better-sqlite3';
import { getIndexedRepo } from '../../shared/entities/KnowledgeStore.js';
import { initFts5, searchFts5 } from '../fts5';

// Execute sandbox tool — replaces bash, python, curl, grep, find, etc.
// Runs code in a subprocess with timeout and size limits.
// Only stdout enters the conversation; raw bytes stay in the sandbox.
// Outputs larger than MAX_OUTPUT_BYTES are auto-indexed to FTS5 and a
// pointer (or, when `intent` is set, BM25-ranked previews) is returned
// in their place. Pass `intent` for large outputs.

const MAX_OUTPUT_BYTES = 100 * 1024; // 100KB cap; outputs above this auto-index
const AUTO_INDEX_THRESHOLD = 5 * 1024; // 5KB: previews kick in here, not at the cap
const CHUNK_MIN_CHARS = 20;
const POINTER_PREVIEW_CHARS = 200;
const SESSION_ID = 'default';
const INTENT_HIT_LIMIT = 5;
const INTENT_PREVIEW_CHARS = 240;

// The api module owns the primary DB connection. We open a second handle
// here so we can run BM25 MATCH queries against chunks_fts without
// round-tripping through Remult (the fts5 virtual table is not exposed
// via the Remult repo). better-sqlite3 reads the same on-disk file and
// picks up the existing virtual table + triggers installed by api.ts.
const ftsDb: Database.Database = new Database('./db.sqlite');
initFts5(ftsDb);

async function ensureRemult(): Promise<void> {
	// The SvelteKit server loads $lib/server/api, which sets
	// globalThis.remultApi and runs schema creation. In CLI / test
	// contexts that bootstrap never runs, so we lazy-import it on first
	// use. The import is idempotent and CREATE TABLE statements are
	// IF NOT EXISTS, so re-import is a no-op.
	if (globalThis.remultApi) return;
	await import('../api.js');
}

function runInRemultContext<T>(fn: () => Promise<T>): Promise<T> {
	// Remult repo operations need a live request cycle; the api helper
	// exposes withRemult for exactly this. When the api is not
	// installed (e.g. we somehow reach this code path with no server),
	// just run the function — Remult will throw a clear error and the
	// caller's catch will surface it.
	const api = (
		globalThis as {
			remultApi?: { withRemult: (req: undefined, what: () => Promise<T>) => Promise<T> };
		}
	).remultApi;
	if (api) return api.withRemult(undefined, fn);
	return fn();
}

function detectContentType(chunk: string): 'json' | 'code' | 'text' {
	const trimmed = chunk.trimStart();
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
	if (chunk.includes('```') || chunk.includes('function ') || chunk.includes('class '))
		return 'code';
	return 'text';
}

interface RunResult {
	// The first MAX_OUTPUT_BYTES of stdout, for inline display.
	inlineOut: string;
	// The full stdout (utf-8) regardless of size, for auto-indexing.
	fullOut: string;
	// Aggregated stderr (utf-8). Always shown on non-zero exit.
	stderr: string;
	exitCode: number | null;
	totalBytes: number;
}

function runCode(code: string, language: string, timeoutSec: number): Promise<RunResult> {
	return new Promise((resolve, reject) => {
		const cmd = language === 'shell' ? code : getRuntimeCommand(language, code);
		const parts = parseCommand(cmd);

		const child = spawn(parts[0], parts.slice(1), {
			stdio: ['pipe', 'pipe', 'pipe'],
			env: sanitizeEnv(process.env),
			shell: language === 'shell'
		});

		const timer = setTimeout(() => {
			child.kill('SIGKILL');
			reject(new Error(`Execution timed out after ${timeoutSec}s`));
		}, timeoutSec * 1000);

		// inlineStdout is capped at MAX_OUTPUT_BYTES — the bytes we keep
		// for the LLM. fullStdout is uncapped — every byte the subprocess
		// produced, ready for FTS5 indexing. The two diverging buffers
		// replace the old "drop past the cap" behaviour.
		const inlineStdout: Buffer[] = [];
		const fullStdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		let inlineBytes = 0;
		let totalBytes = 0;

		child.stdout.on('data', (chunk: Buffer) => {
			totalBytes += chunk.length;
			fullStdout.push(chunk);
			if (inlineBytes < MAX_OUTPUT_BYTES) {
				const remaining = MAX_OUTPUT_BYTES - inlineBytes;
				inlineStdout.push(chunk.subarray(0, remaining));
				inlineBytes += Math.min(chunk.length, remaining);
			}
		});

		child.stderr.on('data', (chunk: Buffer) => {
			stderr.push(chunk);
		});

		child.on('close', (exitCode) => {
			clearTimeout(timer);
			resolve({
				inlineOut: Buffer.concat(inlineStdout).toString('utf-8'),
				fullOut: Buffer.concat(fullStdout).toString('utf-8'),
				stderr: Buffer.concat(stderr).toString('utf-8'),
				exitCode,
				totalBytes
			});
		});

		child.on('error', (err) => {
			clearTimeout(timer);
			reject(new Error(`Execution error: ${err.message}`));
		});

		if (language !== 'shell') {
			child.stdin.end();
		}
	});
}

function getRuntimeCommand(language: string, code: string): string {
	const runners: Record<string, (c: string) => string> = {
		javascript: (c) => `node -e ${escapeArg(c)}`,
		typescript: (c) => `npx --yes tsx -e ${escapeArg(c)}`,
		python: (c) => `python3 -c ${escapeArg(c)}`,
		ruby: (c) => `ruby -e ${escapeArg(c)}`,
		go: (c) => {
			throw new Error('Go is not supported in quick-exec mode. Use shell and run a temp file.');
		},
		rust: () => {
			throw new Error('Rust is not supported in quick-exec mode. Use shell and run cargo.');
		},
		php: (c) => `php -r ${escapeArg(c)}`,
		perl: (c) => `perl -e ${escapeArg(c)}`,
		r: (c) => `Rscript -e ${escapeArg(c)}`,
		elixir: (c) => `elixir -e ${escapeArg(c)}`,
		csharp: (c) => `dotnet script -e ${escapeArg(c)}`
	};

	const runner = runners[language];
	if (!runner) throw new Error(`Unsupported language: ${language}`);
	return runner(code);
}

function escapeArg(arg: string): string {
	// Single-quote with proper escaping for shell
	return `'${arg.replace(/'/g, "'\\''")}'`;
}

function parseCommand(cmd: string): string[] {
	const args: string[] = [];
	let current = '';
	let inSingle = false;
	let inDouble = false;

	for (let i = 0; i < cmd.length; i++) {
		const c = cmd[i];
		if (c === "'" && !inDouble) {
			inSingle = !inSingle;
			continue;
		}
		if (c === '"' && !inSingle) {
			inDouble = !inDouble;
			continue;
		}
		if (c === ' ' && !inSingle && !inDouble) {
			if (current) {
				args.push(current);
				current = '';
			}
			continue;
		}
		if (c === '\\' && inDouble) {
			current += cmd[++i] || '';
			continue;
		}
		current += c;
	}
	if (current) args.push(current);
	return args;
}

function sanitizeEnv(env: NodeJS.ProcessEnv): Record<string, string> {
	const safe: Record<string, string> = {};
	const allowlist = new Set([
		'PATH',
		'HOME',
		'USER',
		'SHELL',
		'TMPDIR',
		'NODE_PATH',
		'LANG',
		'LC_ALL'
	]);
	for (const key of allowlist) {
		const val = env[key];
		if (val) safe[key] = val;
	}
	return safe;
}
export const executeTool = adaptTool({
	name: 'execute',
	description: [
		'Run code in a sandboxed subprocess. Languages: shell, javascript, typescript, python, ruby, go, rust, php, perl, r, elixir, csharp.',
		'',
		'WHEN:',
		'- You need to derive an answer FROM data (filter, count, aggregate, parse, compare, transform)',
		'- You want to run bash commands (npm, git, curl, grep, find, docker, kubectl, gh, etc.)',
		'- The output may be large — only what you print() or console.log() enters your conversation',
		'- Pass `intent` when output may exceed ~5KB — it gets auto-indexed and the response carries section titles + previews ranked against the intent (BM25), not the raw text',
		'',
		'WHEN NOT:',
		'- Single observational command with short output (whoami, pwd, git status) — Bash is simpler',
		'- You intend to EDIT a file — use separate edit tool so hashline anchors work',
		'- You only need to see a specific line range — use read with offset/limit',
		'',
		'RETURNS:',
		'- Small output (≤ 5KB): inline as a string',
		'- Large output (> 5KB) without `intent`: pointer string + first 200 chars. Use search(queries: [...], source: "execute:<language>") to retrieve specific sections.',
		'- Large output (> 5KB) with `intent`: section titles + previews ranked by BM25 against the intent. Use search() for full section text.',
		'- The 100KB cap is no longer a hard drop — bytes past it are indexed, not lost.'
	].join('\n'),
	parameters: ExecuteParams,
	execute: async (args) => {
		const params = args as unknown as ExecuteParams;
		const { language, code, intent, timeout = 30 } = params;

		const run = await runCode(code, language, timeout);

		// Non-zero exit: always show inline regardless of size — the user
		// needs the error context. We don't auto-index error output.
		if (run.exitCode !== 0) {
			const head = formatResultHead(run, intent);
			return head ?? `(no output; stderr: ${run.stderr || '(empty)'})`;
		}

		const source = `execute:${language}`;

		// `intent` is the model saying "I want chunked, BM25-ranked previews of
		// this output" — honor that signal even for small outputs, so the
		// response is consistently indexable rather than size-dependent.
		if (intent || run.totalBytes > AUTO_INDEX_THRESHOLD) {
			const stored = await indexOutput({ fullOut: run.fullOut, source });
			if (intent && stored > 0) {
				return formatIntentPreview({ intent, source, fullOut: run.fullOut, stored });
			}
			return formatPointer({ run, source, stored });
		}

		// Small output, no intent: return inline as before.
		return run.inlineOut || '(no output)';
	}
});

// Format the inline result for non-zero exit codes, also including the
// first POINTER_PREVIEW_CHARS of stdout so the user can see partial
// context alongside the error. Returns null if there is nothing useful
// to show (caller falls back to a stderr-only message).
function formatResultHead(run: RunResult, _intent: string | undefined): string | null {
	if (run.exitCode === 0) return null;
	const err = run.stderr;
	const out = run.inlineOut;
	if (out && err) return `Exit code ${run.exitCode}\n\nstderr:\n${err}\n\n${out}`;
	if (out) return `Exit code ${run.exitCode}\n\n${out}`;
	if (err) return `Exit code ${run.exitCode}\n\nstderr:\n${err}`;
	return `Exit code ${run.exitCode}`;
}

// Chunk the full output on double-newline boundaries, drop anything
// shorter than CHUNK_MIN_CHARS (noise), and persist each chunk to the
// FTS5-backed IndexedContent table. The inserted rows flow into
// chunks_fts via the triggers installed by initFts5 in api.ts.
async function indexOutput({
	fullOut,
	source
}: {
	fullOut: string;
	source: string;
}): Promise<number> {
	try {
		await ensureRemult();
		const chunks = fullOut
			.split(/\n\n+/)
			.map((c) => c.trim())
			.filter((c) => c.length >= CHUNK_MIN_CHARS);
		if (chunks.length === 0) return 0;
		const repo = getIndexedRepo();
		const contentType = detectContentType(fullOut);
		let stored = 0;
		await runInRemultContext(async () => {
			for (let i = 0; i < chunks.length; i++) {
				await repo.insert({
					source,
					content: chunks[i],
					contentType,
					scope: 'session',
					sessionId: SESSION_ID,
					chunkIndex: i
				});
				stored++;
			}
		});
		return stored;
	} catch (err) {
		// Auto-indexing is best-effort. If the knowledge store is
		// unavailable (e.g. a one-off CLI invocation with no schema),
		// fall through to returning the truncated inline text so the
		// user still gets something useful.
		console.warn(`[execute] auto-index failed: ${(err as Error).message}`);
		return -1;
	}
}

// BM25-ranked section previews matching the caller's intent. We use
// ftsDb (the second sqlite handle) to run a MATCH query against
// chunks_fts; the fts5 module's searchFts5 joins back to indexedContent
// and orders by bm25() ascending (lower = better match).
function formatIntentPreview({
	intent,
	source,
	fullOut,
	stored
}: {
	intent: string;
	source: string;
	fullOut: string;
	stored: number;
}): string {
	let hits: Array<{ content: string; score: number; source: string }>;
	try {
		hits = searchFts5(ftsDb, intent, INTENT_HIT_LIMIT);
	} catch (err) {
		// FTS query parse error (e.g. intent contained an unbalanced
		// quote) — degrade to the pointer rather than failing the call.
		return formatPointer({
			run: { fullOut, inlineOut: '', stderr: '', exitCode: 0, totalBytes: fullOut.length },
			source,
			stored
		});
	}

	if (hits.length === 0) {
		return [
			`Auto-indexed ${stored} chunks to source "${source}".`,
			`No FTS hits for intent "${intent}". Try a different query.`,
			`To retrieve: search(queries: ["${intent}"], source: "${source}")`,
			'',
			'First 200 chars:',
			fullOut.slice(0, POINTER_PREVIEW_CHARS)
		].join('\n');
	}

	const lines: string[] = [];
	lines.push(`Auto-indexed ${stored} chunks to source "${source}" (intent: "${intent}").`);
	lines.push(
		`Top ${hits.length} matching section${hits.length === 1 ? '' : 's'} (BM25, lower score = better match):`
	);
	lines.push('');
	for (let i = 0; i < hits.length; i++) {
		const h = hits[i];
		const preview =
			h.content.length > INTENT_PREVIEW_CHARS
				? h.content.slice(0, INTENT_PREVIEW_CHARS) + '...'
				: h.content;
		lines.push(`[${i + 1}] score=${h.score.toFixed(3)}`);
		lines.push(preview);
		lines.push('');
	}
	lines.push(
		`To retrieve a specific section in full: search(queries: ["${intent}"], source: "${source}")`
	);
	return lines.join('\n').trimEnd();
}

// Pointer returned when output is large but no intent is set. Mirrors
// the text the user sees so they can immediately reach for search().
function formatPointer({
	run,
	source,
	stored
}: {
	run: RunResult;
	source: string;
	stored: number;
}): string {
	const head = `Output exceeds 100KB. Auto-indexed to search(). ${stored} chunks stored under source "${source}".`;
	if (stored <= 0) {
		// Indexing failed (knowledge store unavailable, all chunks
		// below the min-length threshold, etc). Fall back to the old
		// behaviour: return as much of the inline head as we kept.
		return `${head}\n(auto-index unavailable; returning truncated stdout)\n\n${run.inlineOut || run.fullOut.slice(0, MAX_OUTPUT_BYTES)}`;
	}
	return [
		head,
		`To retrieve: search(queries: [...], source: "${source}")`,
		'',
		'First 200 chars:',
		(run.fullOut || run.inlineOut).slice(0, POINTER_PREVIEW_CHARS)
	].join('\n');
}
