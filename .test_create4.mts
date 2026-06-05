// Verify remult is using the same db instance via direct SqlDatabase
import Database from 'better-sqlite3';
import { SqlDatabase } from 'remult';
import { BetterSqlite3DataProvider } from 'remult/remult-better-sqlite3';
const db = new Database('./db.sqlite');
const dp = new SqlDatabase(new BetterSqlite3DataProvider(db));

// Direct insert via the same SqlDatabase
const r = await dp.createCommand().execute({
  sql: "INSERT INTO indexedContent (id, source, content, contentType, scope, sessionId, chunkIndex, createdAt) VALUES ('db-test', 'src', 'content', 'text', 'persistent', 'default', 0, '2026-01-01')",
});
console.log('insert result:', r);
console.log('rows:', db.prepare('SELECT count(*) c FROM indexedContent').get());
