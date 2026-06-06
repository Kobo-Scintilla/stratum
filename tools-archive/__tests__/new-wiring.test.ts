// Verifies the new wiring: FTS5 schema installation and handoff logic.
// Run with: cd /root/dev/app && npx tsx src/lib/server/tools/__tests__/new-wiring.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { initFts5 } from '../../fts5.js';
import { buildHandoffArtifact, shouldHandoff, formatHandoffForPrompt } from '../handoff.js';

// ── FTS5 Schema Tests ──────────────────────────────────────────────

describe('FTS5 schema', () => {
	it('chunks_fts table and triggers exist in sqlite_master', () => {
		const db = new Database('./db.sqlite');
		try {
			// Make sure the schema is installed (idempotent if already present).
			initFts5(db);

			const rows = db
				.prepare('SELECT type, name FROM sqlite_master WHERE name IN (?, ?, ?, ?)')
				.all('chunks_fts', 'chunks_fts_ai', 'chunks_fts_ad', 'chunks_fts_au') as Array<{
				type: string;
				name: string;
			}>;

			const byName = new Map(rows.map((r) => [r.name, r.type]));

			assert.equal(byName.get('chunks_fts'), 'table', 'chunks_fts table missing');
			assert.equal(byName.get('chunks_fts_ai'), 'trigger', 'chunks_fts_ai trigger missing');
			assert.equal(byName.get('chunks_fts_ad'), 'trigger', 'chunks_fts_ad trigger missing');
			assert.equal(byName.get('chunks_fts_au'), 'trigger', 'chunks_fts_au trigger missing');
		} finally {
			db.close();
		}
	});
});

// ── Handoff Tests ─────────────────────────────────────────────────

describe('shouldHandoff', () => {
	it('fires at 0.85 context fill ratio', () => {
		assert.equal(shouldHandoff(0.85, false), true);
		assert.equal(shouldHandoff(0.5, false), false);
	});

	it('fires when pendingCompaction is true regardless of fill ratio', () => {
		assert.equal(shouldHandoff(0.1, true), true);
	});
});

describe('buildHandoffArtifact', () => {
	it('produces a valid artifact with all required fields', () => {
		const artifact = buildHandoffArtifact({
			objective: 'Refactor auth layer',
			priorDecisions: ['Use JWT', 'Drop sessions'],
			currentState: 'JWT issuance working, refresh in progress',
			nextSteps: ['Implement refresh', 'Update middleware', 'Add tests']
		});

		assert.equal(artifact.objective, 'Refactor auth layer');
		assert.ok(artifact.timestamp.length > 0, 'timestamp should be non-empty');
		assert.equal(artifact.priorDecisions.length, 2);
		assert.equal(artifact.currentState.status, 'JWT issuance working, refresh in progress');
		assert.equal(artifact.remainingSteps.length, 3);
	});
});

describe('formatHandoffForPrompt', () => {
	it('includes all sections in the rendered prompt', () => {
		const artifact = buildHandoffArtifact({
			objective: 'Migrate to Postgres',
			priorDecisions: ['Use pgx driver', 'Keep SQLite for tests'],
			currentState: 'Schema ported, triggers next',
			nextSteps: ['Port triggers', 'Run migration dry-run', 'Cut over']
		});

		const prompt = formatHandoffForPrompt(artifact);

		assert.ok(prompt.includes('Session Handoff'), 'prompt missing Session Handoff section');
		assert.ok(prompt.includes('Migrate to Postgres'), 'prompt missing objective');
		assert.ok(prompt.includes('Use pgx driver'), 'prompt missing prior decision');
		assert.ok(prompt.includes('Keep SQLite for tests'), 'prompt missing second prior decision');
		assert.ok(prompt.includes('Port triggers'), 'prompt missing remaining step');
		assert.ok(prompt.includes('Run migration dry-run'), 'prompt missing second remaining step');
	});
});
