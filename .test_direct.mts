// Direct test: withRemult + create
import { initApi } from 'remult';
import { remult } from 'remult';
import { SqlDatabase } from 'remult';
import { BetterSqlite3DataProvider } from 'remult/remult-better-sqlite3';
import Database from 'better-sqlite3';
import { initFts5 } from './src/lib/server/fts5.js';
import { IndexedContent, getIndexedRepo } from './src/lib/shared/entities/KnowledgeStore.js';

const db = new Database('./db-test.sqlite');
initFts5(db);
const dp = new SqlDatabase(new BetterSqlite3DataProvider(db));

await initApi({ entities: [IndexedContent], dataProvider: dp, ensureSchema: true });
console.log('After initApi');

const remultInst = new remult.constructor(dp);
// Use the withRemult helper
import { withRemult } from 'remult';
const r = await withRemult(async (r) => {
  const repo = r.repo(IndexedContent);
  const created = await repo.create({ source: 'direct', content: 'findable content here', contentType: 'text', scope: 'persistent', sessionId: 'default', chunkIndex: 0 });
  console.log('created:', created);
  const found = await repo.find({ where: { content: { $contains: 'find' } } });
  console.log('found count:', found.length);
  return created;
}, { dataProvider: dp });
console.log('done', r);
