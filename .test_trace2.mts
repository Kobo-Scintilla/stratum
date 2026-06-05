// Trace find after create
import { getIndexedRepo } from './src/lib/shared/entities/KnowledgeStore.js';
const repo = getIndexedRepo() as any;
const r = await repo.create({ source: 'trace2', content: 'find me', contentType: 'text', scope: 'persistent', sessionId: 'default', chunkIndex: 0 });
console.log('create result id:', r.id);
const f = await repo.find({ where: { content: { $contains: 'find' } } });
console.log('find result:', f);
