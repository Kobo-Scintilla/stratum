// Test the full chain with explicit logging
import { withRemult } from 'remult';
import { getIndexedRepo, IndexedContent } from './src/lib/shared/entities/KnowledgeStore.js';
import './src/lib/server/api.js';

const api = (globalThis as any).remultApi;
console.log('api:', !!api, 'has withRemult:', !!api?.withRemult);

const r = await api.withRemult(undefined, async () => {
  console.log('inside withRemult, remultApi has dataProvider:', !!(globalThis as any).remultApi?.dataProvider);
  const repo = getIndexedRepo() as any;
  console.log('repo constructor:', repo?.constructor?.name);
  const created = await repo.create({ source: 'full-test', content: 'hello world content', contentType: 'text', scope: 'persistent', sessionId: 'default', chunkIndex: 0 });
  console.log('created:', created);
  return created;
});
console.log('outer result:', r);
console.log('outer keys:', Object.keys(r || {}));
