import { indexTool } from './src/lib/server/tools/search.js';
import { searchTool } from './src/lib/server/tools/search.js';
const r1 = await indexTool.execute({ content: 'How to write a Python decorator that wraps a function.\n\nDecorators take a callable and return a new callable.', source: 'python-docs' });
console.log('=== INDEX ===');
console.log(r1);
const r2 = await searchTool.execute({ queries: ['decorator'] });
console.log('=== SEARCH ===');
console.log(r2);
