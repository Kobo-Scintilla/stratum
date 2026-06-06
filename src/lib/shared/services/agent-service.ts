import { BackendMethod, remult } from 'remult';
import { ActiveStream } from '../entities/active-stream';
import { ChatMessage } from '../entities/chat-message';
import { getModel, streamSimple } from '@earendil-works/pi-ai';

function genId(): string {
	return crypto.randomUUID();
}

async function insertUserMessage(sessionId: string, content: string) {
	await remult.repo(ChatMessage).insert({
		id: genId(),
		sessionId,
		role: 'user',
		content,
		sortOrder: Date.now(),
		createdAt: new Date()
	});
}

async function insertActiveStream(sessionId: string, prompt: string): Promise<ActiveStream> {
	return await remult.repo(ActiveStream).insert({
		id: genId(),
		sessionId,
		prompt,
		text: '',
		isGenerating: true,
		createdAt: new Date(),
		toolCalls: []
	});
}

async function updateActiveStream(
	stream: ActiveStream,
	text: string,
	toolCalls: ActiveStream['toolCalls'],
	segments: ActiveStream['segments']
) {
	console.log('[debug updateActiveStream] saving, text len:', text.length, 'segments:', segments.length, 'segments JSON:', JSON.stringify(segments.slice(0, 2)).slice(0, 200));
	await remult.repo(ActiveStream).save({
		...stream,
		text,
		toolCalls: toolCalls.map((t) => ({ ...t })),
		segments
	});
}

async function insertAssistantMessage(
	sessionId: string,
	text: string,
	toolCalls: Array<{ id: string; name: string; args: unknown }>,
	sortOrder: number
) {
	if (!text && toolCalls.length === 0) return;
	await remult.repo(ChatMessage).insert({
		id: genId(),
		sessionId,
		role: 'assistant',
		content: text,
		toolCalls:
			toolCalls.length > 0
				? toolCalls.map((t) => ({ id: t.id, name: t.name, args: t.args }))
				: undefined,
		sortOrder,
		createdAt: new Date(sortOrder)
	});
}

async function insertToolResultMessage(
	sessionId: string,
	tc: { id: string; name: string; result?: unknown; isError?: boolean },
	timestamp: number
) {
	if (tc.result === undefined) return;
	await remult.repo(ChatMessage).insert({
		id: genId(),
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

export class AgentService {
	@BackendMethod({ allowed: true })
	static async ask(prompt: string, sessionId: string = 'default'): Promise<string> {
		await insertUserMessage(sessionId, prompt);
		const activeStream = await insertActiveStream(sessionId, prompt);

		const model = getModel('opencode-go', 'deepseek-v4-flash');

		// ── Load conversation history ──
		const prevMessages = await remult.repo(ChatMessage).find({
			where: { sessionId },
			orderBy: { sortOrder: 'asc' }
		});
		const llmMessages = prevMessages
			.filter((m) => m.role === 'user' || m.role === 'assistant')
			.map((m) => {
				const ts = m.createdAt.getTime();
				if (m.role === 'user') {
					return { role: 'user' as const, content: m.content, timestamp: ts };
				}
				return { role: 'assistant' as const, content: [{ type: 'text' as const, text: m.content }], timestamp: ts };
			}) as import('@earendil-works/pi-ai').Message[];
		llmMessages.push({ role: 'user', content: prompt, timestamp: Date.now() });

		let accumulatedText = '';
		let turnAccumulatedText = '';
		let lastWasTool = false;
		let toolCalls: Array<{
			id: string; name: string; args: unknown; result?: unknown; isError?: boolean;
		}> = [];
		let turnToolCalls: typeof toolCalls = [];
		let segments: ActiveStream['segments'] = [];

		try {
			const eventStream = streamSimple(model, {
				systemPrompt: '',
				messages: llmMessages
			});

			for await (const event of eventStream) {
				switch (event.type) {
					case 'text_delta': {
						const t = event.delta;
						if (!t) break;
						accumulatedText += t;
						turnAccumulatedText += t;
						if (lastWasTool || segments.length === 0) {
							segments.push({ type: 'text', text: t });
							lastWasTool = false;
						} else {
							const last = segments[segments.length - 1];
							if (last.type === 'text') last.text += t;
						}
						await updateActiveStream(activeStream, accumulatedText, toolCalls, segments);
						break;
					}

					case 'toolcall_start': {
						const idx = (event as { contentIndex: number }).contentIndex;
						const block = (event as Record<string, unknown>).partial as {
							content: Array<{ type: string; id?: string; name?: string }>;
						};
						const tcBlock = block?.content?.[idx];
						const tcId = tcBlock?.id ?? 'unknown';
						const tcName = tcBlock?.name ?? 'unknown';
						if (!toolCalls.find((t) => t.id === tcId)) {
							toolCalls.push({ id: tcId, name: tcName, args: {}, result: undefined, isError: false });
							turnToolCalls.push({ id: tcId, name: tcName, args: {} });
							segments.push({
								type: 'tool', toolCallId: tcId, toolName: tcName, args: {}, result: undefined, isError: false
							});
							lastWasTool = true;
							await updateActiveStream(activeStream, accumulatedText, toolCalls, segments);
						}
						break;
					}
					case 'toolcall_end': {
						const tc = event.toolCall as {
							id: string; name: string; arguments: Record<string, unknown>;
						};
						const existing = toolCalls.find((t) => t.id === tc.id);
						if (existing) {
							existing.args = tc.arguments;
						} else {
							toolCalls.push({
								id: tc.id, name: tc.name, args: tc.arguments, result: undefined, isError: false
							});
							segments.push({
								type: 'tool', toolCallId: tc.id, toolName: tc.name,
								args: tc.arguments, result: undefined, isError: false
							});
						}
						const seg = segments.find((s) => s.type === 'tool' && s.toolCallId === tc.id);
						if (seg && seg.type === 'tool') {
							seg.args = tc.arguments;
						}
						await updateActiveStream(activeStream, accumulatedText, toolCalls, segments);
						break;
					}

					case 'done': {
						if (turnAccumulatedText || turnToolCalls.length > 0) {
							await insertAssistantMessage(sessionId, turnAccumulatedText, turnToolCalls, Date.now());
							turnAccumulatedText = '';
							turnToolCalls = [];
						}
						accumulatedText = '';
						toolCalls = [];
						segments = [];
						await updateActiveStream(activeStream, '', [], []);
						break;
					}

					case 'error': {
						console.error('[ask] stream error:', event.error);
						break;
					}
				}
			}

			// After stream completes, ensure any remaining turn is saved
			if (turnAccumulatedText || turnToolCalls.length > 0) {
				await insertAssistantMessage(sessionId, turnAccumulatedText, turnToolCalls, Date.now());
			}
		} catch (err) {
			console.error('[ask] Agent stream error:', err);
		} finally {
			// Delay deletion so frontend liveQuery receives ChatMessage before stream disappears
			const sid = activeStream.id;
			setTimeout(() => {
				globalThis.remultApi?.withRemult(undefined, async () => {
					await remult.repo(ActiveStream).delete(sid);
				}).catch(() => {});
			}, 800);
		}

		return activeStream.id;
	}

	@BackendMethod({ allowed: true })
	static async clearHistory() {
		await remult.repo(ActiveStream).deleteMany({ where: 'all' });
		await remult.repo(ChatMessage).deleteMany({ where: 'all' });
	}

	@BackendMethod({ allowed: true, transactional: false })
	static async recoverMessages(sessionId: string): Promise<number> {
		return await remult.repo(ChatMessage).count({ sessionId });
	}

	@BackendMethod({ allowed: true })
	static async listSessions() {
		const msgs = await remult.repo(ChatMessage).find({
			orderBy: { sessionId: 'asc', sortOrder: 'asc' }
		});
		const seen = new Map<string, { createdAt: Date; content: string }>();
		for (const m of msgs) {
			if (!seen.has(m.sessionId))
				seen.set(m.sessionId, { createdAt: m.createdAt, content: m.content.slice(0, 120) });
		}
		return [...seen.entries()]
			.map(([k, v]) => ({ sessionId: k, createdAt: v.createdAt.toISOString(), preview: v.content }))
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	}
}
