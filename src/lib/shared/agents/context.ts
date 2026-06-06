import { remult } from 'remult';
import { ChatMessage } from '../entities/chat-message';
import type { Context, Message } from './types';
import type { AgentConfig } from './types';
import { toolRegistry } from './tools';

export async function buildContext(
	sessionId: string,
	config: AgentConfig,
	prompt: string
): Promise<Context> {
	const prevMessages = await remult.repo(ChatMessage).find({
		where: { sessionId },
		orderBy: { sortOrder: 'asc' }
	});

	const messages: Message[] = prevMessages
		.filter((m) => m.role === 'user' || m.role === 'assistant')
		.map((m) => {
			const ts = m.createdAt.getTime();
			if (m.role === 'user') {
				return { role: 'user' as const, content: m.content, timestamp: ts };
			}
			return {
				role: 'assistant' as const,
				content: [{ type: 'text' as const, text: m.content }],
				timestamp: ts
			};
		}) as Message[];

	messages.push({ role: 'user', content: prompt, timestamp: Date.now() });

	const allTools = toolRegistry.getPiAiTools();
	const toolNamesSet = new Set(config.toolNames);
	const tools = allTools.filter((t) => toolNamesSet.has(t.name));

	return {
		systemPrompt: config.systemPrompt ?? '',
		messages,
		tools
	};
}

export async function persistToolResult(
	sessionId: string,
	tc: { id: string; name: string; result?: unknown; isError?: boolean },
	timestamp: number
): Promise<void> {
	if (tc.result === undefined) return;
	await remult.repo(ChatMessage).insert({
		id: crypto.randomUUID(),
		sessionId,
		role: 'tool',
		content: typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result),
		toolCallId: tc.id,
		toolName: tc.name,
		isError: tc.isError ?? false,
		sortOrder: timestamp,
		createdAt: new Date(timestamp)
	});
}
