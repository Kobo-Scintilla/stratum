import { BackendMethod, remult, SqlDatabase } from "remult";
import { ActiveStream } from "@stratum/shared/entities/active-stream.js";
import { ChatMessage } from "@stratum/shared/entities/chat-message.js";
import { ProviderSetting } from "@stratum/shared/entities/provider-setting.js";
import { ChatSessionSettings } from "@stratum/shared/entities/chat-session-settings.js";
import { getProviders, getModels, findEnvKeys } from "@earendil-works/pi-ai";
import { agentRegistry } from "./agent-runtime/agent-registry.js";
import { buildContext } from "./agent-runtime/agent-context.js";
import {
  runStreamLoop,
} from "./agent-runtime/agent-stream.js";
import {
  insertActiveStream,
  insertUserMessage,
  generateTitleSummary,
} from "./agent-runtime/agent-stream-helpers.js";
import { AppSettings } from "@stratum/shared/entities/app-settings.js";
import { encrypt, decrypt } from "./encryption.js";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { VENV_PYTHON } from "./agent-runtime/headroom/proxy.js";

function getEncryption() {
  return { encrypt, decrypt };
}

/**
 * Map a provider ID to the environment variable names pi-ai checks for its API key.
 * Mirrors pi-ai's internal `getApiKeyEnvVars` (not exported).
 */
const API_KEY_ENV_MAP: Record<string, string[]> = {
  "github-copilot": ["COPILOT_GITHUB_TOKEN"],
  anthropic: ["ANTHROPIC_OAUTH_TOKEN", "ANTHROPIC_API_KEY"],
  "ant-ling": ["ANT_LING_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  "azure-openai-responses": ["AZURE_OPENAI_API_KEY"],
  nvidia: ["NVIDIA_API_KEY"],
  deepseek: ["DEEPSEEK_API_KEY"],
  google: ["GEMINI_API_KEY"],
  "google-vertex": ["GOOGLE_CLOUD_API_KEY"],
  groq: ["GROQ_API_KEY"],
  cerebras: ["CEREBRAS_API_KEY"],
  xai: ["XAI_API_KEY"],
  openrouter: ["OPENROUTER_API_KEY"],
  "vercel-ai-gateway": ["AI_GATEWAY_API_KEY"],
  zai: ["ZAI_API_KEY"],
  "zai-coding-cn": ["ZAI_CODING_CN_API_KEY"],
  mistral: ["MISTRAL_API_KEY"],
  minimax: ["MINIMAX_API_KEY"],
  "minimax-cn": ["MINIMAX_CN_API_KEY"],
  moonshotai: ["MOONSHOT_API_KEY"],
  "moonshotai-cn": ["MOONSHOT_API_KEY"],
  huggingface: ["HF_TOKEN"],
  fireworks: ["FIREWORKS_API_KEY"],
  together: ["TOGETHER_API_KEY"],
  opencode: ["OPENCODE_API_KEY"],
  "opencode-go": ["OPENCODE_API_KEY"],
  "kimi-coding": ["KIMI_API_KEY"],
  "cloudflare-workers-ai": ["CLOUDFLARE_API_KEY"],
  "cloudflare-ai-gateway": ["CLOUDFLARE_API_KEY"],
  xiaomi: ["XIAOMI_API_KEY"],
  "xiaomi-token-plan-cn": ["XIAOMI_TOKEN_PLAN_CN_API_KEY"],
  "xiaomi-token-plan-ams": ["XIAOMI_TOKEN_PLAN_AMS_API_KEY"],
  "xiaomi-token-plan-sgp": ["XIAOMI_TOKEN_PLAN_SGP_API_KEY"],
};

function getApiKeyEnvVars(providerId: string): string[] {
  const known = API_KEY_ENV_MAP[providerId];
  if (known) return known;
  // Fallback: convention <PROVIDER_ID>_API_KEY
  return [`${providerId.replace(/-/g, "_").toUpperCase()}_API_KEY`];
}
/**
 * Resolve whether headroom compression is enabled for a session.
 *
 * Priority: session setting > app default > true (sensible fallback).
 * Extracted as a pure function for testability.
 */
export function resolveHeadroomEnabled(
  sessionSettings?: { headroomEnabled?: boolean } | null,
  appSettings?: { defaultHeadroomEnabled?: boolean } | null,
): boolean {
  if (sessionSettings?.headroomEnabled != null)
    return sessionSettings.headroomEnabled;
  if (appSettings?.defaultHeadroomEnabled != null)
    return appSettings.defaultHeadroomEnabled;
  return true;
}

export function resolveHeadroomCodeAst(
  sessionSettings?: { headroomCodeAst?: boolean } | null,
  appSettings?: { defaultHeadroomCodeAst?: boolean } | null,
): boolean {
  if (sessionSettings?.headroomCodeAst != null)
    return sessionSettings.headroomCodeAst;
  if (appSettings?.defaultHeadroomCodeAst != null)
    return appSettings.defaultHeadroomCodeAst;
  return true;
}

export function resolveHeadroomKompressModel(
  sessionSettings?: { headroomKompressModel?: string } | null,
  appSettings?: { defaultHeadroomKompressModel?: string } | null,
): string {
  if (sessionSettings?.headroomKompressModel != null)
    return sessionSettings.headroomKompressModel;
  if (appSettings?.defaultHeadroomKompressModel != null)
    return appSettings.defaultHeadroomKompressModel;
  return "off";
}

export function resolveHeadroomCcr(
  sessionSettings?: { headroomCcr?: boolean } | null,
  appSettings?: { defaultHeadroomCcr?: boolean } | null,
): boolean {
  if (sessionSettings?.headroomCcr != null) return sessionSettings.headroomCcr;
  if (appSettings?.defaultHeadroomCcr != null)
    return appSettings.defaultHeadroomCcr;
  return true;
}

export class AgentService {
  @BackendMethod({ allowed: true, transactional: false })
  static async ask(
    prompt: string,
    sessionId: string = "default",
  ): Promise<string> {
    // 1. Fetch session settings first
    const sessionSettings = await remult
      .repo(ChatSessionSettings)
      .findId(sessionId);
    const appSettings = await remult
      .repo(AppSettings)
      .findId("_defaults")
      .catch(() => null);
    const baseConfig = agentRegistry.get("assistant")!;
    const config = {
      ...baseConfig,
      modelProvider:
        sessionSettings?.modelProvider ||
        appSettings?.defaultModelProvider ||
        baseConfig.modelProvider,
      modelId:
        sessionSettings?.modelId ||
        appSettings?.defaultModelId ||
        baseConfig.modelId,
      contextWindow: sessionSettings?.contextWindow ?? 0,
      thinkingLevel: sessionSettings?.thinkingLevel ?? "medium",
      headroomEnabled: resolveHeadroomEnabled(sessionSettings, appSettings),
      headroomCodeAst: resolveHeadroomCodeAst(sessionSettings, appSettings),
      headroomKompressModel: resolveHeadroomKompressModel(
        sessionSettings,
        appSettings,
      ),
      headroomCcr: resolveHeadroomCcr(sessionSettings, appSettings),
    };

    // 2. Validate provider is selected
    if (!config.modelProvider || !config.modelId) {
      throw new Error(
        "No model selected. Open the sidebar, configure a provider with an API key, then select a model.",
      );
    }

    // 3. Populate process.env with configured provider API keys
    const providerSettings = await remult
      .repo(ProviderSetting)
      .find({ where: { enabled: true } });
    const enc = getEncryption();
    let configuredCount = 0;
    for (const setting of providerSettings) {
      if (setting.apiKey) {
        const decrypted = enc.decrypt(setting.apiKey);
        configuredCount++;
        if (setting.baseUrl) {
          const apiKeyEnv =
            setting.apiType === "anthropic-messages"
              ? "ANTHROPIC_API_KEY"
              : "OPENAI_API_KEY";
          process.env[apiKeyEnv] = decrypted;
        } else {
          const envVars = getApiKeyEnvVars(setting.id);
          for (const envKey of envVars) {
            process.env[envKey] = decrypted;
          }
        }
      }
    }

    // 4. Validate the selected provider has an API key
    const selectedSetting = providerSettings.find(
      (s) => s.id === config.modelProvider,
    );
    if (!selectedSetting?.apiKey) {
      if (configuredCount === 0) {
        throw new Error(
          "No API keys configured. Open the sidebar, add a provider, and enter your API key.",
        );
      }
      throw new Error(
        `Provider "${config.modelProvider}" has no API key configured. Add its key in the sidebar providers.`,
      );
    }

    const isFirstMessage =
      (await remult.repo(ChatMessage).count({ sessionId })) === 0;

    await insertUserMessage(sessionId, prompt);

    if (isFirstMessage) {
      // Asynchronously generate title summary using Title Summary Model or session model in the background
      (async () => {
        try {
          const appSettings = await remult
            .repo(AppSettings)
            .findId("_defaults")
            .catch(() => null);
          const summaryProvider =
            appSettings?.titleSummaryModelProvider || config.modelProvider;
          const summaryModelId =
            appSettings?.titleSummaryModelId || config.modelId;

          if (summaryProvider && summaryModelId) {
            console.log(
              `[title-summary] Summarizing session title using ${summaryProvider}/${summaryModelId}...`,
            );
            const summary = await generateTitleSummary(
              summaryProvider,
              summaryModelId,
              prompt,
            );
            console.log(`[title-summary] Generated title: "${summary}"`);

            let sessionSettings = await remult
              .repo(ChatSessionSettings)
              .findId(sessionId);
            if (!sessionSettings) {
              sessionSettings = await remult.repo(ChatSessionSettings).insert({
                id: sessionId,
                modelProvider: config.modelProvider,
                modelId: config.modelId,
                contextWindow: 0,
                thinkingLevel: config.thinkingLevel ?? "medium",
                headroomEnabled: config.headroomEnabled ?? false,
                headroomCodeAst: config.headroomCodeAst ?? true,
                headroomKompressModel: config.headroomKompressModel ?? "off",
                headroomCcr: config.headroomCcr ?? true,
                title: summary,
              });
            } else {
              sessionSettings.title = summary;
              await remult.repo(ChatSessionSettings).save(sessionSettings);
            }
          }
        } catch (err) {
          console.error("[title-summary] Error generating title summary:", err);
        }
      })();
    }

    const activeStream = await insertActiveStream(sessionId, prompt);
    const context = await buildContext(sessionId, config, prompt);

    try {
      await runStreamLoop(config, context, sessionId, activeStream.id);
    } catch (err) {
      console.error("[ask] stream error:", err);
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
    const providers = getProviders();
    const builtins = providers.map((p) => {
      const envKeys = findEnvKeys(p) ?? [];
      const models = getModels(p).map((m) => ({
        id: m.id,
        contextWindow: m.contextWindow,
      }));
      return {
        id: p,
        envKeys,
        models,
        isCustom: false as const,
      };
    });

    // Merge custom providers from DB
    const customSettings = await remult.repo(ProviderSetting).find({
      where: { baseUrl: { $ne: null } } as unknown as Record<string, unknown>,
    });

    const customProviders = customSettings
      .filter((s) => s.baseUrl)
      .map((s) => ({
        id: s.id,
        envKeys: [`CUSTOM_${s.id}_API_KEY`],
        models: s.models
          ? s.models.split(",").map((m) => ({
              id: m.trim(),
              contextWindow: 128_000, // sensible default for unknown models
            }))
          : [],
        isCustom: true as const,
      }));

    return [...builtins, ...customProviders];
  }

  @BackendMethod({ allowed: true })
  static async saveProviderKey(
    providerId: string,
    apiKey: string,
  ): Promise<void> {
    const enc = getEncryption();
    const encrypted = apiKey ? enc.encrypt(apiKey) : "";
    const existing = await remult.repo(ProviderSetting).findId(providerId);
    if (existing) {
      existing.apiKey = encrypted;
      await remult.repo(ProviderSetting).save(existing);
    } else {
      await remult.repo(ProviderSetting).insert({
        id: providerId,
        apiKey: encrypted,
        enabled: true,
      });
    }
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async saveCustomProvider(
    providerId: string,
    apiKey: string,
    baseUrl: string,
    apiType: string,
    models: string[],
  ): Promise<void> {
    const enc = getEncryption();
    const encrypted = apiKey ? enc.encrypt(apiKey) : "";
    await remult.repo(ProviderSetting).save({
      id: providerId,
      apiKey: encrypted,
      baseUrl,
      apiType,
      models: models.join(","),
    });
  }

  @BackendMethod({ allowed: true })
  static async deleteProviderKey(providerId: string): Promise<void> {
    await remult.repo(ProviderSetting).delete(providerId);
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async getConfiguredProviders(): Promise<
    Array<{
      id: string;
      enabled: boolean;
      hasKey: boolean;
      baseUrl?: string;
      apiType?: string;
      models?: string;
    }>
  > {
    const settings = await remult.repo(ProviderSetting).find();
    return settings.map((s) => ({
      id: s.id,
      enabled: s.enabled,
      hasKey: !!s.apiKey,
      baseUrl: s.baseUrl,
      apiType: s.apiType,
      models: s.models,
    }));
  }

  @BackendMethod({ allowed: true })
  static async addProvider(providerId: string): Promise<void> {
    await remult.repo(ProviderSetting).save({
      id: providerId,
      apiKey: "",
      enabled: true,
    });
  }

  @BackendMethod({ allowed: true })
  static async toggleProvider(
    providerId: string,
    enabled: boolean,
  ): Promise<void> {
    const setting = await remult.repo(ProviderSetting).findId(providerId);
    if (setting) {
      setting.enabled = enabled;
      await remult.repo(ProviderSetting).save(setting);
    }
  }

  @BackendMethod({ allowed: true })
  static async clearHistory() {
    await remult.repo(ActiveStream).deleteMany({ where: "all" });
    await remult.repo(ChatMessage).deleteMany({ where: "all" });
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async recoverMessages(sessionId: string): Promise<number> {
    return await remult.repo(ChatMessage).count({ sessionId });
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async listSessions() {
    const sql = SqlDatabase.getDb();
    const result = await sql.execute(`
			SELECT m.sessionId, m.content, m.createdAt, s.title, s.pinned,
				(SELECT COUNT(*) FROM chatMessages m3 WHERE m3.sessionId = m.sessionId) as messageCount
			FROM chatMessages m
			LEFT JOIN chatSessionSettings s ON s.id = m.sessionId
			WHERE m.sortOrder = (
				SELECT min(sortOrder)
				FROM chatMessages m2
				WHERE m2.sessionId = m.sessionId
			)
			ORDER BY COALESCE(s.pinned, 0) DESC, m.createdAt DESC
		`);
    const rows = result.rows as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      sessionId: r.sessionId as string,
      createdAt: new Date(r.createdAt as string).toISOString(),
      lastMessage: String(r.content ?? "").slice(0, 120),
      title: r.title ? String(r.title) : undefined,
      pinned: !!r.pinned,
      messageCount: Number(r.messageCount ?? 0),
    }));
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async deleteSession(sessionId: string): Promise<void> {
    await Promise.all([
      remult.repo(ChatMessage).deleteMany({ where: { sessionId } }),
      remult.repo(ChatSessionSettings).deleteMany({ where: { id: sessionId } }),
      remult.repo(ActiveStream).deleteMany({ where: { sessionId } }),
    ]);
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async renameSession(sessionId: string, title: string): Promise<void> {
    let settings = await remult.repo(ChatSessionSettings).findId(sessionId);
    if (!settings) {
      settings = await remult.repo(ChatSessionSettings).insert({
        id: sessionId,
        title,
        modelProvider: "",
        modelId: "",
        contextWindow: 0,
        thinkingLevel: "medium",
        headroomEnabled: false,
        headroomCodeAst: true,
        headroomKompressModel: "off",
        headroomCcr: true,
      });
    } else {
      settings.title = title;
      await remult.repo(ChatSessionSettings).save(settings);
    }
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async togglePinSession(sessionId: string): Promise<boolean> {
    let settings = await remult.repo(ChatSessionSettings).findId(sessionId);
    if (!settings) {
      settings = await remult.repo(ChatSessionSettings).insert({
        id: sessionId,
        pinned: true,
        modelProvider: "",
        modelId: "",
        contextWindow: 0,
        thinkingLevel: "medium",
        headroomEnabled: false,
        headroomCodeAst: true,
        headroomKompressModel: "off",
        headroomCcr: true,
      });
      return true;
    } else {
      settings.pinned = !settings.pinned;
      await remult.repo(ChatSessionSettings).save(settings);
      return settings.pinned;
    }
  }

  private static cachedFeatures: {
    codeInstalled: boolean;
    mlInstalled: boolean;
  } | null = null;

  static invalidateHeadroomFeaturesCache() {
    AgentService.cachedFeatures = null;
  }

  @BackendMethod({ allowed: true, transactional: false })
  static async checkHeadroomFeatures(): Promise<{
    codeInstalled: boolean;
    mlInstalled: boolean;
  }> {
    if (AgentService.cachedFeatures) {
      return AgentService.cachedFeatures;
    }
    if (!existsSync(VENV_PYTHON)) {
      return { codeInstalled: false, mlInstalled: false };
    }
    let codeInstalled = false;
    let mlInstalled = false;
    try {
      execSync(
        `"${VENV_PYTHON}" -c "import tree_sitter, tree_sitter_language_pack"`,
        { stdio: "ignore" },
      );
      codeInstalled = true;
    } catch {
      // not installed
    }
    try {
      execSync(`"${VENV_PYTHON}" -c "import torch, transformers"`, {
        stdio: "ignore",
      });
      mlInstalled = true;
    } catch {
      // not installed
    }
    AgentService.cachedFeatures = { codeInstalled, mlInstalled };
    return AgentService.cachedFeatures;
  }

  @BackendMethod({ allowed: true, transactional: true })
  static async rollbackSessionToMessage(messageId: string): Promise<boolean> {
    const msg = await remult.repo(ChatMessage).findId(messageId);
    if (!msg || !msg.checkpointHash) {
      throw new Error("Message not found or has no rollback checkpoint");
    }

    try {
      const { rollbackToCheckpoint } = await import("./agent-runtime/git-checkpoint.js");
      rollbackToCheckpoint(msg.checkpointHash);

      // Delete the assistant message and subsequent messages in this session
      const sessionMsgs = await remult.repo(ChatMessage).find({
        where: {
          sessionId: msg.sessionId,
          sortOrder: { $gte: msg.sortOrder }
        }
      });
      for (const m of sessionMsgs) {
        await remult.repo(ChatMessage).delete(m.id);
      }
      return true;
    } catch (err) {
      console.error("Rollback failed:", err);
      return false;
    }
  }
}
