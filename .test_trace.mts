// Trace what happens with indexTool without explicit remult setup
import { getIndexedRepo } from './src/lib/shared/entities/KnowledgeStore.js';
console.log('repo:', typeof getIndexedRepo);
try {
  const repo = getIndexedRepo();
  console.log('repo ok, has create:', typeof (repo as any).create);
  const r = await (repo as any).create({ source: 'trace', content: 'trace content here', contentType: 'text', scope: 'persistent', sessionId: 'default', chunkIndex: 0 });
  console.log('create result:', r);
} catch (e) {
  console.log('error:', (e as Error).message);
}
