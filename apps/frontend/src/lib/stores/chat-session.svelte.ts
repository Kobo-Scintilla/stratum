import { browser } from '$app/environment';
import { remult } from 'remult';
import { AgentService } from '../shared/services/agent-service';
import { ChatMessage } from '../shared/entities/chat-message';
import { ActiveStream } from '../shared/entities/active-stream';
import type { ToolCallInfo } from '../shared/entities/chat-message';

// ── Enriched display types ──────────────────────────────────────

export interface EnrichedToolCall {
	id: string;
	name: string;
	args?: unknown;
	result?: { result: string; isError: boolean } | null;
	isError?: boolean;
}

export interface EnrichedMessage {
	id: string;
	role: string;
	content: string;
	toolCalls?: EnrichedToolCall[];
}

// ── Helper: build tool results map and return display messages ──

function getDisplayMessages(msgs: ChatMessage[]): EnrichedMessage[] {
	const results = new Map<string, { result: string; isError: boolean }>();
	for (const m of msgs) {
		if (m.role === 'tool' && m.toolCallId) {
			results.set(m.toolCallId, {
				result: String(m.toolResult ?? ''),
				isError: m.isError ?? false
			});
		}
	}
	return msgs
		.filter((m) => m.role !== 'tool')
		.map((m) => ({
			id: m.id,
			role: m.role,
			content: m.content,
			toolCalls: m.toolCalls?.map((tc) => ({
				...tc,
				result: results.get(tc.id) ?? null
			}))
		}));
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
	if (!browser) {
		return createChatSession(initialSession, initialMessages);
	}
	if (!activeSession) {
		activeSession = createChatSession(initialSession, initialMessages);
	} else if (initialSession && activeSession.sessionId !== initialSession) {
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
		AgentService.recoverMessages(sid).catch(() => {});

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

	if (browser && sessionId) {
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
