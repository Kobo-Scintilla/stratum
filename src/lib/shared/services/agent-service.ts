import { BackendMethod, remult } from 'remult';
import { ActiveStream } from '../entities/active-stream';
import { ChatMessage } from '../entities/chat-message';
import { getModel, streamSimple, Type } from '@earendil-works/pi-ai';
import type { Tool, Message, Context } from '@earendil-works/pi-ai';

function genId(): string {
	return crypto.randomUUID();
}

/** Run code in its own Remult context so changes commit immediately
 *  and are visible to the liveQuery publisher (which runs outside our
 *  BackendMethod's transaction). */
async function withOwnContext<T>(fn: () => Promise<T>): Promise<T> {
	if (globalThis.remultApi) {
		return await (globalThis.remultApi.withRemult as (ctx: undefined, fn: () => Promise<T>) => Promise<T>)(undefined, fn);
	}
	return await fn();
}

async function insertUserMessage(sessionId: string, content: string) {
	await withOwnContext(async () => {
		await remult.repo(ChatMessage).insert({
			id: genId(),
			sessionId,
			role: 'user',
			content,
			sortOrder: Date.now(),
			createdAt: new Date()
		});
	});
}

async function insertActiveStream(sessionId: string, prompt: string): Promise<ActiveStream> {
	return await withOwnContext(async () => {
		return await remult.repo(ActiveStream).insert({
			id: genId(),
			sessionId,
			prompt,
			text: '',
			isGenerating: true,
			createdAt: new Date(),
			toolCalls: []
		});
	});
}
async function updateActiveStream(
	stream: ActiveStream,
	text: string,
	toolCalls: ActiveStream['toolCalls'],
	segments: ActiveStream['segments']
) {
	console.log('[debug updateActiveStream] saving, text len:', text.length, 'segments:', segments.length, 'segments JSON:', JSON.stringify(segments.slice(0, 2)).slice(0, 200));
	await withOwnContext(async () => {
		await remult.repo(ActiveStream).save({
			...stream,
			text,
			toolCalls: toolCalls.map((t) => ({ ...t })),
			segments
		});
	});
}

async function insertAssistantMessage(
	sessionId: string,
	text: string,
	toolCalls: Array<{ id: string; name: string; args: unknown }>,
	sortOrder: number
) {
	await withOwnContext(async () => {
		await remult.repo(ChatMessage).insert({
			id: genId(),
			sessionId,
			role: 'assistant',
			content: text,
			toolCalls: toolCalls.length > 0 ? toolCalls.map((t) => ({ id: t.id, name: t.name, args: t.args })) : undefined,
			sortOrder,
			createdAt: new Date(sortOrder)
		});
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

// ── Tool definitions ──
const tools: Tool[] = [
	{
		name: 'get_time',
		description: 'Get the current date and time in a specific timezone',
		parameters: Type.Object({
			timezone: Type.Optional(Type.String({ description: 'IANA timezone (e.g., America/New_York, Europe/London, Asia/Tokyo). Defaults to UTC.' }))
		})
	}
];

/** Execute a tool call and return the result text. */
async function executeToolCall(
	name: string,
	args: Record<string, unknown>
): Promise<{ result: string; isError: boolean }> {
	if (name === 'get_time') {
		const tz = (args.timezone as string) || 'UTC';
		try {
			const now = new Date();
			return { result: now.toLocaleString('en-US', { timeZone: tz, dateStyle: 'full', timeStyle: 'long' }), isError: false };
		} catch {
			return { result: `Invalid timezone: ${tz}`, isError: true };
		}
	}
	return { result: `Unknown tool: ${name}`, isError: true };
}

export class AgentService {
	@BackendMethod({ allowed: true })
	static async ask(prompt: string, sessionId: string = 'default'): Promise<string> {
		await insertUserMessage(sessionId, prompt);
		const activeStream = await insertActiveStream(sessionId, prompt);

		const model = getModel('opencode-go', 'deepseek-v4-flash');

		// ── Build conversation context ──
		const prevMessages = await remult.repo(ChatMessage).find({
			where: { sessionId },
			orderBy: { sortOrder: 'asc' }
		});
		const llmMessages: Message[] = prevMessages
			.filter((m) => m.role === 'user' || m.role === 'assistant')
			.map((m) => {
				const ts = m.createdAt.getTime();
				if (m.role === 'user') {
					return { role: 'user' as const, content: m.content, timestamp: ts };
				}
				return { role: 'assistant' as const, content: [{ type: 'text' as const, text: m.content }], timestamp: ts };
			}) as Message[];
		llmMessages.push({ role: 'user', content: prompt, timestamp: Date.now() });
		const llmContext: Context = {
			systemPrompt: '',
			messages: llmMessages,
			tools
		};

		let accumulatedText = '';
		let lastWasTool = false;
		let toolCalls: Array<{
			id: string; name: string; args: unknown; result?: unknown; isError?: boolean;
		}> = [];
		let segments: ActiveStream['segments'] = [];

		try {
			// ── Tool execution loop: stream → tool calls → continue until done ──
			while (true) {
				const eventStream = streamSimple(model, llmContext);

				for await (const event of eventStream) {
					switch (event.type) {
						case 'text_delta': {
							const t = event.delta;
							if (!t) break;
							accumulatedText += t;
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
							if (seg && seg.type === 'tool') seg.args = tc.arguments;
							await updateActiveStream(activeStream, accumulatedText, toolCalls, segments);
							break;
						}

						case 'done': {
							// Save final assistant message with accumulated text/tool calls
							if (accumulatedText || toolCalls.length > 0) {
								await insertAssistantMessage(sessionId, accumulatedText, toolCalls, Date.now());
							}
							break;
						}

						case 'error': {
							console.error('[ask] stream error:', event.error);
							break;
						}
					}
				}

				// ── After stream ends, check for tool calls to execute ──
				const pendingToolCalls = toolCalls.filter((t) => t.result === undefined);
				if (pendingToolCalls.length === 0) break;

				// Execute tools and add results to context for next iteration
				for (const tc of pendingToolCalls) {
					const { result, isError } = await executeToolCall(tc.name, tc.args as Record<string, unknown>);
					tc.result = result;
					tc.isError = isError;

					// Update segment with result
					const seg = segments.find((s) => s.type === 'tool' && s.toolCallId === tc.id);
					if (seg && seg.type === 'tool') {
						seg.result = result;
						seg.isError = isError;
					}
					await updateActiveStream(activeStream, accumulatedText, toolCalls, segments);

					// Add tool result to the LLM context for continuation
					llmContext.messages.push({
						role: 'toolResult',
						toolCallId: tc.id,
						toolName: tc.name,
						content: [{ type: 'text', text: result }],
						isError,
						timestamp: Date.now()
					});

					// Persist tool result message
					await insertToolResultMessage(sessionId, tc, Date.now());
				}

				// Reset accumulators for next turn (tool result text starts fresh)
				accumulatedText = '';
				toolCalls = [];
				segments = [];
			}

			// Clear active stream after all turns complete
			accumulatedText = '';
			toolCalls = [];
			segments = [];
			await updateActiveStream(activeStream, '', [], []);
		} catch (err) {
			console.error('[ask] Agent stream error:', err);
		} finally {
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
