import { remult } from 'remult';
import { AgentService } from '@opaius/shared/controllers/agent-service.js';

export async function load() {
	try {
		const sessions = await remult.call(AgentService.listSessions, undefined);
		return { sessions };
	} catch (e) {
		console.error('[layout.server] listSessions failed:', e);
		return { sessions: [] };
	}
}
