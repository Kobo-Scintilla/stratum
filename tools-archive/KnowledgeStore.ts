import { Entity, Fields, remult } from 'remult';

// ── Indexed Content ────────────────────────────────────────────────
// Stores chunks of indexed content for unified search.
// Populated via the index() tool and the auto-indexing of large outputs.

@Entity('indexedContent', { allowApiCrud: true })
export class IndexedContent {
	@Fields.id()
	id!: string;

	@Fields.string()
	source = '';

	@Fields.string()
	content = '';

	@Fields.string()
	contentType: 'markdown' | 'code' | 'json' | 'text' | 'decision' | 'error' = 'text';

	@Fields.string()
	scope: 'session' | 'persistent' = 'session';

	@Fields.string()
	sessionId = '';

	@Fields.integer()
	chunkIndex = 0;

	@Fields.date()
	createdAt = new Date();
}

// ── Compressed Artifact ─────────────────────────────────────────────
// Stores DCP-style compressed conversation spans.
// Created when the model calls compress() for task completion.

@Entity('compressedArtifact', { allowApiCrud: true })
export class CompressedArtifact {
	@Fields.id()
	id!: string;

	@Fields.string()
	topic = '';

	@Fields.integer()
	blockCount = 0;

	@Fields.integer()
	tokensSaved = 0;

	@Fields.json()
	blocks: Array<{ startId: string; endId: string; summary: string }> = [];

	@Fields.string()
	sessionId = '';

	@Fields.date()
	createdAt = new Date();
}

// ── Session Event ───────────────────────────────────────────────────
// Tracks key events across sessions for continuity.
// Used for cross-session search and handoff recovery.

@Entity('sessionEvent', { allowApiCrud: true })
export class SessionEvent {
	@Fields.id()
	id!: string;

	@Fields.string()
	sessionId = '';

	@Fields.string()
	eventType: 'decision' | 'blocker' | 'error' | 'completion' | 'insight' | 'handoff' = 'insight';

	@Fields.string()
	summary = '';

	@Fields.string()
	detail = '';

	@Fields.string()
	relatedTool = '';

	@Fields.date()
	createdAt = new Date();
}

// ── Repository Helpers ──────────────────────────────────────────────
// Type-safe access patterns for the knowledge store.

export function getIndexedRepo() {
	return remult.repo(IndexedContent);
}

export function getCompressedRepo() {
	return remult.repo(CompressedArtifact);
}

export function getSessionEventRepo() {
	return remult.repo(SessionEvent);
}
