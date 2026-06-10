import { AgentService } from '$lib/shared/services/agent-service';

export async function load() {
	const sessions = await AgentService.listSessions();
	return { sessions };
}
