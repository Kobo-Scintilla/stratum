import { remult } from 'remult';
import { getModel, streamSimple } from '@earendil-works/pi-ai';
import { ActiveStream } from '../entities/active-stream';
import { ChatMessage } from '../entities/chat-message';
import type { Context, AgentConfig, TrackedToolCall } from './types';
import { toolRegistry } from './tools';
import { persistToolResult } from './context';

function genId(): string {
	return crypto.randomUUID();
}

export async function withOwnContext<T>(fn: () => Promise<T>): Promise<T> {
	if (globalThis.remultApi) {
		return await (globalThis.remultApi.withRemult as (ctx: undefined, fn: () => Promise<T>) => Promise<T>)(
			undefined,
			fn
		);
	}
	return await fn();
}

export async function updateActiveStream(
	stream: ActiveStream,
	text: string,
	toolCalls: ActiveStream['toolCalls'],
	segments: ActiveStream['segments']
): Promise<void> {
	await withOwnContext(async () => {
		await remult.repo(ActiveStream).save({
			...stream,
			text,
			toolCalls: toolCalls.map((t) => ({ ...t })),
			segments
		});
	});
}

export async function insertAssistantMessage(
	sessionId: string,
	text: string,
	toolCalls: TrackedToolCall[],
	sortOrder: number
): Promise<void> {
	await withOwnContext(async () => {
		await remult.repo(ChatMessage).insert({
			id: genId(),
			sessionId,
			role: 'assistant',
			content: text,
			toolCalls: toolCalls.length > 0
				? toolCalls.map((t) => ({ id: t.id, name: t.name, args: t.args }))
				: undefined,
			sortOrder,
			createdAt: new Date(sortOrder)
		});
	});
}

export async function insertActiveStream(
	sessionId: string,
	prompt: string
): Promise<ActiveStream> {
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

export async function insertUserMessage(
	sessionId: string,
	content: string
): Promise<void> {
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

export async function runStreamLoop(
	config: AgentConfig,
	context: Context,
	sessionId: string,
	streamId: string
): Promise<void> {
	const model = getModel(config.modelProvider as never, config.modelId as never);

	let accumulatedText = '';
	let lastWasTool = false;
	let toolCalls: TrackedToolCall[] = [];
	let segments: ActiveStream['segments'] = [];

	const stream = await withOwnContext(async () => {
		return await remult.repo(ActiveStream).findId(streamId);
	});
	if (!stream) throw new Error(`ActiveStream ${streamId} not found`);

	while (true) {
			const eventStream = streamSimple(model, context);

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
						await updateActiveStream(stream, accumulatedText, toolCalls, segments);
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
								type: 'tool',
								toolCallId: tcId,
								toolName: tcName,
								args: {},
								result: undefined,
								isError: false
							});
							lastWasTool = true;
							await updateActiveStream(stream, accumulatedText, toolCalls, segments);
						}
						break;
					}

					case 'toolcall_end': {
						const tc = event.toolCall as {
							id: string;
							name: string;
							arguments: Record<string, unknown>;
						};
						const existing = toolCalls.find((t) => t.id === tc.id);
						if (existing) {
							existing.args = tc.arguments;
						} else {
							toolCalls.push({
								id: tc.id,
								name: tc.name,
								args: tc.arguments,
								result: undefined,
								isError: false
							});
							segments.push({
								type: 'tool',
								toolCallId: tc.id,
								toolName: tc.name,
								args: tc.arguments,
								result: undefined,
								isError: false
							});
						}
						const seg = segments.find(
							(s) => s.type === 'tool' && s.toolCallId === tc.id
						);
						if (seg && seg.type === 'tool') seg.args = tc.arguments;
						await updateActiveStream(stream, accumulatedText, toolCalls, segments);
						break;
					}

					case 'done': {
						if (accumulatedText || toolCalls.length > 0) {
							await insertAssistantMessage(sessionId, accumulatedText, toolCalls, Date.now());
						}
						break;
					}

					case 'error': {
						console.error('[stream] stream error:', event.error);
						break;
					}
				}
			}

			// ── After stream ends, check for pending tool calls ──
			const pendingToolCalls = toolCalls.filter((t) => t.result === undefined);
			if (pendingToolCalls.length === 0) break;

			// Execute tools and add results to context for next iteration
			for (const tc of pendingToolCalls) {
				const { result, isError } = await toolRegistry.execute(
					tc.name,
					tc.args as Record<string, unknown>
				);
				tc.result = result;
				tc.isError = isError;

				// Update segment with result
				const seg = segments.find((s) => s.type === 'tool' && s.toolCallId === tc.id);
				if (seg && seg.type === 'tool') {
					seg.result = result;
					seg.isError = isError;
				}
				await updateActiveStream(stream, accumulatedText, toolCalls, segments);

				// Add tool result to the LLM context for continuation
				context.messages.push({
					role: 'toolResult',
					toolCallId: tc.id,
					toolName: tc.name,
					content: [{ type: 'text', text: result }],
					isError,
					timestamp: Date.now()
				});

				// Persist tool result message
				await persistToolResult(sessionId, tc, Date.now());
			}

			// Reset accumulators for next turn (tool result text starts fresh)
			accumulatedText = '';
			toolCalls = [];
	}
}