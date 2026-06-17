import { remult } from "remult";
import { getModel, streamSimple } from "@earendil-works/pi-ai";
import { ActiveStream } from "@stratum/shared/entities/active-stream.js";
import { ChatMessage } from "@stratum/shared/entities/chat-message.js";
import { ProviderSetting } from "@stratum/shared/entities/provider-setting.js";
import type { TrackedToolCall } from "./types.js";

export interface CustomModel {
  id: string;
  name: string;
  api: string;
  provider: string;
  baseUrl: string;
  reasoning: boolean;
  input: string[];
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  contextWindow: number;
  maxTokens: number;
}

export async function buildCustomModel(
  providerId: string,
  modelId: string,
): Promise<CustomModel | undefined> {
  const settings = await remult.repo(ProviderSetting).findId(providerId);
  if (!settings?.baseUrl) return undefined;

  const apiType = settings.apiType ?? "openai-completions";
  return {
    id: modelId,
    name: modelId,
    api: apiType,
    provider: providerId,
    baseUrl: settings.baseUrl,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 4096,
    maxTokens: 4096,
  };
}

export async function updateActiveStream(
  stream: ActiveStream,
  text: string,
  toolCalls: ActiveStream["toolCalls"],
  segments: ActiveStream["segments"],
): Promise<void> {
  await remult.repo(ActiveStream).update(stream.id, {
    text,
    toolCalls: toolCalls.map((t) => ({ ...t })),
    segments,
  });
}

export async function insertAssistantMessage(
  sessionId: string,
  ownerId: string,
  text: string,
  toolCalls: TrackedToolCall[],
  sortOrder: number,
  inputTokens = 0,
  outputTokens = 0,
  cacheReadTokens = 0,
  cacheWriteTokens = 0,
  contextMessages = 0,
  usageCost = 0,
  headroomTokensSaved = 0,
  headroomRatio = 1,
  checkpointHash?: string,
): Promise<ChatMessage> {
  return await remult.repo(ChatMessage).insert({
    id: crypto.randomUUID(),
    sessionId,
    ownerId,
    role: "assistant",
    content: text,
    toolCalls:
      toolCalls.length > 0
         ? toolCalls.map((t) => ({ id: t.id, name: t.name, args: t.args }))
         : undefined,
    sortOrder,
    createdAt: new Date(sortOrder),
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    contextMessages,
    usageCost,
    headroomTokensSaved,
    headroomRatio,
    checkpointHash,
  });
}

export async function insertActiveStream(
  sessionId: string,
  prompt: string,
): Promise<ActiveStream> {
  return await remult.repo(ActiveStream).insert({
    id: crypto.randomUUID(),
    sessionId,
    prompt,
    text: "",
    isGenerating: true,
    createdAt: new Date(),
    toolCalls: [],
  });
}

export async function insertUserMessage(
  sessionId: string,
  ownerId: string,
  content: string,
): Promise<void> {
  await remult.repo(ChatMessage).insert({
    id: crypto.randomUUID(),
    sessionId,
    ownerId,
    role: "user",
    content,
    sortOrder: Date.now(),
    createdAt: new Date(),
  });
}

export async function generateTitleSummary(
  provider: string,
  modelId: string,
  userPrompt: string,
): Promise<string> {
  const builtinModel = getModel(provider as never, modelId as never);
  const model = builtinModel ?? (await buildCustomModel(provider, modelId));
  if (!model) {
    throw new Error(`Summary model not found: ${provider}/${modelId}`);
  }

  const context = {
    systemPrompt:
      'You are a session title summarizer. Summarize the user\'s initial prompt into a clean, concise, title-cased session title of 2 to 5 words. Do not use quotes, markdown formatting, or prefixing like "Title:". Respond ONLY with the title itself.',
    messages: [
      {
        role: "user" as const,
        content: [{ type: "text" as const, text: userPrompt }],
        timestamp: Date.now(),
      },
    ],
    tools: [],
  };

  const eventStream = streamSimple(model, context, {});
  let title = "";
  for await (const event of eventStream) {
    if (event.type === "text_delta") {
      title += event.delta;
    }
  }
  return title.trim().replace(/^["']|["']$/g, ""); // strip any quotes
}
