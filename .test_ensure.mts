// Test with ensureRemult pattern
import { indexTool } from './src/lib/server/tools/search.js';
import { searchTool } from './src/lib/server/tools/search.js';

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
const r1 = await runInRemultContext(() => indexTool.execute({ content: 'How to write a Python decorator that wraps a function.\n\nDecorators take a callable and return a new callable.', source: 'python-docs' }));
console.log('=== INDEX ===');
console.log(r1);
const r2 = await runInRemultContext(() => searchTool.execute({ queries: ['decorator'] }));
console.log('=== SEARCH ===');
console.log(r2);
