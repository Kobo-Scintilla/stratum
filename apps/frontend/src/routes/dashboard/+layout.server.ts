import { remult } from 'remult';
import { AgentService } from '@opaius/shared/controllers/agent-service.js';
import { AppSettings } from '@opaius/shared/entities/app-settings.js';

export async function load({ fetch, cookies }) {
	remult.apiClient.httpClient = fetch;

	const raw = cookies.get('nav-active-tab');
	let activeTab = 'sessions';
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (parsed === 'sessions' || parsed === 'providers' || parsed === 'settings') {
				activeTab = parsed;
			}
		} catch {
			/* corrupt cookie */
		}
	}

	try {
		const [sessions, providers, configured, defaults, headroomFeatures] = await Promise.all([
			remult.call(AgentService.listSessions, undefined).catch(() => []),
			remult.call(AgentService.getProvidersInfo, undefined).catch(() => []),
			remult.call(AgentService.getConfiguredProviders, undefined).catch(() => []),
			remult
				.repo(AppSettings)
				.findId('_defaults')
				.catch(() => null),
			remult
				.call(AgentService.checkHeadroomFeatures, undefined)
				.catch(() => ({ codeInstalled: true, mlInstalled: true }))
		]);

		return {
			activeTab,
			sessions,
			providers: providers as Array<{
				id: string;
				envKeys: string[];
				models: Array<{ id: string; contextWindow: number }>;
				isCustom: boolean;
			}>,
			configured: configured as Array<{
				id: string;
				enabled: boolean;
				hasKey: boolean;
				baseUrl?: string;
				apiType?: string;
				models?: string;
			}>,
			defaults: defaults
				? {
						defaultModelProvider: defaults.defaultModelProvider,
						defaultModelId: defaults.defaultModelId,
						defaultThinkingLevel: defaults.defaultThinkingLevel,
						defaultHeadroomEnabled: defaults.defaultHeadroomEnabled ?? true,
						defaultHeadroomCodeAst: defaults.defaultHeadroomCodeAst ?? true,
						defaultHeadroomKompressModel: defaults.defaultHeadroomKompressModel ?? 'off',
						defaultHeadroomCcr: defaults.defaultHeadroomCcr ?? true,
						titleSummaryModelProvider: defaults.titleSummaryModelProvider ?? '',
						titleSummaryModelId: defaults.titleSummaryModelId ?? ''
					}
				: null,
			headroomFeatures
		};
	} catch (e) {
		console.error('[layout.server] load failed:', e);
		return {
			activeTab,
			sessions: [],
			providers: [],
			configured: [],
			defaults: null,
			headroomFeatures: { codeInstalled: true, mlInstalled: true }
		};
	}
}
