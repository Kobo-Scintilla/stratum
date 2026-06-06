// Debug version 3
import { executeTool } from '../execute.js';
import Database from 'better-sqlite3';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const DB_PATH = join(process.cwd(), 'db.sqlite');
rmSync(DB_PATH, { force: true });
rmSync(DB_PATH + '-wal', { force: true });
rmSync(DB_PATH + '-shm', { force: true });

(async () => {
	// Open the db handle AFTER execute so it sees the schema/rows created by
	// the api module that executeTool lazy-loads via ensureRemult.
	const r = await executeTool.execute({
		language: 'shell',
		code: 'for i in $(seq 1 500); do echo "line $i with some words"; done'
	});
	console.log('result (truncated):', r.slice(0, 400));
	const db = new Database(DB_PATH);
	const rows = db.prepare('SELECT * FROM indexedContent').all();
	console.log('rows:', rows);
	const ftsRows = db
		.prepare("SELECT rowid, source, content FROM chunks_fts WHERE source LIKE 'execute:%'")
		.all();
	console.log('fts rows:', ftsRows);
})().catch((e) => {
	console.error('UNCAUGHT', e);
});
