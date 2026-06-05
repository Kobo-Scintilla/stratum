// Verify DB direct write
import Database from 'better-sqlite3';
const db = new Database('./db.sqlite');
console.log('tables before:', db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='indexedContent'").all());
console.log('rows before:', db.prepare('SELECT count(*) c FROM indexedContent').get());
const r = db.prepare("INSERT INTO indexedContent (id, source, content, contentType, scope, sessionId, chunkIndex, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run('test-id-1', 'src', 'content', 'text', 'persistent', 'default', 0, new Date().toISOString());
console.log('insert result:', r);
console.log('rows after:', db.prepare('SELECT count(*) c FROM indexedContent').get());
