import { remult } from 'remult';
import { AgentService } from '@opaius/shared/controllers/agent-service.js';
import { AppSettings } from '@opaius/shared/entities/app-settings.js';

export async function load({ fetch }) {
	remult.apiClient.httpClient = fetch;
	try {
		const [sessions, providers, configured, defaults] = await Promise.all([
			remult.call(AgentService.listSessions, undefined),
			remult.call(AgentService.getProvidersInfo, undefined),
			remult.call(AgentService.getConfiguredProviders, undefined),
			remult
				.repo(AppSettings)
				.findId('_defaults')
				.catch(() => null)
		]);

		return {
			sessions,
			providers: providers as Array<{
				id: string;
				envKeys: string[];
				models: Array<{ id: string; contextWindow: number }>;
				isCustom: boolean;
			}>,
			configured: configured as Array<{ id: string; enabled: boolean; hasKey: boolean }>,
			defaults: defaults
				? {
						defaultModelProvider: defaults.defaultModelProvider,
						defaultModelId: defaults.defaultModelId,
						defaultThinkingLevel: defaults.defaultThinkingLevel,
						defaultHeadroomEnabled: defaults.defaultHeadroomEnabled ?? true
					}
				: null
		};
	} catch (e) {
		console.error('[layout.server] load failed:', e);
		return { sessions: [], providers: [], configured: [], defaults: null };
	}
}
