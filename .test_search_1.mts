import { indexTool } from './src/lib/server/tools/search.js';
import { searchTool } from './src/lib/server/tools/search.js';
await indexTool.execute({ content: 'How to write a Python decorator that wraps a function.\n\nDecorators take a callable and return a new callable.', source: 'python-docs' });
const r = await searchTool.execute({ queries: ['decorator'] });
console.log(r);
