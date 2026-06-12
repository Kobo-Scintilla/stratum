import { browser } from '$app/environment';
import { remult } from 'remult';
import { ChatMessage } from '@stratum/shared/entities/chat-message.js';
import { ActiveStream } from '@stratum/shared/entities/active-stream.js';
import { AgentService } from '@stratum/shared/controllers/agent-service.js';
import { isThoughtWorthDisplaying, parseThinking } from '$lib/utils/thinking.js';
import { safeRandomUUID } from '$lib/utils/uuid.js';
import { createLiveQuery } from '$lib/stores/live-query.svelte.js';
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
	isFinal?: boolean;
	checkpointHash?: string;
}

// ── Helper: group messages, thinking, and tool results ──

function getDisplayMessages(msgs: ChatMessage[], streams: ActiveStream[] = []): EnrichedMessage[] {
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
	let lastAssistantMsg: EnrichedMessage | null = null;

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
			lastAssistantMsg = null;
			continue;
		}

		const blocks = parseThinking(m.content);

		// Group into existing block if it has no text update yet
		if (lastAssistantMsg && lastAssistantMsg.content.trim() === '') {
			for (const block of blocks) {
				if (block.type === 'think') {
					if (isThoughtWorthDisplaying(block.text)) {
						lastAssistantMsg.activities!.push({
							id: safeRandomUUID(),
							type: 'think',
							text: block.text
						});
					}
				} else if (block.type === 'text') {
					lastAssistantMsg.content += block.text;
				}
			}

			if (m.toolCalls && m.toolCalls.length > 0) {
				for (const tc of m.toolCalls) {
					lastAssistantMsg.activities!.push({
						id: tc.id,
						type: 'tool',
						name: tc.name,
						args: tc.args,
						result: results.get(tc.id) ?? null,
						isError: results.get(tc.id)?.isError ?? false
					});
				}
			}

			lastAssistantMsg.inputTokens = (lastAssistantMsg.inputTokens ?? 0) + (m.inputTokens ?? 0);
			lastAssistantMsg.outputTokens = (lastAssistantMsg.outputTokens ?? 0) + (m.outputTokens ?? 0);
			lastAssistantMsg.cacheReadTokens =
				(lastAssistantMsg.cacheReadTokens ?? 0) + (m.cacheReadTokens ?? 0);
			lastAssistantMsg.cacheWriteTokens =
				(lastAssistantMsg.cacheWriteTokens ?? 0) + (m.cacheWriteTokens ?? 0);
			lastAssistantMsg.headroomTokensSaved =
				(lastAssistantMsg.headroomTokensSaved ?? 0) + (m.headroomTokensSaved ?? 0);
			if (m.headroomRatio && m.headroomRatio < 1) {
				lastAssistantMsg.headroomRatio = m.headroomRatio;
			}
			if (m.checkpointHash) {
				lastAssistantMsg.checkpointHash = m.checkpointHash;
			}
		} else {
			const display: EnrichedMessage = {
				id: m.id,
				role: 'assistant',
				content: '',
				activities: [],
				headroomTokensSaved: m.headroomTokensSaved ?? 0,
				headroomRatio: m.headroomRatio ?? 1,
				inputTokens: m.inputTokens ?? 0,
				outputTokens: m.outputTokens ?? 0,
				cacheReadTokens: m.cacheReadTokens ?? 0,
				cacheWriteTokens: m.cacheWriteTokens ?? 0,
				contextMessages: m.contextMessages ?? 0,
				checkpointHash: m.checkpointHash
			};

			for (const block of blocks) {
				if (block.type === 'think') {
					if (isThoughtWorthDisplaying(block.text)) {
						display.activities!.push({
							id: safeRandomUUID(),
							type: 'think',
							text: block.text
						});
					}
				} else if (block.type === 'text') {
					display.content += block.text;
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

			displayMsgs.push(display);
			lastAssistantMsg = display;
		}
	}

	// Flag which assistant blocks are the final ones
	const hasActiveStream = streams.length > 0;
	for (let i = 0; i < displayMsgs.length; i++) {
		if (displayMsgs[i].role === 'assistant') {
			const isLast = i === displayMsgs.length - 1;
			const followedByUser = !isLast && displayMsgs[i + 1].role === 'user';
			displayMsgs[i].isFinal = (isLast && !hasActiveStream) || followedByUser;
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
	let currentLimit = $state(INITIAL_MESSAGE_LIMIT);
	let localMessages = $state<ChatMessage[]>(initialMessages ?? []);
	let isSending = $state(false);
	let isLoadingMore = $state(false);
	let hasMore = $state(false);
	let customError = $state('');

	const messagesQuery = createLiveQuery<ChatMessage>(() =>
		sessionId
			? {
					repo: remult.repo(ChatMessage),
					options: {
						where: { sessionId },
						orderBy: { sortOrder: 'desc' as const },
						limit: currentLimit
					}
				}
			: null
	);

	const messages = $derived.by(() => {
		if (messagesQuery.data && messagesQuery.data.length > 0) {
			return [...messagesQuery.data].reverse();
		}
		return localMessages;
	});

	const activeStreamsQuery = createLiveQuery<ActiveStream>(() =>
		sessionId
			? {
					repo: remult.repo(ActiveStream),
					options: {
						where: { sessionId },
						orderBy: { createdAt: 'asc' as const }
					}
				}
			: null
	);

	const activeStreams = $derived(activeStreamsQuery.data);

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

	$effect(() => {
		if (browser && sessionId) {
			void refreshHasMore(sessionId, currentLimit);
		}
	});

	$effect(() => {
		if (!messagesQuery.loading) {
			isLoadingMore = false;
		}
	});

	return {
		get sessionId() {
			return sessionId;
		},
		get messages() {
			return messages;
		},
		get displayMessages() {
			return getDisplayMessages(messages, activeStreams);
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
			return customError || messagesQuery.error || activeStreamsQuery.error || '';
		},

		switchSession(newId: string, initialMessages?: ChatMessage[]) {
			if (sessionId === newId) return;
			sessionId = newId;
			localMessages = initialMessages ?? [];
			currentLimit = INITIAL_MESSAGE_LIMIT;
		},

		loadMore(extraMessages = messagesPerViewport()) {
			if (!sessionId || !hasMore || isLoadingMore) return;
			isLoadingMore = true;
			currentLimit += extraMessages;
		},

		async send(prompt: string) {
			let sid = sessionId;
			if (!sid) {
				sid = safeRandomUUID();
				sessionId = sid;
			}
			isSending = true;
			customError = '';
			try {
				await AgentService.ask(prompt, sid);
			} catch (err: unknown) {
				customError = err instanceof Error ? err.message : String(err);
			} finally {
				isSending = false;
			}
		},

		reset() {
			sessionId = null;
			localMessages = [];
			isSending = false;
			isLoadingMore = false;
			hasMore = false;
			customError = '';
			currentLimit = INITIAL_MESSAGE_LIMIT;
		},

		destroy() {
			// Auto-unsubscribed by createLiveQuery $effect cleanup
		}
	};
}
