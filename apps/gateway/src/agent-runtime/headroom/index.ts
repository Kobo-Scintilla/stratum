/**
 * Headroom context compression — public API.
 *
 * Orchestrates proxy lifecycle and format conversion to compress
 * the conversation context before each model call.
 */

import { HeadroomClient, compress, type CompressResult } from "headroom-ai";
import type { OpenAIMessage } from "headroom-ai";
import type { Context, Message } from "../types.js";
import { ensureProxyRunning, BASE_URL } from "./proxy.js";
import { piToOpenAI, openAIToPi } from "./format-bridge.js";

// ─── Config ──────────────────────────────────────────────────────────

export interface HeadroomConfig {
  /** Master toggle — pass `false` to skip compression entirely. */
  enabled: boolean;
  /** Called with status messages for UI. */
  onStatus?: (msg: string) => void;
  /** Override model hint sent to the proxy (defaults to proxy-decided). */
  modelId?: string;
  /** Token budget — compress to fit within this limit. */
  contextWindow?: number;
  contentRouterEnabled?: boolean;
  summarizationEnabled?: boolean;
  summarizationModel?: string | null;
  ccrEnabled?: boolean;
}

// ─── Public API ───────────────────────────────────────────────────────

export { ensureProxyRunning, stopProxy } from "./proxy.js";
export { piToOpenAI, openAIToPi } from "./format-bridge.js";

export interface CompressContextResult {
  messages: Message[];
  tokensSaved: number;
  ratio: number;
}

/**
 * Compress context messages through the Headroom proxy.
 *
 * Returns `null` if compression is disabled, the proxy is unavailable,
 * or compression produces no benefit.
 */
export async function compressContext(
  context: Context,
  config: HeadroomConfig,
): Promise<CompressContextResult | null> {
  if (!config.enabled) return null;

  // Ensure proxy is up
  const healthy = await ensureProxyRunning(config.onStatus);
  if (!healthy) return null;

  // Convert pi-ai → OpenAI
  const openaiMessages = piToOpenAI(context.messages, context.systemPrompt);
  if (openaiMessages.length === 0) return null;

  try {
    const client = new HeadroomClient({
      baseUrl: BASE_URL,
      fallback: true,
      timeout: 15_000,
      config: {
        contentRouterEnabled: config.contentRouterEnabled,
        intelligentContext: {
          summarizationEnabled: config.summarizationEnabled,
          summarizationModel: config.summarizationModel,
        },
        ccr: {
          enabled: config.ccrEnabled,
        },
      },
    });

    const result: CompressResult = await compress(openaiMessages, {
      client,
      ...(config.modelId ? { model: config.modelId } : {}),
      ...(config.contextWindow && config.contextWindow > 0
        ? { tokenBudget: config.contextWindow }
        : {}),
      fallback: true,
    });

    if (!result.compressed || result.tokensSaved <= 0) return null;

    // Convert back
    const compressedMessages = openAIToPi(
      result.messages as OpenAIMessage[],
      context.messages,
      context.systemPrompt,
    );

    return {
      messages: compressedMessages,
      tokensSaved: result.tokensSaved,
      ratio: result.compressionRatio,
    };
  } catch {
    return null;
  }
}
