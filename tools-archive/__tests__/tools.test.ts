// Tool unit tests — verify each tool works correctly.
// Run with: npx tsx app/src/lib/server/tools/__tests__/tools.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { executeTool } from '../execute.js';
import { compressTool } from '../compress.js';
import { searchTool, indexTool } from '../search.js';

// ── Execute Tool Tests ─────────────────────────────────────────────

describe('executeTool', () => {
	it('should run shell code and return stdout', async () => {
		const result = await executeTool.execute({ language: 'shell', code: 'echo "hello world"' });
		assert.ok(result.includes('hello world'), `Expected "hello world" in result, got: ${result}`);
	});

	it('should capture non-zero exit codes', async () => {
		const result = await executeTool.execute({ language: 'shell', code: 'exit 42' });
		assert.ok(result.includes('Exit code 42'), `Expected "Exit code 42" in result, got: ${result}`);
	});

	it('should timeout long-running commands', async () => {
		await assert.rejects(
			() => executeTool.execute({ language: 'shell', code: 'sleep 10', timeout: 1 }),
			/Execution timed out/
		);
	});

	it('should run JavaScript code', async () => {
		const result = await executeTool.execute({
			language: 'javascript',
			code: 'console.log(2 + 2)'
		});
		assert.ok(result.includes('4'), `Expected "4" in result, got: ${result}`);
	});
});

// ── Compress Tool Tests ────────────────────────────────────────────

describe('compressTool', () => {
	it('should acknowledge compression request', async () => {
		const result = await compressTool.execute({
			topic: 'bug fix applied',
			content: [{ startId: 'msg_1', endId: 'msg_5', summary: 'Fixed off-by-one error' }]
		});
		assert.ok(
			result.includes('Compression complete'),
			`Expected "Compression complete" in result, got: ${result}`
		);
		assert.ok(result.includes('bug fix applied'), `Expected topic in result, got: ${result}`);
	});

	it('should dedup a repeat call with the same topic and summary', async () => {
		const args = {
			topic: 'dedup check topic',
			content: [{ startId: 'msg_a', endId: 'msg_b', summary: 'dedup check summary' }]
		} as const;

		const first = await compressTool.execute(args);
		assert.ok(first.includes('Compression complete'), `First call should succeed, got: ${first}`);

		const second = await compressTool.execute(args);
		assert.ok(second.includes('Duplicate'), `Second call should report duplicate, got: ${second}`);
	});
});

// ── Search Tool Tests ─────────────────────────────────────────────

describe('searchTool', () => {
	it('should return graceful message when store unavailable', async () => {
		const result = await searchTool.execute({ queries: ['nonexistent'] });
		assert.ok(
			result.includes('Knowledge store unavailable'),
			`Expected fallback message, got: ${result}`
		);
	});
});

describe('indexTool', () => {
	it('should require content or path', async () => {
		const result = await indexTool.execute({ source: 'test' });
		assert.ok(result.includes('Error'), `Expected error, got: ${result}`);
	});

	it('should accept content for indexing', async () => {
		const result = await indexTool.execute({
			content: '# Test Doc\n\nSome test content here.',
			source: 'test-doc'
		});
		assert.ok(result.includes('Indexed'), `Expected "Indexed" in result, got: ${result}`);
		assert.ok(result.includes('test-doc'), `Expected source in result, got: ${result}`);
	});
});
