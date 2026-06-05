import type Database from 'better-sqlite3';

export interface FtsHit {
	rowid: number;
	id: string;
	content: string;
	source: string;
	contentType: string;
	scope: string;
	sessionId: string;
	score: number;
}

const TRIGGER_AI = 'chunks_fts_ai';
const TRIGGER_AD = 'chunks_fts_ad';
const TRIGGER_AU = 'chunks_fts_au';
const TARGET_TABLE = 'indexedContent';
const TARGET_PATTERN = /(?:^|\s)CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?)indexedContent(?:`?)/i;

function triggerExists(db: Database.Database, name: string): boolean {
	const row = db
		.prepare("SELECT 1 AS x FROM sqlite_master WHERE type = 'trigger' AND name = ?")
		.get(name) as { x: number } | undefined;
	return row !== undefined;
}

function tableExists(db: Database.Database, name: string): boolean {
	const row = db
		.prepare("SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = ?")
		.get(name) as { x: number } | undefined;
	return row !== undefined;
}

function installTriggers(db: Database.Database): void {
	if (!triggerExists(db, TRIGGER_AI)) {
		db.exec(`
			CREATE TRIGGER ${TRIGGER_AI} AFTER INSERT ON ${TARGET_TABLE} BEGIN
				INSERT INTO chunks_fts(rowid, content, source, contentType, scope, sessionId)
				VALUES (new.rowid, new.content, new.source, new.contentType, new.scope, new.sessionId);
			END;
		`);
	}
	if (!triggerExists(db, TRIGGER_AD)) {
		db.exec(`
			CREATE TRIGGER ${TRIGGER_AD} AFTER DELETE ON ${TARGET_TABLE} BEGIN
				DELETE FROM chunks_fts WHERE rowid = old.rowid;
			END;
		`);
	}
	if (!triggerExists(db, TRIGGER_AU)) {
		db.exec(`
			CREATE TRIGGER ${TRIGGER_AU} AFTER UPDATE ON ${TARGET_TABLE} BEGIN
				DELETE FROM chunks_fts WHERE rowid = old.rowid;
				INSERT INTO chunks_fts(rowid, content, source, contentType, scope, sessionId)
				VALUES (new.rowid, new.content, new.source, new.contentType, new.scope, new.sessionId);
			END;
		`);
	}
}

/**
 * Creates the chunks_fts virtual table and arranges for the INSERT/UPDATE/
 * DELETE triggers to be installed as soon as Remult's `indexedContent` table
 * exists. The trigger DDL references the target table by name, so it must run
 * AFTER the table is created — we patch `db.prepare` once to install the
 * triggers the first time we see a `CREATE TABLE indexedContent` statement
 * reach `run()` (or, if the table already exists, immediately). Idempotent:
 * every statement is guarded with IF NOT EXISTS or an existence check.
 */
export function initFts5(db: Database.Database): void {
	db.exec(`
		CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
			content,
			source,
			contentType,
			scope,
			sessionId,
			tokenize = 'porter unicode61'
		);
	`);

	if (
		triggerExists(db, TRIGGER_AI) &&
		triggerExists(db, TRIGGER_AD) &&
		triggerExists(db, TRIGGER_AU)
	) {
		return;
	}

	if (tableExists(db, TARGET_TABLE)) {
		installTriggers(db);
		return;
	}

	// Table will be created later (Remult is lazy and uses `db.prepare` +
	// statement.run, not `db.exec`, for DDL). Wrap `prepare` once so the
	// CREATE TABLE statement is intercepted; the moment its `run` completes,
	// install the triggers and unwrap.
	type RunFn = (...params: unknown[]) => unknown;
	type Statement = { run: RunFn } & Record<string, unknown>;
	type PrepareFn = (sql: string, ...rest: unknown[]) => Statement;
	const originalPrepare = db.prepare.bind(db) as unknown as PrepareFn;
	let armed = true;
	(db as unknown as { prepare: PrepareFn }).prepare = ((
		sql: string,
		...rest: unknown[]
	) => {
		const stmt = originalPrepare(sql, ...(rest as [])) as Statement;
		const matchesCreate =
			typeof sql === 'string' && TARGET_PATTERN.test(sql);
		if (!matchesCreate || !armed) return stmt;
		const originalRun = stmt.run.bind(stmt) as RunFn;
		stmt.run = ((...params: unknown[]) => {
			const out = originalRun(...params);
			if (!armed) return out;
			armed = false;
			(db as unknown as { prepare: PrepareFn }).prepare = originalPrepare;
			if (tableExists(db, TARGET_TABLE)) installTriggers(db);
			return out;
		}) as RunFn;
		return stmt;
	}) as PrepareFn;
}

/**
 * Runs an FTS5 MATCH query against chunks_fts, joined with indexedContent so
 * callers get the canonical row id (Remult string id) back, not the SQLite
 * rowid. Ranked with bm25(); lower scores are better.
 */
export function searchFts5(
	db: Database.Database,
	query: string,
	limit = 20
): FtsHit[] {
	const trimmed = query.trim();
	if (!trimmed) return [];

	// FTS5 MATCH interprets the query string. Escape any double quotes the
	// caller embedded, then wrap in quotes for a literal phrase-free query.
	const safe = trimmed.replace(/"/g, '""');
	const rows = db
		.prepare(
			`SELECT
				c.rowid AS rowid,
				i.id AS id,
				c.content AS content,
				c.source AS source,
				c.contentType AS contentType,
				c.scope AS scope,
				c.sessionId AS sessionId,
				bm25(chunks_fts) AS score
			FROM chunks_fts AS c
			JOIN indexedContent AS i ON i.rowid = c.rowid
			WHERE chunks_fts MATCH ?
			ORDER BY score
			LIMIT ?`
		)
		.all(`"${safe}"`, limit) as FtsHit[];

	return rows;
}
