import { browser } from '$app/environment';
import { remult } from 'remult';
import { AgentService } from './AgentService';
import { ChatMessage } from './entities/ChatMessage';
import { ActiveStream } from './entities/ActiveStream';

export interface ChatSession {
	readonly sessionId: string | null;
	readonly messages: ChatMessage[];
	readonly activeStreams: ActiveStream[];
	readonly isSending: boolean;
	readonly error: string;
	switchSession(sessionId: string): void;
	send(prompt: string): Promise<void>;
	reset(): void;
	destroy(): void;
}

export function createChatSession(initialSession?: string): ChatSession {
	let sessionId = $state<string | null>(initialSession ?? null);
	let messages = $state<ChatMessage[]>([]);
	let activeStreams = $state<ActiveStream[]>([]);
	let isSending = $state(false);
	let error = $state('');

	let unsubs: (() => void)[] = [];

	async function subscribe(sid: string) {
		if (!sid) return;
		for (const u of unsubs) u();
		unsubs = [];

		await AgentService.recoverMessages(sid).catch(() => {});

		unsubs.push(
			remult
				.repo(ChatMessage)
				.liveQuery({ where: { sessionId: sid }, orderBy: { sortOrder: 'asc' as const } })
				.subscribe({ next: (info) => { messages = info.items; } })
		);
		unsubs.push(
			remult
				.repo(ActiveStream)
				.liveQuery({ where: { sessionId: sid }, orderBy: { createdAt: 'asc' as const } })
				.subscribe({ next: (info) => { activeStreams = info.items; } })
		);
	}

	// Only auto-subscribe on client-side with a known session
	if (browser && sessionId) {
		const initSid = sessionId;
		queueMicrotask(() => subscribe(initSid));
	}

	return {
		get sessionId() { return sessionId; },
		get messages() { return messages; },
		get activeStreams() { return activeStreams; },
		get isSending() { return isSending; },
		get error() { return error; },

		switchSession(newId: string) {
			sessionId = newId;
			subscribe(newId);
		},

		async send(prompt: string) {
			let sid = sessionId;
			if (!sid) {
				sid = crypto.randomUUID();
				sessionId = sid;
				subscribe(sid);
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
		},

		destroy() {
			for (const u of unsubs) u();
			unsubs = [];
		}
	};
}
