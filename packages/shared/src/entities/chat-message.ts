import { Entity, Fields } from 'remult';

export interface ToolCallInfo {
	id: string;
	name: string;
	args: unknown;
	result?: unknown;
	isError?: boolean;
}

@Entity('chatMessages', {
	allowApiCrud: true
})
export class ChatMessage {
	@Fields.id()
	id!: string;

	@Fields.string()
	sessionId = 'default';

	@Fields.string()
	role: 'user' | 'assistant' | 'tool' = 'user';

	@Fields.string()
	content = '';

	@Fields.object()
	toolCalls?: ToolCallInfo[] = undefined;

	@Fields.string()
	toolCallId?: string = undefined;

	@Fields.string()
	toolName?: string = undefined;

	@Fields.object()
	toolResult?: unknown = undefined;

	@Fields.boolean()
	isError = false;

	@Fields.integer()
	sortOrder = 0;

	@Fields.date()
	createdAt = new Date();

	@Fields.integer()
	inputTokens = 0;

	@Fields.integer()
	outputTokens = 0;

	@Fields.integer()
	cacheReadTokens = 0;

	@Fields.integer()
	cacheWriteTokens = 0;

	@Fields.integer()
	contextMessages = 0;
}
