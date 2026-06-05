// Node-tools eval mode: control baseline with three plain tools backed by
// Node stdlib (node:child_process, node:fs). No FTS5, no auto-indexing,
// no compression — just shell, read, write.

import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

const SHELL_MAX_OUTPUT = 10 * 1024;
const SHELL_DEFAULT_TIMEOUT_S = 30;
const READ_MAX_BYTES = 1024 * 1024;

const SHELL_TRUNCATION_MARKER = (n: number) => `\n[... ${n} bytes truncated ...]\n`;

// ── Tool definitions ────────────────────────────────────────────────────

export const BASELINE_TOOL_DEFS: ChatCompletionTool[] = [
	{
		type: 'function',
		function: {
			name: 'shell',
			description: 'Run a shell command. Returns combined output, truncated to 10KB.',
			parameters: {
				type: 'object',
				properties: {
					command: { type: 'string', description: 'Shell command to run' },
					timeout: { type: 'number', description: 'Timeout in seconds (default 30)' }
				},
				required: ['command']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'read_file',
			description: 'Read a file (capped at 1MB). Optionally limit to first N lines.',
			parameters: {
				type: 'object',
				properties: {
					path: { type: 'string', description: 'File path to read' },
					maxLines: { type: 'number', description: 'If set, return at most this many lines' }
				},
				required: ['path']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'write_file',
			description: 'Write a file. Creates parent directories as needed.',
			parameters: {
				type: 'object',
				properties: {
					path: { type: 'string', description: 'File path to write' },
					content: { type: 'string', description: 'File contents' }
				},
				required: ['path', 'content']
			}
		}
	}
];

// ── Implementations ─────────────────────────────────────────────────────

function truncateTail(buf: Buffer, cap: number): Buffer {
	if (buf.length <= cap) return buf;
	const marker = SHELL_TRUNCATION_MARKER(buf.length - cap);
	const markerBytes = Buffer.byteLength(marker, 'utf8');
	const keep = Math.max(0, cap - markerBytes);
	return Buffer.concat([Buffer.from(marker, 'utf8'), buf.subarray(buf.length - keep)]);
}

function shellImpl(args: { command: string; timeout?: number }): Promise<string> {
	const { promise, resolve, reject } = Promise.withResolvers<string>();
	const timeoutS = args.timeout ?? SHELL_DEFAULT_TIMEOUT_S;

	const child = spawn(args.command, { shell: true });
	const started = Date.now();

	const outChunks: Buffer[] = [];
	const errChunks: Buffer[] = [];
	let outLen = 0;
	let errLen = 0;
	let truncated = false;

	child.stdout?.on('data', (chunk: Buffer) => {
		outChunks.push(chunk);
		outLen += chunk.length;
		if (outLen > SHELL_MAX_OUTPUT * 2) {
			truncated = true;
			child.kill('SIGKILL');
		}
	});
	child.stderr?.on('data', (chunk: Buffer) => {
		errChunks.push(chunk);
		errLen += chunk.length;
		if (errLen > SHELL_MAX_OUTPUT * 2) {
			truncated = true;
			child.kill('SIGKILL');
		}
	});

	const timer = setTimeout(() => {
		child.kill('SIGKILL');
	}, timeoutS * 1000);

	child.on('error', (err) => {
		clearTimeout(timer);
		reject(err);
	});

	child.on('close', (code) => {
		clearTimeout(timer);
		const elapsedMs = Date.now() - started;
		let stdout = Buffer.concat(outChunks);
		let stderr = Buffer.concat(errChunks);

		// Combine within the cap, then split roughly in half so each stream keeps some room.
		const cap = SHELL_MAX_OUTPUT;
		if (stdout.length + stderr.length > cap) {
			const outCap = Math.floor(cap / 2);
			const errCap = cap - outCap;
			stdout = truncateTail(stdout, outCap);
			stderr = truncateTail(stderr, errCap);
		}

		const exitCode = code ?? -1;
		const header = truncated
			? `exit=${exitCode}\n[output exceeded cap, killed]\n`
			: `exit=${exitCode}\n`;
		const body =
			`stdout=${stdout.toString('utf8')}\n` +
			`stderr=${stderr.toString('utf8')}\n` +
			`wall_ms=${elapsedMs}`;
		resolve(header + body);
	});

	return promise;
}

async function readFileImpl(args: { path: string; maxLines?: number }): Promise<string> {
	const buf = await readFile(args.path);
	const capped = buf.length > READ_MAX_BYTES ? buf.subarray(0, READ_MAX_BYTES) : buf;
	const content = capped.toString('utf8');
	const allLines = content.split('\n');
	const lines = args.maxLines !== undefined ? allLines.slice(0, args.maxLines) : allLines;
	return JSON.stringify({
		content: lines.join('\n'),
		sizeBytes: buf.length,
		lines: lines.length
	});
}

async function writeFileImpl(args: { path: string; content: string }): Promise<string> {
	await mkdir(dirname(args.path), { recursive: true });
	const bytesWritten = await writeFile(args.path, args.content, 'utf8');
	return JSON.stringify({ path: args.path, bytesWritten: Buffer.byteLength(args.content, 'utf8') });
}

// ── Dispatcher ──────────────────────────────────────────────────────────

type Args = Record<string, unknown>;

export async function dispatchBaseline(name: string, args: Args): Promise<string> {
	switch (name) {
		case 'shell':
			return shellImpl(args as { command: string; timeout?: number });
		case 'read_file':
			return readFileImpl(args as { path: string; maxLines?: number });
		case 'write_file':
			return writeFileImpl(args as { path: string; content: string });
		default:
			throw new Error(`Unknown tool: ${name}`);
	}
}
