import type { ActiveStream } from './entities/active-stream';
import type { ChatMessage } from './entities/chat-message';

// ── Agent Event Types ──────────────────────────────────────────

export type AgentEvent =
	| { type: 'text_delta'; text: string }
	| { type: 'tool_start'; toolName: string; toolCallId: string; args?: unknown }
	| { type: 'tool_call'; toolName: string; toolCallId: string; args?: unknown }
	| {
			type: 'tool_execution_start';
			toolCallId: string;
			toolName: string;
			args: unknown;
	  }
	| {
			type: 'tool_execution_end';
			toolCallId: string;
			toolName: string;
			result: unknown;
			isError: boolean;
	  }
	| { type: 'turn_request'; model: string; provider: string; input: { messages: unknown[]; tools?: unknown[] } }
	| { type: 'turn_end'; message: unknown; toolResults: unknown[] }
	| { type: 'error'; error: unknown };

