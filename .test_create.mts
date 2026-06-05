// Minimal test: import api, run withRemult, create directly
const api = await import('./src/lib/server/api.js');
console.log('remultApi set?', !!(globalThis as any).remultApi);

const r = await (globalThis as any).remultApi.withRemult(undefined, async () => {
  const { getIndexedRepo } = await import('./src/lib/shared/entities/KnowledgeStore.js');
  const repo = getIndexedRepo() as any;
  console.log('repo:', !!repo);
  const created = await repo.create({ source: 'create-test', content: 'hello world content', contentType: 'text', scope: 'persistent', sessionId: 'default', chunkIndex: 0 });
  console.log('created id:', created?.id);
  return created;
});
console.log('result id:', r?.id);
