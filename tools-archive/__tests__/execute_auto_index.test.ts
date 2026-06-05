// Auto-index verification for the execute tool.
// Mirrors the task's `npx tsx -e "..."` snippets but written as a
// standalone .ts file so it goes through tsx's ESM loader (eval-mode
// can't resolve ESM-only @flue/runtime). Run with:
//   npx tsx src/lib/server/tools/__tests__/execute_auto_index.test.ts
import { executeTool } from '../execute.js';
import Database from 'better-sqlite3';
import { join } from 'node:path';

const DB_PATH = join(process.cwd(), 'db.sqlite');

function freshDb(): void {
	// Clear the data, don't unlink the file: api.ts and execute.ts both hold
	// open connections to ./db.sqlite. Deleting the inode while they are
	// attached leaves them pointing at a phantom handle (SQLITE_READONLY_DBMOVED
	// on the next write). Truncating rows is what the tests actually want.
	const db = new Database(DB_PATH);
	try {
		db.exec('DELETE FROM indexedContent; DELETE FROM compressedArtifact; DELETE FROM sessionEvent;');
	} catch {
		// Tables don't exist yet on the very first run before api.ts has
		// been loaded. That's fine — execute() will create them.
	}
	db.close();
}

function countRows(db: Database.Database): number {
	try {
		return (db.prepare('SELECT COUNT(*) AS n FROM indexedContent').get() as { n: number }).n;
	} catch {
		// Table doesn't exist yet — first run after freshDb().
		return 0;
	}
}

async function largeOutput() {
	freshDb();
	const r = await executeTool.execute({
		language: 'shell',
		code: 'for i in $(seq 1 5000); do echo "line $i with some words for indexing"; done'
	});
	console.log('result (truncated):', r.slice(0, 400));
	// Open the db handle AFTER execute so it sees the schema/rows created by
	// the api module that executeTool lazy-loads via ensureRemult.
	const db = new Database(DB_PATH);
	const after = countRows(db);
	console.log('rows after:', after);
	if (after <= 0) {
		console.error('FAIL: rows after should be > 0');
		process.exit(1);
	}
	if (!/auto-?indexed/i.test(r) && !/exceeds 100KB/i.test(r)) {
		console.error('FAIL: result should mention auto-indexing');
		process.exit(1);
	}
	console.log('PASS: large output auto-indexed');
}

async function smallOutput() {
	const r = await executeTool.execute({ language: 'shell', code: 'echo hello; echo world' });
	console.log('result:', JSON.stringify(r));
	if (!r.includes('hello') || !r.includes('world')) {
		console.error('FAIL: small output should be inline');
		process.exit(1);
	}
	if (/auto-?indexed/i.test(r) || /exceeds 100KB/i.test(r)) {
		console.error('FAIL: small output should not mention auto-indexing');
		process.exit(1);
	}
	console.log('PASS: small output inline');
}

async function intentPreviews() {
	freshDb();
	const r = await executeTool.execute({
		language: 'shell',
		code: [
			'echo "kernel panic in subsystem gpu"',
			'sleep 0.01',
			'echo "out of memory in kernel"',
			'sleep 0.01',
			'echo "scheduling latency spike"',
			'sleep 0.01',
			'echo "disk io timeout on sda1"'
		].join('\n'),
		intent: 'kernel error'
	});
	console.log('intent result (truncated):', r.slice(0, 500));
	const db = new Database(DB_PATH);
	const after = countRows(db);
	console.log('rows after intent:', after);
	if (after <= 0) {
		console.error('FAIL: intent run should still index');
		process.exit(1);
	}
	if (!/Auto-indexed/i.test(r)) {
		console.error('FAIL: result should show intent-aware previews');
		process.exit(1);
	}
	console.log('PASS: intent previews');
}

(async () => {
	await largeOutput();
	await smallOutput();
	await intentPreviews();
	console.log('ALL PASS');
})().catch((e) => {
	console.error('UNCAUGHT', e);
	process.exit(1);
});
