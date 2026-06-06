import { Type } from 'typebox';
import type { AgentTool } from '@earendil-works/pi-agent-core';

// ── Adapter: old Flue-style tool shape → pi-agent-core AgentTool ──
// The execute function return type changed (string → { content, details }).
// This adapter wraps the old shape so tools keep working until rewritten.

export function adaptTool(tool: {
	name: string;
	description: string;
	parameters: ReturnType<typeof Type.Object>;
	execute: (args: unknown) => unknown | Promise<unknown>;
}): AgentTool {
	return {
		name: tool.name,
		label: tool.name,
		description: tool.description,
		parameters: tool.parameters,
		execute: async (_toolCallId, params, _signal, _onUpdate) => {
			const result = await tool.execute(params);
			return { content: [{ type: 'text', text: String(result) }], details: {} };
		}
	};
}

// ── Execute Tool ──────────────────────────────────────────────────
// Sandboxed code execution. Replaces bash, python, curl, grep, etc.

export const ExecuteParams = Type.Object({
	language: Type.Union(
		[
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
		],
		{
			description: 'Language runtime for the code'
		}
	),
	code: Type.String({
		description:
			'Code to execute in the sandbox. Only stdout enters your conversation memory — raw bytes stay in the sandbox.'
	}),
	intent: Type.Optional(
		Type.String({
			description:
				'What you are looking for. When output exceeds ~5KB, it is auto-indexed and only matching sections are returned. Use specific technical terms.'
		})
	),
	timeout: Type.Optional(
		Type.Integer({
			description: 'Execution timeout in seconds'
		})
	)
});

export type ExecuteParams = { language: string; code: string; intent?: string; timeout?: number };

// ── Compress (DCP-style) Tool ─────────────────────────────────────
// Model-driven compression signal: "I completed this task, compress it."

export const ContentBlock = Type.Object({
	startId: Type.String({ description: 'First message ID in the compressed block' }),
	endId: Type.String({ description: 'Last message ID in the compressed block' }),
	summary: Type.String({ description: 'One-sentence summary of what was accomplished' })
});

export const CompressParams = Type.Object({
	topic: Type.String({ description: 'Task or topic being compressed' }),
	content: Type.Array(ContentBlock, {
		description: 'Conversation spans to compress'
	})
});

export type CompressParams = {
	topic: string;
	content: { startId: string; endId: string; summary: string }[];
};

// ── Search Tool ───────────────────────────────────────────────────
// Unified knowledge search across FTS5 + persisted memory.

export const SearchParams = Type.Object({
	queries: Type.Array(Type.String(), {
		description: 'Search terms (AND logic across queries)'
	}),
	scope: Type.Optional(
		Type.Union([Type.Literal('session'), Type.Literal('persistent')], {
			description: 'Search scope — session memory or persistent knowledge'
		})
	),
	source: Type.Optional(
		Type.String({
			description: 'Optional source filter (e.g., "execute:python", "issue-#123")'
		})
	),
	limit: Type.Optional(
		Type.Integer({
			description: 'Max results per query'
		})
	)
});

export type SearchParams = { queries: string[]; scope?: string; source?: string; limit?: number };

// ── Index Tool ────────────────────────────────────────────────────
// Index content into the knowledge store for future search.

export const IndexParams = Type.Object({
	content: Type.Optional(
		Type.String({
			description: 'Text content to index (markdown, code, plain text)'
		})
	),
	path: Type.Optional(
		Type.String({
			description: 'File path or URL to index (alternative to inline content)'
		})
	),
	source: Type.String({
		description: 'Source label for scoping future searches (e.g., "react-docs", "issue-#123")'
	})
});

export type IndexParams = { content?: string; path?: string; source: string };

// ── Handoff Tool ──────────────────────────────────────────────────
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

export type HandoffParams = {
	objective: string;
	priorDecisions: string[];
	currentState: string;
	nextSteps: string[];
};
