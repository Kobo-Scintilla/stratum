import { Entity, Fields } from 'remult';

@Entity('activeStreams', {
	allowApiCrud: true
})
export class ActiveStream {
	@Fields.id()
	id!: string;

	@Fields.string()
	prompt = '';

	@Fields.string()
	text = '';

	@Fields.boolean()
	isGenerating = true;

	@Fields.date()
	createdAt = new Date();

	@Fields.json()
	toolCalls: Array<{ id: string; name: string; args: unknown; result?: unknown; isError?: boolean }> = [];
}
