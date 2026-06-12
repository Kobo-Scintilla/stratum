/**
 * Pi-AI ↔ OpenAI message format conversion for Headroom compression.
 *
 * Headroom's compress() expects OpenAI chat message format. This module
 * converts pi-ai internal messages to OpenAI format before compression
 * and back to pi-ai format after compression.
 *
 * Transformations during pi-ai → OpenAI:
 *  - Prepend system prompt as `{ role: "system" }` message.
 *  - Strip ThinkingContent (opaque, not useful for compression).
 *  - Extract ToolCall from content array → `tool_calls` on message.
 *  - Rename role "toolResult" → "tool".
 *  - Flatten text content arrays to strings.
 *
 * Transformations during OpenAI → pi-ai:
 *  - Remove system message if present.
 *  - Positional alignment with original messages (preserve structural
 *    metadata like api, provider, usage).
 *  - Fall back to fresh message construction when counts differ
 *    (compression merged/dropped messages).
 *  - Preserve ThinkingContent from original assistant messages.
 */

import type {
  Message,
  UserMessage as PiUserMessage,
  AssistantMessage as PiAssistantMessage,
  ToolResultMessage as PiToolResultMessage,
  TextContent,
  ThinkingContent,
  ImageContent,
  ToolCall as PiToolCall,
} from "@earendil-works/pi-ai";
import type { OpenAIMessage, ToolCall as OpenAIToolCall } from "headroom-ai";

// ─── Pi-AI → OpenAI ──────────────────────────────────────────────────

/**
 * Convert pi-ai Message[] + systemPrompt to OpenAI format for headroom.
 */
export function piToOpenAI(
  messages: Message[],
  systemPrompt?: string,
): OpenAIMessage[] {
  const result: OpenAIMessage[] = [];

  if (systemPrompt) {
    result.push({ role: "system", content: systemPrompt });
  }

  for (const msg of messages) {
    switch (msg.role) {
      case "user":
        result.push(convertUser(msg));
        break;
      case "assistant":
        result.push(convertAssistant(msg));
        break;
      case "toolResult":
        result.push(convertToolResult(msg));
        break;
    }
  }

  return result;
}

function convertUser(msg: PiUserMessage): OpenAIMessage {
  if (typeof msg.content === "string") {
    return { role: "user", content: msg.content };
  }

  // Check if there are images
  const hasImages = msg.content.some((p) => p.type === "image");

  if (!hasImages) {
    const text = msg.content
      .filter((p): p is TextContent => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    return { role: "user", content: text };
  }

  // Mixed content with images → OpenAI content parts
  return {
    role: "user",
    content: msg.content.map((p) => {
      if (p.type === "text") {
        return { type: "text" as const, text: p.text };
      }
      if (p.type === "image") {
        const img = p as ImageContent;
        return {
          type: "image_url" as const,
          image_url: { url: `data:${img.mimeType};base64,${img.data}` },
        };
      }
      return { type: "text" as const, text: "" };
    }),
  } as OpenAIMessage;
}

function convertAssistant(msg: PiAssistantMessage): OpenAIMessage {
  // Text content (skip ThinkingContent)
  const textParts = msg.content.filter(
    (p): p is TextContent => p.type === "text",
  );
  const text = textParts.map((p) => p.text).join("");

  // Tool calls embedded in content
  const toolCalls = msg.content.filter(
    (p): p is PiToolCall => p.type === "toolCall",
  );

  const result: Record<string, unknown> = {
    role: "assistant",
    content: text || null,
  };

  if (toolCalls.length > 0) {
    result.tool_calls = toolCalls.map(
      (tc): OpenAIToolCall => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      }),
    );
  }

  return result as unknown as OpenAIMessage;
}

function convertToolResult(msg: PiToolResultMessage): OpenAIMessage {
  const text = msg.content
    .filter((p): p is TextContent => p.type === "text")
    .map((p) => p.text)
    .join("\n");

  return {
    role: "tool",
    content: text,
    tool_call_id: msg.toolCallId,
  };
}

// ─── OpenAI → Pi-AI ──────────────────────────────────────────────────

/**
 * Convert compressed OpenAI messages back to pi-ai Message[].
 *
 * Strategy: positional alignment with original messages.
 * - If counts match, copy structural metadata (api, provider, usage, etc.)
 *   from the original, take text from compressed.
 * - If counts differ (compression merged/dropped), build minimal fresh messages.
 */
export function openAIToPi(
  compressed: OpenAIMessage[],
  original: Message[],
  systemPrompt?: string,
): Message[] {
  const filtered = compressed.filter((m) => m.role !== "system");
  let lastOrigIdx = -1;

  return filtered.map((compMsg) => {
    let orig: Message | undefined;

    // 1. Precise match for tool message
    if (compMsg.role === "tool") {
      const tcId = compMsg.tool_call_id;
      const idx = original.findIndex(
        (o) => o.role === "toolResult" && o.toolCallId === tcId,
      );
      if (idx !== -1) {
        orig = original[idx];
        lastOrigIdx = idx;
      }
    }
    // 2. Precise match for assistant message with tool calls
    else if (
      compMsg.role === "assistant" &&
      (compMsg as any).tool_calls &&
      (compMsg as any).tool_calls.length > 0
    ) {
      const tcId = (compMsg as any).tool_calls[0].id;
      const idx = original.findIndex(
        (o) =>
          o.role === "assistant" &&
          o.content.some((p) => p.type === "toolCall" && p.id === tcId),
      );
      if (idx !== -1) {
        orig = original[idx];
        lastOrigIdx = idx;
      }
    }

    // 3. Fallback: sequential role match
    if (!orig) {
      const targetRole = compMsg.role === "tool" ? "toolResult" : compMsg.role;
      const idx = original.findIndex(
        (o, oIdx) => oIdx > lastOrigIdx && o.role === targetRole,
      );
      if (idx !== -1) {
        orig = original[idx];
        lastOrigIdx = idx;
      }
    }

    if (orig) {
      return alignMessage(compMsg, orig);
    }
    return buildFresh(compMsg);
  });
}

function alignMessage(comp: OpenAIMessage, orig: Message): Message {
  switch (comp.role) {
    case "user":
      return alignUser(comp, orig);
    case "assistant":
      return alignAssistant(comp, orig);
    case "tool":
      return alignTool(comp, orig);
    default:
      return buildFresh(comp);
  }
}

function alignUser(
  comp: OpenAIMessage & { role: "user" },
  orig: Message,
): Message {
  const text = extractText(comp.content);
  if (orig.role === "user") {
    return {
      ...orig,
      content: [{ type: "text" as const, text }],
    } satisfies Message;
  }
  return buildFreshUser(text);
}

function alignAssistant(
  comp: OpenAIMessage & { role: "assistant" },
  orig: Message,
): Message {
  const contentParts: PiAssistantMessage["content"] = [];

  const text = typeof comp.content === "string" ? comp.content : null;
  if (text) {
    contentParts.push({ type: "text" as const, text });
  }

  if (comp.tool_calls) {
    for (const tc of comp.tool_calls) {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      contentParts.push({
        type: "toolCall" as const,
        id: tc.id,
        name: tc.function.name,
        arguments: parsed,
      });
    }
  }

  // Preserve thinking content from original if it was assistant
  if (orig.role === "assistant") {
    const thinkingParts = orig.content.filter(
      (p): p is ThinkingContent => p.type === "thinking",
    );
    return {
      ...orig,
      content: [...thinkingParts, ...contentParts],
    } satisfies Message;
  }

  // Role mismatch — build fresh
  return buildFreshAssistant(contentParts);
}

function alignTool(
  comp: OpenAIMessage & { role: "tool" },
  orig: Message,
): Message {
  const text = typeof comp.content === "string" ? comp.content : "";
  if (orig.role === "toolResult") {
    return {
      ...orig,
      content: [{ type: "text" as const, text }],
    } satisfies Message;
  }
  return buildFreshTool(comp.tool_call_id ?? "", text);
}

function extractText(content: OpenAIMessage["content"]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");
  }
  return "";
}

// ─── Fresh message builders (fallback when alignment fails) ───────────

function buildFresh(comp: OpenAIMessage): Message {
  switch (comp.role) {
    case "user":
    case "system":
      return buildFreshUser(extractText(comp.content));
    case "assistant": {
      const contentParts: PiAssistantMessage["content"] = [];
      const text = typeof comp.content === "string" ? comp.content : null;
      if (text) contentParts.push({ type: "text" as const, text });
      if (comp.tool_calls) {
        for (const tc of comp.tool_calls) {
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(tc.function.arguments) as Record<
              string,
              unknown
            >;
          } catch {
            parsed = {};
          }
          contentParts.push({
            type: "toolCall" as const,
            id: tc.id,
            name: tc.function.name,
            arguments: parsed,
          });
        }
      }
      return buildFreshAssistant(contentParts);
    }
    case "tool":
      return buildFreshTool(
        (comp as { role: "tool"; content: string; tool_call_id: string })
          .tool_call_id ?? "",
        typeof comp.content === "string" ? comp.content : "",
      );
    default:
      return buildFreshUser("");
  }
}

function buildFreshUser(text: string): PiUserMessage {
  return {
    role: "user",
    content: [{ type: "text", text }],
    timestamp: Date.now(),
  };
}

function buildFreshAssistant(
  content: PiAssistantMessage["content"],
): PiAssistantMessage {
  return {
    role: "assistant",
    content,
    api: "openai-completions" as const,
    provider: "openai" as const,
    model: "",
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: "stop",
    timestamp: Date.now(),
  };
}

function buildFreshTool(toolCallId: string, text: string): PiToolResultMessage {
  return {
    role: "toolResult",
    toolCallId,
    toolName: "",
    content: [{ type: "text", text }],
    isError: false,
    timestamp: Date.now(),
  };
}
