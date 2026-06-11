import { browser } from '$app/environment';
import { remult } from 'remult';
import { ChatMessage } from '@opaius/shared/entities/chat-message.js';
import { ActiveStream } from '@opaius/shared/entities/active-stream.js';
import { AgentService } from '@opaius/shared/controllers/agent-service.js';
import { parseThinking } from '$lib/utils/thinking.js';

// ── Enriched display types ──────────────────────────────────────

export interface ActivityStep {
	id: string;
	type: 'think' | 'tool' | 'info';
	name?: string;
	args?: unknown;
	text?: string;
	result?: { result: string; isError: boolean } | null;
	isError?: boolean;
}

export interface EnrichedMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	activities?: ActivityStep[];
	headroomTokensSaved?: number;
	headroomRatio?: number;
	inputTokens?: number;
	outputTokens?: number;
	cacheReadTokens?: number;
	cacheWriteTokens?: number;
	contextMessages?: number;
}

// ── Helper: group messages, thinking, and tool results ──

function getDisplayMessages(msgs: ChatMessage[]): EnrichedMessage[] {
	const results = new Map<string, { result: string; isError: boolean }>();
	for (const m of msgs) {
		if (m.role === 'tool' && m.toolCallId) {
			results.set(m.toolCallId, {
				result: String(m.toolResult ?? m.content ?? ''),
				isError: m.isError ?? false
			});
		}
	}

	const displayMsgs: EnrichedMessage[] = [];
	let currentAssistant: EnrichedMessage | null = null;

	for (const m of msgs) {
		if (m.role === 'tool') {
			continue;
		}

		if (m.role === 'user') {
			currentAssistant = null;
			displayMsgs.push({
				id: m.id,
				role: 'user',
				content: m.content
			});
			continue;
		}

		if (m.role === 'assistant') {
			if (!currentAssistant) {
				currentAssistant = {
					id: m.id,
					role: 'assistant',
					content: '',
					activities: [],
					headroomTokensSaved: 0,
					headroomRatio: 1,
					inputTokens: 0,
					outputTokens: 0,
					cacheReadTokens: 0,
					cacheWriteTokens: 0,
					contextMessages: 0
				};
				displayMsgs.push(currentAssistant);
			} else {
				if (currentAssistant.content && currentAssistant.content.trim() !== '') {
					currentAssistant.activities!.push({
						id: crypto.randomUUID(),
						type: 'info',
						text: currentAssistant.content
					});
					currentAssistant.content = '';
				}
			}

			const blocks = parseThinking(m.content);
			for (const block of blocks) {
				if (block.type === 'think') {
					currentAssistant.activities!.push({
						id: crypto.randomUUID(),
						type: 'think',
						text: block.text
					});
				} else if (block.type === 'text') {
					currentAssistant.content = block.text;
				}
			}

			if (m.toolCalls && m.toolCalls.length > 0) {
				for (const tc of m.toolCalls) {
					currentAssistant.activities!.push({
						id: tc.id,
						type: 'tool',
						name: tc.name,
						args: tc.args,
						result: results.get(tc.id) ?? null,
						isError: results.get(tc.id)?.isError ?? false
					});
				}
			}

			currentAssistant.headroomTokensSaved =
				(currentAssistant.headroomTokensSaved ?? 0) + (m.headroomTokensSaved ?? 0);
			if (m.headroomTokensSaved && m.headroomTokensSaved > 0) {
				currentAssistant.headroomRatio = m.headroomRatio ?? 1;
			}
			currentAssistant.inputTokens = (currentAssistant.inputTokens ?? 0) + (m.inputTokens ?? 0);
			currentAssistant.outputTokens = (currentAssistant.outputTokens ?? 0) + (m.outputTokens ?? 0);
			currentAssistant.cacheReadTokens =
				(currentAssistant.cacheReadTokens ?? 0) + (m.cacheReadTokens ?? 0);
			currentAssistant.cacheWriteTokens =
				(currentAssistant.cacheWriteTokens ?? 0) + (m.cacheWriteTokens ?? 0);
			currentAssistant.contextMessages = m.contextMessages ?? 0;
		}
	}

	return displayMsgs;
}

// ── Chat session ────────────────────────────────────────────────

export interface ChatSession {
	readonly sessionId: string | null;
	readonly messages: ChatMessage[];
	readonly displayMessages: EnrichedMessage[];
	readonly activeStreams: ActiveStream[];
	readonly isSending: boolean;
	readonly error: string;
	switchSession(sessionId: string, initialMessages?: ChatMessage[]): void;
	loadMore(): void;
	send(prompt: string): Promise<void>;
	reset(): void;
	destroy(): void;
}

let activeSession: ChatSession | null = null;

export function getChatSession(
	initialSession?: string,
	initialMessages?: ChatMessage[]
): ChatSession {
	if (!browser) return createChatSession(initialSession, initialMessages);

	if (!activeSession) {
		// svelte-ignore state_referenced_locally
		activeSession = createChatSession(initialSession, initialMessages);
		return activeSession;
	}

	// svelte-ignore state_referenced_locally
	if (initialSession && activeSession.sessionId !== initialSession) {
		// svelte-ignore state_referenced_locally
		activeSession.switchSession(initialSession, initialMessages);
	}

	return activeSession;
}

export function createChatSession(
	initialSession?: string,
	initialMessages?: ChatMessage[]
): ChatSession {
	let sessionId = $state<string | null>(initialSession ?? null);
	let messages = $state<ChatMessage[]>(initialMessages ?? []);
	let activeStreams = $state<ActiveStream[]>([]);
	let isSending = $state(false);
	let error = $state('');
	let currentLimit = $state(50);

	// Display messages derived from raw messages
	let displayMessages = $derived(getDisplayMessages(messages));

	let unsubs: (() => void)[] = [];

	async function subscribe(sid: string, limitVal = 50) {
		if (!sid) return;
		currentLimit = limitVal;
		for (const u of unsubs) u();
		unsubs = [];

		// Run in background without blocking subscription to prevent UI lag/flicker
		remult
			.repo(ChatMessage)
			.count({ sessionId: sid })
			.catch(() => {});

		unsubs.push(
			remult
				.repo(ChatMessage)
				.liveQuery({
					where: { sessionId: sid },
					orderBy: { sortOrder: 'desc' as const },
					limit: limitVal
				})
				.subscribe({
					next: (info) => {
						messages = [...info.items].reverse();
					}
				})
		);
		unsubs.push(
			remult
				.repo(ActiveStream)
				.liveQuery({ where: { sessionId: sid }, orderBy: { createdAt: 'asc' as const } })
				.subscribe({
					next: (info) => {
						console.log(
							'[debug liveQuery] ActiveStream update, items:',
							info.items.length,
							'text:',
							info.items[0]?.text?.slice(0, 50),
							'segments:',
							info.items[0]?.segments?.length
						);
						activeStreams = info.items;
					},
					error: (err) => {
						console.log('[debug liveQuery] ActiveStream error:', err);
					}
				})
		);
	}

	// svelte-ignore state_referenced_locally
	if (browser && sessionId) {
		// svelte-ignore state_referenced_locally
		const initSid = sessionId;
		queueMicrotask(() => subscribe(initSid, currentLimit));
	}

	return {
		get sessionId() {
			return sessionId;
		},
		get messages() {
			return messages;
		},
		get displayMessages() {
			return displayMessages;
		},
		get activeStreams() {
			return activeStreams;
		},
		get isSending() {
			return isSending;
		},
		get error() {
			return error;
		},

		switchSession(newId: string, initialMessages?: ChatMessage[]) {
			if (sessionId === newId) return;
			sessionId = newId;
			if (initialMessages) {
				messages = initialMessages;
			} else {
				messages = [];
			}
			subscribe(newId, 50);
		},

		loadMore() {
			if (!sessionId) return;
			subscribe(sessionId, currentLimit + 50);
		},

		async send(prompt: string) {
			let sid = sessionId;
			if (!sid) {
				sid = crypto.randomUUID();
				sessionId = sid;
				await subscribe(sid, currentLimit);
			}
			isSending = true;
			error = '';
			try {
				await AgentService.ask(prompt, sid);
			} catch (err: unknown) {
				error = err instanceof Error ? err.message : String(err);
			} finally {
				isSending = false;
			}
		},

		reset() {
			for (const u of unsubs) u();
			unsubs = [];
			sessionId = null;
			messages = [];
			activeStreams = [];
			isSending = false;
			error = '';
			currentLimit = 50;
		},

		destroy() {
			for (const u of unsubs) u();
			unsubs = [];
		}
	};
}
