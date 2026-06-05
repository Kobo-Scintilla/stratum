import Database from 'better-sqlite3';
const db = new Database('./db.sqlite');
db.prepare("INSERT INTO indexedContent (id, source, content, contentType, scope, sessionId, chunkIndex, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run('db-test-1', 'src', 'content', 'text', 'persistent', 'default', 0, new Date().toISOString());
console.log('rows:', db.prepare('SELECT count(*) c FROM indexedContent').get());
console.log('chunks_fts:', db.prepare('SELECT count(*) c FROM chunks_fts').get());
console.log('triggers:', db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all());
