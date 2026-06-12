import { remult } from 'remult';
import { ChatMessage } from '@stratum/shared/entities/chat-message.js';
import { ChatSessionSettings } from '@stratum/shared/entities/chat-session-settings.js';

export async function load({ params, fetch }) {
	remult.apiClient.httpClient = fetch;
	const sessionId = params.sessionId;
	if (!sessionId) return { messages: [], settings: null };

	const [messages, settings] = await Promise.all([
		remult.repo(ChatMessage).find({
			where: { sessionId },
			orderBy: { sortOrder: 'desc' },
			limit: 50
		}),
		remult
			.repo(ChatSessionSettings)
			.findId(sessionId)
			.catch(() => null)
	]);

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
			createdAt: m.createdAt.toISOString(),
			inputTokens: m.inputTokens,
			outputTokens: m.outputTokens,
			cacheReadTokens: m.cacheReadTokens,
			cacheWriteTokens: m.cacheWriteTokens,
			contextMessages: m.contextMessages,
			usageCost: m.usageCost,
			headroomTokensSaved: m.headroomTokensSaved,
			headroomRatio: m.headroomRatio
		})),
		settings: settings
			? {
					id: settings.id,
					modelProvider: settings.modelProvider,
					modelId: settings.modelId,
					contextWindow: settings.contextWindow,
					thinkingLevel: settings.thinkingLevel,
					headroomEnabled: settings.headroomEnabled
				}
			: null
	};
}
