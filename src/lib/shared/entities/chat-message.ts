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
	toolCalls?: ToolCallInfo[];

	@Fields.string()
	toolCallId?: string;

	@Fields.string()
	toolName?: string;

	@Fields.object()
	toolResult?: unknown;

	@Fields.boolean()
	isError = false;

	@Fields.integer()
	sortOrder = 0;

	@Fields.date()
	createdAt = new Date();
}
