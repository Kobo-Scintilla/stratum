import { Type } from '@flue/runtime';

// ── Execute Tool ─────────────────────────────────────────────────────
// Sandboxed code execution. Replaces bash, python, curl, grep, etc.

export const ExecuteParams = Type.Object({
	language: Type.Union([
		Type.Literal('shell'),
		Type.Literal('javascript'),
		Type.Literal('typescript'),
		Type.Literal('python'),
		Type.Literal('ruby'),
		Type.Literal('go'),
		Type.Literal('rust'),
		Type.Literal('php'),
		Type.Literal('perl'),
		Type.Literal('r'),
		Type.Literal('elixir'),
		Type.Literal('csharp')
	], {
		description: 'Language runtime for the code'
	}),
	code: Type.String({
		description: 'Code to execute in the sandbox. Only stdout enters your conversation memory — raw bytes stay in the sandbox.'
	}),
	intent: Type.Optional(Type.String({
		description: 'What you are looking for. When output exceeds ~5KB, it is auto-indexed and only matching sections are returned. Use specific technical terms.'
	})),
	timeout: Type.Optional(Type.Integer({
		minimum: 1,
		maximum: 300,
		default: 30,
		description: 'Execution timeout in seconds'
	}))
});

export type ExecuteParams = { language: string; code: string; intent?: string; timeout?: number };

// ── Compress (DCP-style) Tool ─────────────────────────────────────────
// Model-driven compression signal: "I completed this task, compress it."

export const ContentBlock = Type.Object({
	startId: Type.String({ description: 'Message ID marking the start of the block to compress' }),
	endId: Type.String({ description: 'Message ID marking the end of the block to compress' }),
	summary: Type.String({ description: 'Concise summary of what happened in this block' })
});

export const CompressParams = Type.Object({
	topic: Type.String({
		description: 'What was accomplished (e.g., "root cause analysis", "bug fix applied")'
	}),
	content: Type.Array(ContentBlock, {
		description: 'One or more conversation blocks to compress'
	})
});

export type CompressParams = { topic: string; content: { startId: string; endId: string; summary: string }[] };

// ── Search Tool ───────────────────────────────────────────────────────
// Unified knowledge search across FTS5 + persisted memory.

export const SearchParams = Type.Object({
	queries: Type.Array(Type.String(), {
		minItems: 1,
		maxItems: 8,
		description: '2-4 specific technical terms describing what you need. Batch multiple questions in one call.'
	}),
	scope: Type.Optional(Type.Union([
		Type.Literal('current'),
		Type.Literal('all')
	], {
		default: 'current',
		description: '"current" = this session, "all" = all sessions'
	})),
	source: Type.Optional(Type.String({
		description: 'Filter by source tag (e.g., "docs", "codebase", "decision")'
	})),
	limit: Type.Optional(Type.Integer({
		minimum: 1,
		maximum: 50,
		default: 10,
		description: 'Maximum results per query'
	}))
});

export type SearchParams = { queries: string[]; scope?: string; source?: string; limit?: number };

// ── Index Tool ────────────────────────────────────────────────────────
// Index content into the knowledge store for future search.

export const IndexParams = Type.Object({
	content: Type.Optional(Type.String({
		description: 'Text content to index (markdown, code, plain text)'
	})),
	path: Type.Optional(Type.String({
		description: 'File path or URL to index (alternative to inline content)'
	})),
	source: Type.String({
		description: 'Source label for scoping future searches (e.g., "react-docs", "issue-#123")'
	})
});

export type IndexParams = { content?: string; path?: string; source: string };

// ── Handoff Tool ──────────────────────────────────────────────────────
// Emergency context overflow recovery.

export const HandoffParams = Type.Object({
	objective: Type.String({ description: 'What you were trying to accomplish' }),
	priorDecisions: Type.Array(Type.String(), {
		description: 'Key decisions made so far'
	}),
	currentState: Type.String({ description: 'Current state of the work' }),
	nextSteps: Type.Array(Type.String(), {
		description: 'Remaining steps'
	})
});

export type HandoffParams = { objective: string; priorDecisions: string[]; currentState: string; nextSteps: string[] };
