// Mimic execute.ts pattern exactly
import { defineTool as _ } from '@flue/runtime';  // ensure @flue is loaded
import { getIndexedRepo } from './src/lib/shared/entities/KnowledgeStore.js';

async function ensureRemult(): Promise<void> {
	if ((globalThis as any).remultApi) return;
	await import('./src/lib/server/api.js');
}
function runInRemultContext<T>(fn: () => Promise<T>): Promise<T> {
	const api = (globalThis as any).remultApi;
	if (api) return api.withRemult(undefined, fn);
	return fn();
}

await ensureRemult();
console.log('--- start ---');

let stored = 0;
await runInRemultContext(async () => {
	const repo = getIndexedRepo() as any;
	const chunks = ['How to write a Python decorator that wraps a function.', 'Decorators take a callable and return a new callable.'];
	for (let i = 0; i < chunks.length; i++) {
		const r = await repo.create({ source: 'python-docs', content: chunks[i], contentType: 'text', scope: 'persistent', sessionId: 'default', chunkIndex: i });
		console.log('created', i, '->', r?.id);
		stored++;
	}
});
console.log('stored:', stored);
