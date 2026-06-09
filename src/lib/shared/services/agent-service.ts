import { BackendMethod, remult, SqlDatabase } from 'remult';
import { ActiveStream } from '../entities/active-stream';
import { ChatMessage } from '../entities/chat-message';
import { ProviderSetting } from '../entities/provider-setting';
import { ChatSessionSettings } from '../entities/chat-session-settings';
import { agentRegistry } from '../agent-runtime/agent-registry';
import { buildContext } from '../agent-runtime/agent-context';
import {
	runStreamLoop,
	insertActiveStream,
	insertUserMessage
} from '../agent-runtime/agent-stream';

let encryption: { encrypt(s: string): string; decrypt(s: string): string } | null = null;

async function getEncryption() {
	if (!encryption) {
		encryption = await import('$lib/server/encryption');
	}
	return encryption;
}

export class AgentService {
	@BackendMethod({ allowed: true, transactional: false })
	static async ask(prompt: string, sessionId: string = 'default'): Promise<string> {
		// 1. Fetch session settings first
		const sessionSettings = await remult.repo(ChatSessionSettings).findId(sessionId);
		const baseConfig = agentRegistry.get('assistant')!;
		const config = {
			...baseConfig,
			modelProvider: sessionSettings?.modelProvider ?? baseConfig.modelProvider,
			modelId: sessionSettings?.modelId ?? baseConfig.modelId,
			contextWindow: sessionSettings?.contextWindow ?? 20
		};

		// 2. Validate provider is selected
		if (!config.modelProvider || !config.modelId) {
			throw new Error('No model selected. Open the sidebar, configure a provider with an API key, then select a model.');
		}

		// 3. Populate process.env with configured provider API keys
		const providerSettings = await remult.repo(ProviderSetting).find({ where: { enabled: true } });
		const { findEnvKeys } = await import('@earendil-works/pi-ai');
		const enc = await getEncryption();
		let configuredCount = 0;
		for (const setting of providerSettings) {
			if (setting.apiKey) {
				const decrypted = enc.decrypt(setting.apiKey);
				configuredCount++;
				if (setting.baseUrl) {
					const apiKeyEnv =
						setting.apiType === 'anthropic-messages' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
					process.env[apiKeyEnv] = decrypted;
				} else {
					const envKeys = findEnvKeys(setting.id) ?? [];
					for (const envKey of envKeys) {
						process.env[envKey] = decrypted;
					}
				}
			}
		}

		// 4. Validate the selected provider has an API key
		const selectedSetting = providerSettings.find((s) => s.id === config.modelProvider);
		if (!selectedSetting?.apiKey) {
			if (configuredCount === 0) {
				throw new Error('No API keys configured. Open the sidebar, add a provider, and enter your API key.');
			}
			throw new Error(
				`Provider "${config.modelProvider}" has no API key configured. Add its key in the sidebar providers.`
			);
		}

		await insertUserMessage(sessionId, prompt);
		const activeStream = await insertActiveStream(sessionId, prompt);
		const context = await buildContext(sessionId, config, prompt);

		try {
			await runStreamLoop(config, context, sessionId, activeStream.id);
		} catch (err) {
			console.error('[ask] stream error:', err);
		} finally {
			setTimeout(() => {
				remult
					.repo(ActiveStream)
					.delete(activeStream.id)
					.catch(() => {});
			}, 800);
		}

		return sessionId;
	}

	@BackendMethod({ allowed: true, transactional: false })
	static async getProvidersInfo() {
		const { getProviders, getModels, findEnvKeys } = await import('@earendil-works/pi-ai');
		const providers = getProviders();
		const builtins = providers.map((p) => {
			const envKeys = findEnvKeys(p) ?? [];
			const models = getModels(p).map((m) => m.id);
			return {
				id: p,
				envKeys,
				models,
				isCustom: false as const
			};
		});

		// Merge custom providers from DB
		const customSettings = await remult.repo(ProviderSetting).find({
			where: { baseUrl: { $ne: null } as any }
		});

		const customProviders = customSettings
			.filter((s) => s.baseUrl)
			.map((s) => ({
				id: s.id,
				envKeys: [`CUSTOM_${s.id}_API_KEY`],
				models: s.models ? s.models.split(',').map((m) => m.trim()) : [],
				isCustom: true as const
			}));

		return [...builtins, ...customProviders];
	}

	@BackendMethod({ allowed: true, transactional: false })
	static async getProviderApiKeys(): Promise<Record<string, string>> {
		const settings = await remult.repo(ProviderSetting).find();
		const enc = await getEncryption();
		const keys: Record<string, string> = {};
		for (const s of settings) {
			if (s.apiKey) {
				try {
					keys[s.id] = enc.decrypt(s.apiKey);
				} catch {
					// If decryption fails, return as-is (migration fallback)
					keys[s.id] = s.apiKey;
				}
			}
		}
		return keys;
	}

	@BackendMethod({ allowed: true })
	static async saveProviderKey(providerId: string, apiKey: string): Promise<void> {
		const enc = await getEncryption();
		const encrypted = apiKey ? enc.encrypt(apiKey) : '';
		const existing = await remult.repo(ProviderSetting).findId(providerId);
		if (existing) {
			existing.apiKey = encrypted;
			await remult.repo(ProviderSetting).save(existing);
		} else {
			await remult.repo(ProviderSetting).insert({
				id: providerId,
				apiKey: encrypted,
				enabled: true
			});
		}
	}

	@BackendMethod({ allowed: true, transactional: false })
	static async saveCustomProvider(
		providerId: string,
		apiKey: string,
		baseUrl: string,
		apiType: string,
		models: string[]
	): Promise<void> {
		const enc = await getEncryption();
		const encrypted = apiKey ? enc.encrypt(apiKey) : '';
		await remult.repo(ProviderSetting).save({
			id: providerId,
			apiKey: encrypted,
			baseUrl,
			apiType,
			models: models.join(',')
		});
	}

	@BackendMethod({ allowed: true })
	static async deleteProviderKey(providerId: string): Promise<void> {
		await remult.repo(ProviderSetting).delete(providerId);
	}

	@BackendMethod({ allowed: true, transactional: false })
	static async getConfiguredProviders(): Promise<
		Array<{ id: string; enabled: boolean; hasKey: boolean; baseUrl?: string; apiType?: string; models?: string }>
	> {
		const settings = await remult.repo(ProviderSetting).find();
		return settings.map((s) => ({
			id: s.id,
			enabled: s.enabled,
			hasKey: !!s.apiKey,
			baseUrl: s.baseUrl,
			apiType: s.apiType,
			models: s.models
		}));
	}

	@BackendMethod({ allowed: true })
	static async addProvider(providerId: string): Promise<void> {
		await remult.repo(ProviderSetting).save({
			id: providerId,
			apiKey: '',
			enabled: true
		});
	}

	@BackendMethod({ allowed: true })
	static async toggleProvider(providerId: string, enabled: boolean): Promise<void> {
		const setting = await remult.repo(ProviderSetting).findId(providerId);
		if (setting) {
			setting.enabled = enabled;
			await remult.repo(ProviderSetting).save(setting);
		}
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

	@BackendMethod({ allowed: true, transactional: false })
	static async listSessions() {
		const sql = SqlDatabase.getDb();
		const result = await sql.execute(`
			SELECT sessionId, content, createdAt
			FROM chatMessages m
			WHERE sortOrder = (
				SELECT min(sortOrder)
				FROM chatMessages m2
				WHERE m2.sessionId = m.sessionId
			)
			ORDER BY createdAt DESC
		`);
		return result.rows.map((r: any) => ({
			sessionId: r.sessionId,
			createdAt: new Date(r.createdAt).toISOString(),
			preview: String(r.content ?? '').slice(0, 120)
		}));
	}
}
