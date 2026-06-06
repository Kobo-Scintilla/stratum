import { BackendMethod, remult } from 'remult';
import { ActiveStream } from '../entities/active-stream';
import { ChatMessage } from '../entities/chat-message';
import { agentRegistry } from '../agents/registry';
import { buildContext } from '../agents/context';
import { runStreamLoop, insertActiveStream, insertUserMessage } from '../agents/stream';
export class AgentService {
	@BackendMethod({ allowed: true })
	static async ask(prompt: string, sessionId: string = 'default'): Promise<string> {
		const config = agentRegistry.get('assistant')!;
		await insertUserMessage(sessionId, prompt);
		const activeStream = await insertActiveStream(sessionId, prompt);
		const context = await buildContext(sessionId, config, prompt);

		try {
			await runStreamLoop(config, context, sessionId, activeStream.id);
		} catch (err) {
			console.error('[ask] stream error:', err);
		} finally {
			const sid = activeStream.id;
			globalThis.remultApi?.withRemult(undefined, async () => {
				await remult.repo(ActiveStream).delete(sid);
			}).catch(() => {});
		}

		return activeStream.id;
	}

	@BackendMethod({ allowed: true })
	static async clearHistory() {
		await remult.repo(ActiveStream).deleteMany({ where: 'all' });
		await remult.repo(ChatMessage).deleteMany({ where: 'all' });
	}

	@BackendMethod({ allowed: true, transactional: false })
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