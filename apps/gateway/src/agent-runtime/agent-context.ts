import { remult } from "remult";
import { ChatMessage } from "@stratum/shared/entities/chat-message.js";
import type { Context, Message } from "./types.js";
import type { AgentConfig } from "./types.js";
import { toolRegistry } from "./agent-tools.js";

export async function buildContext(
  sessionId: string,
  config: AgentConfig,
  prompt: string,
): Promise<Context> {
  // Fetch up to 200 recent messages (generous, since contextWindow now
  // represents the model's token budget, not a message count).
  const MAX_MESSAGES = 200;
  const prevMessages = await remult.repo(ChatMessage).find({
    where: { sessionId },
    orderBy: { sortOrder: "desc" },
    limit: MAX_MESSAGES,
  });
  prevMessages.reverse();

  const messages: Message[] = prevMessages
    .map((m) => {
      const ts = m.createdAt.getTime();
      if (m.role === "user") {
        return { role: "user" as const, content: m.content, timestamp: ts };
      }
      if (m.role === "assistant") {
        const content: Array<Record<string, unknown>> = [];
        if (m.content) {
          content.push({ type: "text" as const, text: m.content });
        }
        if (m.toolCalls && m.toolCalls.length > 0) {
          for (const tc of m.toolCalls) {
            content.push({
              type: "toolCall" as const,
              id: tc.id,
              name: tc.name,
              arguments: tc.args ?? {},
            });
          }
        }
        return { role: "assistant" as const, content, timestamp: ts };
      }
      if (m.role === "tool") {
        return {
          role: "toolResult" as const,
          toolCallId: m.toolCallId,
          toolName: m.toolName ?? "",
          content: [{ type: "text" as const, text: m.content }],
          isError: m.isError ?? false,
          timestamp: ts,
        };
      }
      return null;
    })
    .filter((m) => m !== null) as unknown as Message[];
  messages.push({ role: "user", content: prompt, timestamp: Date.now() });

  const allTools = toolRegistry.getPiAiTools();
  const toolNamesSet = new Set(config.toolNames);
  const tools = allTools.filter((t) => toolNamesSet.has(t.name));

  return {
    systemPrompt: config.systemPrompt ?? "",
    messages,
    tools,
  };
}

export async function persistToolResult(
  sessionId: string,
  tc: { id: string; name: string; result?: unknown; isError?: boolean },
  timestamp: number,
): Promise<void> {
  if (tc.result === undefined) return;
  await remult.repo(ChatMessage).insert({
    id: crypto.randomUUID(),
    sessionId,
    role: "tool",
    content:
      typeof tc.result === "string" ? tc.result : JSON.stringify(tc.result),
    toolCallId: tc.id,
    toolName: tc.name,
    isError: tc.isError ?? false,
    sortOrder: timestamp,
    createdAt: new Date(timestamp),
  });
}
