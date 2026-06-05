// TODO(eval-seed): benchmark fixture — safe to ignore
import { BackendMethod, remult } from 'remult';
import { ActiveStream } from './entities/ActiveStream';
import { ChatMessage } from './entities/ChatMessage';
import { FlueSessionStore } from './FlueSessionStore';
import { FlueSession } from './entities/FlueSession';

const FLUSH_INTERVAL_MS = 150;

function genId(): string {
	return crypto.randomUUID();
}

// Build Flue's internal storage key from our session ID
function flueStorageKey(sessionId: string): string {
	return `agent-session:${JSON.stringify([sessionId, 'default', 'default'])}`;
}

// Derive ChatMessage rows from Flue's session DAG.
// Idempotent: skips entries already present in chatMessages.
// Safe to call mid-session or on recovery.
async function deriveMessages(sessionId: string): Promise<void> {
	const store = new FlueSessionStore();
	const raw = await store.load(flueStorageKey(sessionId));
	if (!raw) return;

	const entries = raw.entries as Array<Record<string, unknown>>;
	if (!Array.isArray(entries)) return;

	const msgRepo = remult.repo(ChatMessage);

	// Reconstruct active path (leafId → parentId chain, then reverse)
	const byId = new Map<string, Record<string, unknown>>();
	for (const e of entries) {
		byId.set(e.id as string, e);
	}

	const leafId = raw.leafId as string | null;
	if (!leafId) return;

	const path: Array<Record<string, unknown>> = [];
	let cur: Record<string, unknown> | undefined = byId.get(leafId);
	while (cur) {
		path.push(cur);
		cur = cur.parentId ? byId.get(cur.parentId as string) : undefined;
	}
	path.reverse();

	// Process message entries in active-path order
	for (let i = 0; i < path.length; i++) {
		const entry = path[i];
		if (entry.type !== 'message') continue;

		const msg = entry.message as Record<string, unknown> | undefined;
		if (!msg) continue;

		const role = msg.role as string;
		if (!role) continue;

		const entryId = entry.id as string;

		// Skip if already derived
		const existing = await msgRepo.findId(entryId);
		if (existing) continue;

		// Extract text from content (string or content blocks)
		const rawContent = msg.content;
		let textContent = '';
		const toolCalls: Array<{ id: string; name: string; args: unknown }> = [];

		if (typeof rawContent === 'string') {
			textContent = rawContent;
		} else if (Array.isArray(rawContent)) {
			for (const block of rawContent) {
				const b = block as Record<string, unknown>;
				if (b.type === 'text') {
					textContent += (b.text as string) ?? '';
				} else if (b.type === 'toolCall') {
					toolCalls.push({
						id: (b.id as string) ?? genId(),
						name: (b.name as string) ?? 'unknown',
						args: b.arguments
					});
				}
			}
		}

		const timestamp = (entry.timestamp as string) ?? new Date().toISOString();
		const sortOrder = new Date(timestamp).getTime();

		// Map Flue role to ChatMessage role
		let chatRole: 'user' | 'assistant' | 'tool';
		if (role === 'toolResult' || role === 'tool') {
			chatRole = 'tool';
		} else if (role === 'assistant') {
			chatRole = 'assistant';
		} else {
			chatRole = 'user';
		}

		const chatMsg: Partial<ChatMessage> = {
			id: entryId,
			sessionId,
			role: chatRole,
			content: textContent,
			sortOrder,
			createdAt: new Date(timestamp)
		};

		if (chatRole === 'assistant' && toolCalls.length > 0) {
			chatMsg.toolCalls = toolCalls;
		}

		if (chatRole === 'tool') {
			chatMsg.toolCallId = (msg.toolCallId as string) ?? undefined;
			chatMsg.toolName = (msg.toolName as string) ?? undefined;
			chatMsg.toolResult = textContent;
			chatMsg.isError = (msg.isError as boolean) ?? false;
		}

		await msgRepo.insert(chatMsg as ChatMessage);
	}
}

export class AgentService {
	@BackendMethod({ allowed: true })
	static async ask(prompt: string): Promise<string> {
		if (!flue) throw new Error('Flue not initialized');

		const runInContext = async (fn: () => Promise<void>) => {
			if (remultApi) {
				await remultApi.withRemult(undefined, fn);
			} else {
				await fn();
			}
		};

		const activeRepo = remult.repo(ActiveStream);
		const sessionId = 'default';

		// 1. Insert user message directly for instant UI feedback
		await runInContext(async () => {
			await deriveMessages(sessionId);
		});

		// 2. Insert ActiveStream for streaming UI progress
		let stream: ActiveStream;
		await runInContext(async () => {
			stream = await activeRepo.insert({
				id: genId(),
				prompt,
				text: '',
				isGenerating: true,
				createdAt: new Date(),
				toolCalls: []
			});
		});

		// 3. Invoke flue agent and process events
		const eventStream = flue.agents.invoke('assistant', sessionId, {
			mode: 'stream',
			payload: { message: prompt }
		});

		let accumulatedText = '';
		let toolCalls: Array<{ id: string; name: string; args: unknown; result?: unknown; isError?: boolean }> = [];

		const saveStream = async () => {
			await runInContext(async () => {
				await activeRepo.save({
					...stream!,
					text: accumulatedText,
					toolCalls: toolCalls.map((t) => ({ ...t }))
				});
			});
		};

		try {
			let lastFlushTime = Date.now();

			for await (const event of eventStream) {
				switch (event.type) {
					case 'text_delta': {
						accumulatedText += event.text;

						if (Date.now() - lastFlushTime > FLUSH_INTERVAL_MS) {
							await saveStream();
							lastFlushTime = Date.now();
						}
						break;
					}

					case 'tool_start':
					case 'tool_call':
					case 'tool_execution_start': {
						const tc = event as { toolCallId: string; toolName: string; args: unknown };
						let existing = toolCalls.find(t => t.id === tc.toolCallId);
						if (!existing) {
							toolCalls.push({
								id: tc.toolCallId,
								name: tc.toolName,
								args: tc.args
							});
							await saveStream();
						}
						break;
					}

					case 'tool_execution_end': {
						const tc = event as { toolCallId: string; toolName: string; result: unknown; isError: boolean };
						let existing = toolCalls.find(t => t.id === tc.toolCallId);
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
						}
						await saveStream();
						break;
					}

					case 'turn_end': {
						// Flue just saved the full turn to flueSessions.
						// Derive chatMessages from it (idempotent).
						await runInContext(async () => {
							await deriveMessages(sessionId);
						});
						await saveStream();
						break;
					}

					case 'error': {
						console.error('Agent event error:', event.error);
						break;
					}
				}
			}

			// Once the event loop finishes (meaning the workflow has resolved and written its state to flueSessions),
			// run deriveMessages to save the final history to ChatMessage.
			await runInContext(async () => {
				await deriveMessages(sessionId);
			});
		} catch (err) {
			console.error('Agent stream error:', err);
		} finally {
			// Delay deletion slightly so the frontend's ChatMessage liveQuery receives
			// the new history rows before the ActiveStream is removed.
			setTimeout(() => {
				runInContext(async () => {
					try {
						await activeRepo.delete(stream!.id);
					} catch (err) {
						console.error('Failed to delete active stream:', err);
					}
				});
			}, 800);
		}

		return stream!.id;
	}

	// Recovery: derive all messages from Flue sessions for the UI on page load
	@BackendMethod({ allowed: true })
	static async recoverMessages(sessionId: string): Promise<number> {
		await deriveMessages(sessionId);
		const count = await remult.repo(ChatMessage).count({ sessionId });
		return count;
	}

	@BackendMethod({ allowed: true })
	static async clearHistory() {
		const msgRepo = remult.repo(ChatMessage);
		const activeRepo = remult.repo(ActiveStream);
		const sessionRepo = remult.repo(FlueSession);

		await activeRepo.deleteMany({ where: 'all' });
		await msgRepo.deleteMany({ where: 'all' });
		await sessionRepo.deleteMany({ where: 'all' });
	}
}
