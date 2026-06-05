import { searchTool } from './src/lib/server/tools/search.js';
const r = await searchTool.execute({ queries: ['nonexistent'] });
console.log(r);
