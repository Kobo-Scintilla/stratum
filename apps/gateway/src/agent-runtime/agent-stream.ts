import { remult } from 'remult';
import { getModel, streamSimple } from '@earendil-works/pi-ai';
import type { AssistantMessageEvent, Message, Usage } from '@earendil-works/pi-ai';
import { ActiveStream } from '@opaius/shared/entities/active-stream.js';
import { ChatMessage } from '@opaius/shared/entities/chat-message.js';
import { ProviderSetting } from '@opaius/shared/entities/provider-setting.js';
import type { Context, AgentConfig, TrackedToolCall } from './types.js';
import { toolRegistry } from './agent-tools.js';
import { persistToolResult } from './agent-context.js';

interface CustomModel {
	id: string;
	name: string;
	api: string;
	provider: string;
	baseUrl: string;
	reasoning: boolean;
	input: string[];
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
	contextWindow: number;
	maxTokens: number;
}

async function buildCustomModel(
	providerId: string,
	modelId: string
): Promise<CustomModel | undefined> {
	const settings = await remult.repo(ProviderSetting).findId(providerId);
	if (!settings?.baseUrl) return undefined;

	const apiType = settings.apiType ?? 'openai-completions';
	return {
		id: modelId,
		name: modelId,
		api: apiType,
		provider: providerId,
		baseUrl: settings.baseUrl,
		reasoning: false,
		input: ['text'],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 4096,
		maxTokens: 4096
	};
}


async function updateActiveStream(
	stream: ActiveStream,
	text: string,
	toolCalls: ActiveStream['toolCalls'],
	segments: ActiveStream['segments']
): Promise<void> {
	await remult.repo(ActiveStream).update(stream.id, {
		text,
		toolCalls: toolCalls.map((t) => ({ ...t })),
		segments
	});
}

async function insertAssistantMessage(
	sessionId: string,
	text: string,
	toolCalls: TrackedToolCall[],
	sortOrder: number,
	inputTokens = 0,
	outputTokens = 0,
	cacheReadTokens = 0,
	cacheWriteTokens = 0,
	contextMessages = 0
): Promise<void> {
	await remult.repo(ChatMessage).insert({
		id: crypto.randomUUID(),
		sessionId,
		role: 'assistant',
		content: text,
		toolCalls:
			toolCalls.length > 0
				? toolCalls.map((t) => ({ id: t.id, name: t.name, args: t.args }))
				: undefined,
		sortOrder,
		createdAt: new Date(sortOrder),
		inputTokens,
		outputTokens,
		cacheReadTokens,
		cacheWriteTokens,
		contextMessages
	});
}

export async function insertActiveStream(sessionId: string, prompt: string): Promise<ActiveStream> {
	return await remult.repo(ActiveStream).insert({
		id: crypto.randomUUID(),
		sessionId,
		prompt,
		text: '',
		isGenerating: true,
		createdAt: new Date(),
		toolCalls: []
	});
}

export async function insertUserMessage(sessionId: string, content: string): Promise<void> {
	await remult.repo(ChatMessage).insert({
		id: crypto.randomUUID(),
		sessionId,
		role: 'user',
		content,
		sortOrder: Date.now(),
		createdAt: new Date()
	});
}

interface StreamState {
	accumulatedText: string;
	lastWasTool: boolean;
	toolCalls: TrackedToolCall[];
	segments: ActiveStream['segments'];
	lastUpdate: number;
	isThinking: boolean;
	usage: Usage | null;
}

const THROTTLE_MS = 100;

async function handleTextDelta(
	event: AssistantMessageEvent & { type: 'text_delta' },
	state: StreamState,
	stream: ActiveStream
) {
	if (state.isThinking) {
		state.isThinking = false;
		state.accumulatedText += '</think>';
		const last = state.segments[state.segments.length - 1];
		if (last?.type === 'text') {
			last.text += '</think>';
		} else {
			state.segments.push({ type: 'text', text: '</think>' });
		}
	}
	const t = event.delta;
	if (!t) return;
	state.accumulatedText += t;
	if (state.lastWasTool || state.segments.length === 0) {
		state.segments.push({ type: 'text', text: t });
		state.lastWasTool = false;
	} else {
		const last = state.segments[state.segments.length - 1];
		if (last.type === 'text') last.text += t;
	}
	const now = Date.now();
	if (now - state.lastUpdate > THROTTLE_MS) {
		await updateActiveStream(stream, state.accumulatedText, state.toolCalls, state.segments);
		state.lastUpdate = now;
	}
}

async function handleToolCallStart(
	event: AssistantMessageEvent & { type: 'toolcall_start' },
	state: StreamState,
	stream: ActiveStream
) {
	const idx = event.contentIndex;
	const partial = event.partial as { content: Array<{ type: string; id?: string; name?: string }> };
	const tcBlock = partial?.content?.[idx];
	const tcId = tcBlock?.id ?? 'unknown';
	const tcName = tcBlock?.name ?? 'unknown';
	if (!state.toolCalls.find((t) => t.id === tcId)) {
		state.toolCalls.push({ id: tcId, name: tcName, args: {}, result: undefined, isError: false });
		state.segments.push({
			type: 'tool',
			toolCallId: tcId,
			toolName: tcName,
			args: {},
			result: undefined,
			isError: false
		});
		state.lastWasTool = true;
		await updateActiveStream(stream, state.accumulatedText, state.toolCalls, state.segments);
	}
}

async function handleToolCallEnd(
	event: AssistantMessageEvent & { type: 'toolcall_end' },
	state: StreamState,
	stream: ActiveStream
) {
	const tc = event.toolCall as { id: string; name: string; arguments: Record<string, unknown> };
	const existing = state.toolCalls.find((t) => t.id === tc.id);
	if (existing) {
		existing.args = tc.arguments;
	} else {
		state.toolCalls.push({
			id: tc.id,
			name: tc.name,
			args: tc.arguments,
			result: undefined,
			isError: false
		});
		state.segments.push({
			type: 'tool',
			toolCallId: tc.id,
			toolName: tc.name,
			args: tc.arguments,
			result: undefined,
			isError: false
		});
	}
	const seg = state.segments.find((s) => s.type === 'tool' && s.toolCallId === tc.id);
	if (seg && seg.type === 'tool') seg.args = tc.arguments;
	await updateActiveStream(stream, state.accumulatedText, state.toolCalls, state.segments);
}

async function handleThinkingStart(
	event: AssistantMessageEvent & { type: 'thinking_start' },
	state: StreamState,
	stream: ActiveStream
) {
	state.isThinking = true;
	state.accumulatedText += '<think>';
	state.segments.push({ type: 'text', text: '<think>' });
	await updateActiveStream(stream, state.accumulatedText, state.toolCalls, state.segments);
}

async function handleThinkingDelta(
	event: AssistantMessageEvent & { type: 'thinking_delta' },
	state: StreamState,
	stream: ActiveStream
) {
	const t = event.delta;
	if (!t) return;
	state.accumulatedText += t;
	if (state.lastWasTool || state.segments.length === 0) {
		state.segments.push({ type: 'text', text: t });
		state.lastWasTool = false;
	} else {
		const last = state.segments[state.segments.length - 1];
		if (last.type === 'text') last.text += t;
	}
	const now = Date.now();
	if (now - state.lastUpdate > THROTTLE_MS) {
		await updateActiveStream(stream, state.accumulatedText, state.toolCalls, state.segments);
		state.lastUpdate = now;
	}
}

async function handleThinkingEnd(
	event: AssistantMessageEvent & { type: 'thinking_end' },
	state: StreamState,
	stream: ActiveStream
) {
	state.isThinking = false;
	state.accumulatedText += '</think>';
	const last = state.segments[state.segments.length - 1];
	if (last?.type === 'text') {
		last.text += '</think>';
	} else {
		state.segments.push({ type: 'text', text: '</think>' });
	}
	await updateActiveStream(stream, state.accumulatedText, state.toolCalls, state.segments);
}

function handleDone(
	event: AssistantMessageEvent & { type: 'done' },
	state: StreamState,
	context: Context,
	stream: ActiveStream
) {
	// Close thinking block if still open
	if (state.isThinking) {
		state.isThinking = false;
		state.accumulatedText += '</think>';
		const last = state.segments[state.segments.length - 1];
		if (last?.type === 'text') {
			last.text += '</think>';
		} else {
			state.segments.push({ type: 'text', text: '</think>' });
		}
	}

	// Save usage from the done event
	state.usage = event.message.usage;

	const content: (
		| { type: 'text'; text: string }
		| { type: 'toolCall'; id: string; name: string; arguments: Record<string, unknown> }
	)[] = [];
	if (state.accumulatedText) content.push({ type: 'text', text: state.accumulatedText });
	for (const tc of state.toolCalls) {
		content.push({
			type: 'toolCall',
			id: tc.id,
			name: tc.name,
			arguments: tc.args as Record<string, unknown>
		});
	}
	context.messages.push({
		role: 'assistant',
		content,
		timestamp: Date.now()
	} as unknown as Message);
}


export async function runStreamLoop(
	config: AgentConfig,
	context: Context,
	sessionId: string,
	streamId: string
): Promise<void> {
	// Try built-in model registry first, fall back to custom model
	const builtinModel = getModel(config.modelProvider as never, config.modelId as never);
	const model = builtinModel ?? buildCustomModel(config.modelProvider, config.modelId);
	if (!model) throw new Error(`Model ${config.modelProvider}/${config.modelId} not found`);

	const stream = await remult.repo(ActiveStream).findId(streamId);
	if (!stream) throw new Error(`ActiveStream ${streamId} not found`);

	const state: StreamState = {
		accumulatedText: '',
		lastWasTool: false,
		toolCalls: [],
		segments: [],
		lastUpdate: 0,
		isThinking: false,
		usage: null
	};

	while (true) {
		const options: any = {};
		if (config.thinkingLevel && config.thinkingLevel !== 'off') {
			options.reasoning = config.thinkingLevel;
		}
		const eventStream = streamSimple(model, context, options);

		for await (const event of eventStream) {
			switch (event.type) {
				case 'text_delta':
					await handleTextDelta(event, state, stream);
					break;
				case 'toolcall_start':
					await handleToolCallStart(event, state, stream);
					break;
				case 'toolcall_end':
					await handleToolCallEnd(event, state, stream);
					break;
				case 'thinking_start':
					await handleThinkingStart(event, state, stream);
					break;
				case 'thinking_delta':
					await handleThinkingDelta(event, state, stream);
					break;
				case 'thinking_end':
					await handleThinkingEnd(event, state, stream);
					break;
				case 'done':
					handleDone(event, state, context, stream);
					break;
				case 'error':
					console.error('[stream] stream error:', event.error);
					await updateActiveStream(
						stream,
						`> **Error:** ${event.error?.errorMessage || 'Unknown stream error'}`,
						[],
						[{ type: 'text', text: `Error: ${event.error?.errorMessage || 'Unknown stream error'}` }]
					);
					break;
			}
		}

		// ── Save assistant message to DB for history ──
		if (state.accumulatedText || state.toolCalls.length > 0) {
			await insertAssistantMessage(
				sessionId,
				state.accumulatedText,
				state.toolCalls,
				Date.now(),
				state.usage?.input ?? 0,
				state.usage?.output ?? 0,
				state.usage?.cacheRead ?? 0,
				state.usage?.cacheWrite ?? 0,
				context.messages.length
			);
			await updateActiveStream(stream, '', [], []);
		}

		const pendingToolCalls = state.toolCalls.filter((t) => t.result === undefined);
		if (pendingToolCalls.length === 0) break;

		// Execute tools and add results to context for next iteration
		for (const tc of pendingToolCalls) {
			const { result, isError } = await toolRegistry.execute(
				tc.name,
				tc.args as Record<string, unknown>
			);
			tc.result = result;
			tc.isError = isError;

			const seg = state.segments.find((s) => s.type === 'tool' && s.toolCallId === tc.id);
			if (seg && seg.type === 'tool') {
				seg.result = result;
				seg.isError = isError;
			}

			context.messages.push({
				role: 'toolResult' as const,
				toolCallId: tc.id,
				toolName: tc.name,
				content: [{ type: 'text' as const, text: result }],
				isError,
				timestamp: Date.now()
			} as unknown as Message);

			await persistToolResult(sessionId, tc, Date.now());
		}

		// Reset accumulators for next turn
		state.accumulatedText = '';
		state.toolCalls = [];
		state.segments = [];
	}
	// Close thinking block if still open after the loop
	if (state.isThinking) {
		state.isThinking = false;
		state.accumulatedText += '</think>';
		const last = state.segments[state.segments.length - 1];
		if (last?.type === 'text') {
			last.text += '</think>';
		} else {
			state.segments.push({ type: 'text', text: '</think>' });
		}
	}
}
