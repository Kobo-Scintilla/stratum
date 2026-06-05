import { BackendMethod, remult } from 'remult';
import { ActiveStream } from './entities/ActiveStream';
import { ChatMessage } from './entities/ChatMessage';
import { FlueSession } from './entities/FlueSession';

const FLUSH_INTERVAL_MS = 1;

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
	const repo = remult.repo(FlueSession);
	const row = await repo.findId(flueStorageKey(sessionId));
	if (!row) return;
	const raw = JSON.parse(row.data) as {
		version: number;
		entries: unknown[];
		leafId: string | null;
	} | null;
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
		await processFlueEntry(path[i], msgRepo, sessionId);
	}
}

async function processFlueEntry(
	entry: Record<string, unknown>,
	msgRepo: ReturnType<typeof remult.repo<ChatMessage>>,
	sessionId: string
): Promise<void> {
	if (entry.type !== 'message') return;

	const msg = entry.message as Record<string, unknown> | undefined;
	if (!msg) return;

	const role = msg.role as string;
	if (!role) return;

	const entryId = entry.id as string;

	// Skip if already derived
	const existing = await msgRepo.findId(entryId);
	if (existing) return;

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

export class AgentService {
	@BackendMethod({ allowed: true })
	static async ask(prompt: string, sessionId: string = 'default'): Promise<string> {
		if (!globalThis.flue) throw new Error('Flue not initialized');

		const runInContext = async (fn: () => Promise<void>) => {
			if (remultApi) {
				await remultApi.withRemult(undefined, fn);
			} else {
				await fn();
			}
		};

		const msgRepo = remult.repo(ChatMessage);
		const activeRepo = remult.repo(ActiveStream);

		// 1. Insert user message directly for instant UI
		const userMsgId = genId();
		await runInContext(async () => {
			await msgRepo.insert({
				id: userMsgId,
				sessionId,
				role: 'user',
				content: prompt,
				sortOrder: Date.now(),
				createdAt: new Date()
			});
		});

		// 2. Insert ActiveStream for streaming UI progress
		let stream: ActiveStream;
		await runInContext(async () => {
			stream = await activeRepo.insert({
				id: genId(),
				sessionId,
				prompt,
				text: '',
				isGenerating: true,
				createdAt: new Date(),
				toolCalls: []
			});
		});

		// 3. Invoke flue agent and process events
		const eventStream = globalThis.flue!.agents.invoke('assistant', sessionId, {
			mode: 'stream',
			payload: { message: prompt }
		});

		let accumulatedText = '';
		let lastWasTool = false;
		let lastToolEndTime = 0;
		let toolCalls: Array<{
			id: string; name: string; args: unknown; result?: unknown; isError?: boolean;
		}> = [];
		let segments: ActiveStream['segments'] = [];

		const saveStream = async () => {
			await runInContext(async () => {
				await activeRepo.save({
					...stream!,
					text: accumulatedText,
					toolCalls: toolCalls.map((t) => ({ ...t })),
					segments
				});
			});
		};

		const insertAssistantMsg = async (text: string, calls: typeof toolCalls, timestamp: number) => {
			await runInContext(async () => {
				await msgRepo.insert({
					id: genId(),
					sessionId,
					role: 'assistant',
					content: text,
					toolCalls: calls.length > 0 ? calls.map((t) => ({ id: t.id, name: t.name, args: t.args })) : undefined,
					sortOrder: timestamp,
					createdAt: new Date(timestamp)
				});
			});
		};

		const insertToolResultMsg = async (tc: typeof toolCalls[0], timestamp: number) => {
			if (tc.result === undefined) return;
			await runInContext(async () => {
				await msgRepo.insert({
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
			});
		};

		try {
			let lastFlushTime = Date.now();
			let turnAccumulatedText = '';
			let turnToolCalls: typeof toolCalls = [];

			for await (const event of eventStream) {
			switch (event.type) {
					case 'text_delta': {
						const t = event.text as string;
						if (!t) break; // skip empty deltas
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
							await saveStream();
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
							await saveStream();
						}
						break;
					}

					case 'tool_execution_end': {
						const tc = event as { toolCallId: string; toolName: string; result: unknown; isError: boolean };
						let existing = toolCalls.find((t) => t.id === tc.toolCallId);
						if (existing) {
							existing.result = tc.result;
							existing.isError = tc.isError;
						} else {
							toolCalls.push({ id: tc.toolCallId, name: tc.toolName, args: undefined, result: tc.result, isError: tc.isError });
							segments.push({ type: 'tool', toolCallId: tc.toolCallId, toolName: tc.toolName, args: undefined, result: tc.result as unknown, isError: tc.isError as boolean });
						}
						const seg = segments.find((s) => s.type === 'tool' && s.toolCallId === tc.toolCallId);
						if (seg && seg.type === 'tool') {
							seg.result = tc.result as unknown;
							seg.isError = tc.isError as boolean;
						}
						lastToolEndTime = Date.now();
						await insertToolResultMsg(
							toolCalls.find((t) => t.id === tc.toolCallId) ?? { id: tc.toolCallId, name: tc.toolName, args: undefined, result: tc.result, isError: tc.isError },
							Date.now()
						);
						await saveStream();
						break;
					}
					case 'turn_end': {
						// Finalize this turn and clear the ActiveStream in a single
						// transaction so both live queries fire atomically — no flicker.
						await runInContext(async () => {
							if (turnAccumulatedText || turnToolCalls.length > 0) {
								await msgRepo.insert({
									id: genId(),
									sessionId,
									role: 'assistant',
									content: turnAccumulatedText,
									toolCalls: turnToolCalls.length > 0
										? turnToolCalls.map((t) => ({ id: t.id, name: t.name, args: t.args }))
										: undefined,
									sortOrder: Date.now(),
									createdAt: new Date()
								});
							}
							turnAccumulatedText = '';
							turnToolCalls = [];
							accumulatedText = '';
							toolCalls = [];
							segments = [];
							await activeRepo.save({ ...stream!, text: '', toolCalls: [], segments: [] });
						});
						break;
					}

					case 'error': {
						console.error('Agent event error:', event.error);
						break;
					}
				}
			}

			// Finalize: insert any remaining turn
			if (turnAccumulatedText || turnToolCalls.length > 0) {
				await insertAssistantMsg(turnAccumulatedText, turnToolCalls, Date.now());
			}
		} catch (err) {
			console.error('Agent stream error:', err);
		} finally {
			await runInContext(async () => {
				try {
					await activeRepo.delete(stream!.id);
				} catch {
					// ignore if already gone
				}
			});
		}

		return stream!.id;
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

	// Recovery: derive all messages from Flue sessions for the UI on page load.
	// Clears any messages inserted directly by ask() so deriveMessages can
	// re-create everything from Flue's authoritative session DAG.
	@BackendMethod({ allowed: true })
	static async recoverMessages(sessionId: string): Promise<number> {
		const msgRepo = remult.repo(ChatMessage);
		await msgRepo.deleteMany({ where: { sessionId } });
		await deriveMessages(sessionId);
		return await msgRepo.count({ sessionId });
	}

	@BackendMethod({ allowed: true })
	static async listSessions(): Promise<{ sessionId: string; createdAt: string; preview: string }[]> {
		const msgs = await remult.repo(ChatMessage).find({
			orderBy: { sessionId: 'asc', sortOrder: 'asc' }
		});
		const seen = new Map<string, { createdAt: Date; content: string }>();
		for (const m of msgs) {
			if (!seen.has(m.sessionId)) {
				seen.set(m.sessionId, { createdAt: m.createdAt, content: m.content.slice(0, 120) });
			}
		}
		return [...seen.entries()]
			.map(([sessionId, v]) => ({
				sessionId,
				createdAt: v.createdAt.toISOString(),
				preview: v.content
			}))
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	}
}
