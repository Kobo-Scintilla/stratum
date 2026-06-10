import { remult } from 'remult';
import { ChatMessage } from '@opaius/shared/entities/chat-message.js';

export async function load({ params }) {
	const sessionId = params.sessionId;
	if (!sessionId) return { messages: [] };

	// Fetch latest 50 messages descending
	const messages = await remult.repo(ChatMessage).find({
		where: { sessionId },
		orderBy: { sortOrder: 'desc' },
		limit: 50
	});

	// Reverse to ascending for chronological serialization
	return {
		messages: [...messages].reverse().map((m) => ({
			id: m.id,
			sessionId: m.sessionId,
			role: m.role,
			content: m.content,
			toolCalls: m.toolCalls,
			toolCallId: m.toolCallId,
			toolName: m.toolName,
			toolResult: m.toolResult,
			isError: m.isError,
			sortOrder: m.sortOrder,
			createdAt: m.createdAt.toISOString()
		}))
	};
}
