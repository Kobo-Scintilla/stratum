import { browser } from '$app/environment';
import { remult } from 'remult';
import { ChatMessage } from '@opaius/shared/entities/chat-message.js';
import { ActiveStream } from '@opaius/shared/entities/active-stream.js';
import { AgentService } from '@opaius/shared/controllers/agent-service.js';
import { isThoughtWorthDisplaying, parseThinking } from '$lib/utils/thinking.js';
const INITIAL_MESSAGE_LIMIT = 50;
const MIN_MORE_MESSAGES = 20;
const ESTIMATED_MESSAGE_HEIGHT = 150;

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

	for (const m of msgs) {
		if (m.role === 'tool') {
			continue;
		}

		if (m.role === 'user') {
			displayMsgs.push({
				id: m.id,
				role: 'user',
				content: m.content
			});
			continue;
		}

		const blocks = parseThinking(m.content);
		const display: EnrichedMessage = {
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

		for (const block of blocks) {
			if (block.type === 'think') {
				if (!isThoughtWorthDisplaying(block.text)) continue;
				display.activities!.push({
					id: crypto.randomUUID(),
					type: 'think',
					text: block.text
				});
			} else if (block.type === 'text') {
				display.content = block.text;
			}
		}

		if (m.toolCalls && m.toolCalls.length > 0) {
			for (const tc of m.toolCalls) {
				display.activities!.push({
					id: tc.id,
					type: 'tool',
					name: tc.name,
					args: tc.args,
					result: results.get(tc.id) ?? null,
					isError: results.get(tc.id)?.isError ?? false
				});
			}
		}

		display.headroomTokensSaved = m.headroomTokensSaved ?? 0;
		if (m.headroomTokensSaved && m.headroomTokensSaved > 0) {
			display.headroomRatio = m.headroomRatio ?? 1;
		}
		display.inputTokens = m.inputTokens ?? 0;
		display.outputTokens = m.outputTokens ?? 0;
		display.cacheReadTokens = m.cacheReadTokens ?? 0;
		display.cacheWriteTokens = m.cacheWriteTokens ?? 0;
		display.contextMessages = m.contextMessages ?? 0;
		displayMsgs.push(display);
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
	readonly isLoadingMore: boolean;
	readonly hasMore: boolean;
	readonly error: string;
	switchSession(sessionId: string, initialMessages?: ChatMessage[]): void;
	loadMore(extraMessages?: number): void;
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
	let isLoadingMore = $state(false);
	let error = $state('');
	let currentLimit = $state(INITIAL_MESSAGE_LIMIT);
	let hasMore = $state(false);

	// Display messages derived from raw messages
	let displayMessages = $derived(getDisplayMessages(messages));
	let unsubs: (() => void)[] = [];

	function messagesPerViewport(): number {
		const height = typeof window !== 'undefined' ? window.innerHeight : 720;
		return Math.max(MIN_MORE_MESSAGES, Math.ceil(height / ESTIMATED_MESSAGE_HEIGHT));
	}

	function refreshHasMore(sid: string, limitVal: number) {
		return remult
			.repo(ChatMessage)
			.count({ sessionId: sid })
			.then((total) => {
				hasMore = total > limitVal;
			})
			.catch(() => {
				hasMore = false;
			});
	}

	function subscribe(sid: string, limitVal = currentLimit): Promise<void> {
		if (!sid) return Promise.resolve();
		currentLimit = limitVal;
		for (const u of unsubs) u();
		unsubs = [];
		const hasMorePromise = refreshHasMore(sid, limitVal);

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
						const nextMessages = [...info.items].reverse();
						if (nextMessages.length > 0 || messages.length === 0) {
							messages = nextMessages;
							void refreshHasMore(sid, currentLimit);
						}
					},
					error: (err) => {
						error = err instanceof Error ? err.message : String(err);
					}
				})
		);
		unsubs.push(
			remult
				.repo(ActiveStream)
				.liveQuery({ where: { sessionId: sid }, orderBy: { createdAt: 'asc' as const } })
				.subscribe({
					next: (info) => {
						activeStreams = [...info.applyChanges(activeStreams)];
					},
					error: (err) => {
						error = err instanceof Error ? err.message : String(err);
					}
				})
		);
		return hasMorePromise;
	}

	// svelte-ignore state_referenced_locally
	if (browser && sessionId) {
		// svelte-ignore state_referenced_locally
		const initSid = sessionId;
		queueMicrotask(() => {
			void subscribe(initSid, currentLimit);
		});
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
		get isLoadingMore() {
			return isLoadingMore;
		},
		get hasMore() {
			return hasMore;
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
			void subscribe(newId, INITIAL_MESSAGE_LIMIT);
		},

		loadMore(extraMessages = messagesPerViewport()) {
			if (!sessionId || !hasMore || isLoadingMore) return;
			isLoadingMore = true;
			void subscribe(sessionId, currentLimit + extraMessages).finally(() => {
				isLoadingMore = false;
			});
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
			isLoadingMore = false;
			hasMore = false;
			error = '';
			currentLimit = INITIAL_MESSAGE_LIMIT;
		},

		destroy() {
			for (const u of unsubs) u();
			unsubs = [];
		}
	};
}
