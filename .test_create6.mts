// Bootstrap via api, then write directly
await import('./src/lib/server/api.js');
import Database from 'better-sqlite3';
const db = new Database('./db.sqlite');
console.log('tables:', db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='indexedContent'").all());
db.prepare("INSERT INTO indexedContent (id, source, content, contentType, scope, sessionId, chunkIndex, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run('db-test-1', 'src', 'content-here', 'text', 'persistent', 'default', 0, new Date().toISOString());
console.log('rows:', db.prepare('SELECT count(*) c FROM indexedContent').get());
console.log('chunks_fts:', db.prepare('SELECT count(*) c FROM chunks_fts').get());
console.log('triggers:', db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all());
