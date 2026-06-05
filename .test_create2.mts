// Look at what happens after create
const api = await import('./src/lib/server/api.js');
import Database from 'better-sqlite3';
const db = new Database('./db.sqlite');

await (globalThis as any).remultApi.withRemult(undefined, async () => {
  const { getIndexedRepo } = await import('./src/lib/shared/entities/KnowledgeStore.js');
  const repo = getIndexedRepo() as any;
  const created = await repo.create({ source: 'create-test', content: 'hello world content', contentType: 'text', scope: 'persistent', sessionId: 'default', chunkIndex: 0 });
  console.log('created id:', created?.id);
  console.log('After create, count via SqlDatabase:', db.prepare('SELECT count(*) c FROM indexedContent').get());
});
console.log('After withRemult block, count:', db.prepare('SELECT count(*) c FROM indexedContent').get());
