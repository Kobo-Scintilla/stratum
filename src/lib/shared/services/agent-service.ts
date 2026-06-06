import { BackendMethod, remult } from 'remult';
import { ActiveStream } from '../entities/active-stream';
import { ChatMessage } from '../entities/chat-message';
import { runAgentLoop } from '@earendil-works/pi-agent-core';
import { getModel } from '@earendil-works/pi-ai';
import type { AgentEvent } from '../types';
const FLUSH_INTERVAL_MS = 1;

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

function translateEvent(event: Record<string, unknown>): AgentEvent | null {
	switch (event.type) {
		case 'message_update': {
			const msgEvent = event.assistantMessageEvent as Record<string, unknown> | undefined;
			console.log('[debug] message_update received, msgEvent type:', msgEvent?.type, 'has delta:', typeof msgEvent?.delta === 'string');
			if (msgEvent?.type === 'text_delta' && typeof msgEvent.delta === 'string') {
				console.log('[debug] text_delta extracted, length:', msgEvent.delta.length, 'text:', JSON.stringify(msgEvent.delta));
				return { type: 'text_delta', text: msgEvent.delta };
			}
			console.log('[debug] message_update NOT text_delta, event type:', event.type, 'msgEvent type:', msgEvent?.type, 'raw event keys:', Object.keys(event));
			return null;
		}
		case 'tool_start':
		case 'tool_call':
		case 'tool_execution_start':
			return {
				type: event.type as 'tool_start' | 'tool_call' | 'tool_execution_start',
				toolCallId: event.toolCallId as string,
				toolName: event.toolName as string,
				args: event.args
			};
		case 'tool_execution_end':
			return {
				type: 'tool_execution_end',
				toolCallId: event.toolCallId as string,
				toolName: event.toolName as string,
				result: event.result,
				isError: (event.isError as boolean) ?? false
			};
		case 'turn_end':
			return {
				type: 'turn_end',
				message: event.message,
				toolResults: (event.toolResults as unknown[]) ?? []
			};
		default:
			return null;
	}
}

export class AgentService {
	@BackendMethod({ allowed: true })
	static async ask(prompt: string, sessionId: string = 'default'): Promise<string> {
		await insertUserMessage(sessionId, prompt);
		const stream = await insertActiveStream(sessionId, prompt);

		const model = getModel('opencode-go', 'deepseek-v4-flash');

		let accumulatedText = '';
		let lastWasTool = false;
		let toolCalls: Array<{
			id: string;
			name: string;
			args: unknown;
			result?: unknown;
			isError?: boolean;
		}> = [];
		let segments: ActiveStream['segments'] = [];

		// ── Load previous conversation from DB for session memory ──
		const prevMessages = await remult.repo(ChatMessage).find({
			where: { sessionId },
			orderBy: { sortOrder: 'asc' }
		});
		const historyMsgs = prevMessages
			.filter((m) => m.role === 'user' || m.role === 'assistant')
			.map((m) => ({
				role: m.role as 'user' | 'assistant',
				content: m.content,
				timestamp: m.createdAt.getTime()
			})) as import('@earendil-works/pi-agent-core').AgentMessage[];

		try {
			let lastFlushTime = Date.now();
			let turnAccumulatedText = '';
			let turnToolCalls: typeof toolCalls = [];

			const userMessage = { role: 'user' as const, content: prompt, timestamp: Date.now() };
			console.log(
				'[ask] starting runAgentLoop, model:',
				model.id,
				model.provider,
				model.api,
				'hasOpenCodeKey:',
				!!process.env.OPENCODE_API_KEY
			);

			await runAgentLoop(
				[...historyMsgs, userMessage],
				{
					systemPrompt: '',
					messages: historyMsgs,
					tools: []
				},
				{
					model,
					convertToLlm: (msgs) =>
						msgs.filter(
							(m): m is import('@earendil-works/pi-ai').Message =>
								m.role === 'user' || m.role === 'assistant' || m.role === 'toolResult'
						)
				},
				async (raw: unknown) => {
					const evt = raw as Record<string, unknown>;
					// Debug: log every event type
					if (evt.type === 'message_start' || evt.type === 'message_end') {
						const msg = evt.message as Record<string, unknown> | undefined;
						console.log('[ask event]', evt.type, 'content:', Array.isArray(msg?.content) ? (msg?.content as unknown[]).length : 'N/A', 'stopReason:', msg?.stopReason);
					} else if (evt.type === 'message_update') {
						console.log('[ask event] message_update');
					} else {
						console.log('[ask event]', evt.type);
					}
					if (evt.type === 'error') {
						console.log('[ask] STREAM ERROR:', evt.error);
					}
					const event = translateEvent(evt);
					if (!event) return;
					switch (event.type) {
						case 'text_delta': {
							const t = event.text as string;
							if (!t) break;
							console.log('[debug text_delta] delta:', JSON.stringify(t), 'acc len:', accumulatedText.length + t.length);
							accumulatedText += t;
							turnAccumulatedText += t;
							if (lastWasTool || segments.length === 0) {
								segments.push({ type: 'text', text: t });
								lastWasTool = false;
							} else {
								const last = segments[segments.length - 1];
								if (last.type === 'text') last.text += t;
							}
							if (Date.now() - lastFlushTime > FLUSH_INTERVAL_MS) {
								console.log('[debug flush] saving stream, seg count:', segments.length, 'text len:', accumulatedText.length);
								await updateActiveStream(stream, accumulatedText, toolCalls, segments);
								lastFlushTime = Date.now();
							}
							break;
						}
						case 'tool_start':
						case 'tool_call':
						case 'tool_execution_start': {
							const tc = event as { toolCallId: string; toolName: string; args: unknown };
							if (!toolCalls.find((t) => t.id === tc.toolCallId)) {
								toolCalls.push({ id: tc.toolCallId, name: tc.toolName, args: tc.args });
								turnToolCalls.push({ id: tc.toolCallId, name: tc.toolName, args: tc.args });
								segments.push({
									type: 'tool',
									toolCallId: tc.toolCallId,
									toolName: tc.toolName,
									args: tc.args,
									result: undefined,
									isError: false
								});
								lastWasTool = true;
								await updateActiveStream(stream, accumulatedText, toolCalls, segments);
							}
							break;
						}
						case 'tool_execution_end': {
							const tc = event as {
								toolCallId: string;
								toolName: string;
								result: unknown;
								isError: boolean;
							};
							const existing = toolCalls.find((t) => t.id === tc.toolCallId);
							if (existing) {
								existing.result = tc.result;
								existing.isError = tc.isError;
							} else {
								toolCalls.push({
									id: tc.toolCallId,
									name: tc.toolName,
									args: undefined,
									result: tc.result,
									isError: tc.isError
								});
								segments.push({
									type: 'tool',
									toolCallId: tc.toolCallId,
									toolName: tc.toolName,
									args: undefined,
									result: tc.result as Record<string, unknown>,
									isError: tc.isError
								});
							}
							const seg = segments.find((s) => s.type === 'tool' && s.toolCallId === tc.toolCallId);
							if (seg && seg.type === 'tool') {
								seg.result = tc.result as Record<string, unknown>;
								seg.isError = tc.isError;
							}
							await insertToolResultMessage(
								sessionId,
								toolCalls.find((t) => t.id === tc.toolCallId) ?? {
									id: tc.toolCallId,
									name: tc.toolName,
									result: tc.result,
									isError: tc.isError
								},
								Date.now()
							);
							await updateActiveStream(stream, accumulatedText, toolCalls, segments);
							break;
						}
						case 'turn_end': {
							console.log('[debug turn_end] turnAccumulatedText len:', turnAccumulatedText.length, 'text:', JSON.stringify(turnAccumulatedText.slice(0, 100)));
							await insertAssistantMessage(
								sessionId,
								turnAccumulatedText,
								turnToolCalls,
								Date.now()
							);
							turnAccumulatedText = '';
							turnToolCalls = [];
							accumulatedText = '';
							toolCalls = [];
							segments = [];
							console.log('[debug turn_end] clearing stream text/segments');
							await updateActiveStream(stream, '', [], []);
							break;
						}
						case 'error': {
							console.error('[ask] Agent event error:', event.error);
							break;
						}
					}
				}
			);

			console.log('[ask] agent loop completed');
			await insertAssistantMessage(sessionId, turnAccumulatedText, turnToolCalls, Date.now());
		} catch (err) {
			console.error('[ask] Agent stream error:', err);
		} finally {
			console.log('[ask] cleanup');
			// Delay deletion so frontend liveQuery receives ChatMessage before stream disappears
			const sid = stream.id;
			setTimeout(() => {
				globalThis.remultApi?.withRemult(undefined, async () => {
					await remult.repo(ActiveStream).delete(sid);
				}).catch(() => {
					// ignore if already gone
				});
			}, 800);
		}

		return stream.id;
	}

	@BackendMethod({ allowed: true })
	static async clearHistory() {
		await remult.repo(ActiveStream).deleteMany({ where: 'all' });
		await remult.repo(ChatMessage).deleteMany({ where: 'all' });
	}

	@BackendMethod({ allowed: true })
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
