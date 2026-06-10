import { Entity, Fields } from 'remult';

@Entity('activeStreams', {
	allowApiCrud: true
})
export class ActiveStream {
	@Fields.id()
	id!: string;

	@Fields.string()
	sessionId = 'default';

	@Fields.string()
	prompt = '';

	@Fields.string()
	text = '';

	@Fields.boolean()
	isGenerating = true;

	@Fields.date()
	createdAt = new Date();

	@Fields.json()
	toolCalls: Array<{
		id: string;
		name: string;
		args: unknown;
		result?: unknown;
		isError?: boolean;
	}> = [];

	@Fields.json()
	segments: Array<
		| { type: 'text'; text: string }
		| {
				type: 'tool';
				toolCallId: string;
				toolName: string;
				args: unknown;
				result?: unknown;
				isError?: boolean;
		  }
	> = [];
}
