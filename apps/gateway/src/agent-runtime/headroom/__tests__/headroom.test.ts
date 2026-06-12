import { describe, it, expect, mock, beforeEach } from "bun:test";

// ── Module mocks (must be set up before imports below) ────────────────

const compressMock = mock(
  async (_messages: unknown[], _options: Record<string, unknown>) => ({
    compressed: true,
    tokensSaved: 100,
    compressionRatio: 0.5,
    messages: [{ role: "assistant" as const, content: "compressed reply" }],
  }),
);

mock.module("headroom-ai", () => ({
  HeadroomClient: class {
    constructor() {}
  },
  compress: compressMock,
}));

mock.module("../proxy.js", () => ({
  ensureProxyRunning: mock(() => Promise.resolve(true)),
  stopProxy: mock(() => Promise.resolve()),
  BASE_URL: "http://127.0.0.1:8787",
}));

// ── Imports under test (after mocks) ──────────────────────────────────

import { resolveHeadroomEnabled } from "../../../agent-service.js";
import { piToOpenAI, openAIToPi } from "../format-bridge.js";
import { compressContext } from "../index.js";

// ── Tests ─────────────────────────────────────────────────────────────

describe("resolveHeadroomEnabled", () => {
  it("returns session setting when present", () => {
    expect(
      resolveHeadroomEnabled(
        { headroomEnabled: true },
        { defaultHeadroomEnabled: false },
      ),
    ).toBe(true);
    expect(
      resolveHeadroomEnabled(
        { headroomEnabled: false },
        { defaultHeadroomEnabled: true },
      ),
    ).toBe(false);
  });

  it("falls back to appSettings defaultHeadroomEnabled when session setting absent", () => {
    expect(resolveHeadroomEnabled(null, { defaultHeadroomEnabled: true })).toBe(
      true,
    );
    expect(
      resolveHeadroomEnabled(null, { defaultHeadroomEnabled: false }),
    ).toBe(false);
    expect(
      resolveHeadroomEnabled(undefined, { defaultHeadroomEnabled: true }),
    ).toBe(true);
  });

  it("falls back to true when both session and app settings are absent", () => {
    expect(resolveHeadroomEnabled(null, null)).toBe(true);
    expect(resolveHeadroomEnabled(undefined, undefined)).toBe(true);
    expect(resolveHeadroomEnabled()).toBe(true);
  });

  it("respects explicit false from session even when app default is true", () => {
    expect(
      resolveHeadroomEnabled(
        { headroomEnabled: false },
        { defaultHeadroomEnabled: true },
      ),
    ).toBe(false);
  });
});

describe("piToOpenAI / openAIToPi round-trip", () => {
  const systemPrompt = "You are a helpful assistant.";

  const testMessages = [
    {
      role: "user" as const,
      content: [{ type: "text" as const, text: "What's the weather?" }],
      timestamp: 1000,
    },
    {
      role: "assistant" as const,
      content: [
        { type: "text" as const, text: "Let me check." },
        {
          type: "toolCall" as const,
          id: "call_1",
          name: "get_weather",
          arguments: { city: "London" },
        },
      ],
      api: "openai-completions" as const,
      provider: "openai" as const,
      model: "gpt-4",
      usage: {
        input: 10,
        output: 5,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 15,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: "toolUse" as const,
      timestamp: 2000,
    },
    {
      role: "toolResult" as const,
      toolCallId: "call_1",
      toolName: "get_weather",
      content: [
        { type: "text" as const, text: '{"temp": 22, "condition": "sunny"}' },
      ],
      isError: false,
      timestamp: 3000,
    },
  ];

  it("converts pi-ai messages to OpenAI format", () => {
    const msgs = piToOpenAI(testMessages, systemPrompt);

    expect(msgs).toHaveLength(4); // system + user + assistant + tool

    // System prompt prepended
    expect(msgs[0]).toEqual({ role: "system", content: systemPrompt });

    // User message flattened to string
    expect(msgs[1]).toEqual({ role: "user", content: "What's the weather?" });

    // Assistant message with tool calls
    expect(msgs[2].role).toBe("assistant");
    expect(msgs[2].content).toBe("Let me check.");
    const toolCalls = (msgs[2] as any).tool_calls as Array<
      Record<string, unknown>
    >;
    expect(toolCalls).toHaveLength(1);
    expect((toolCalls[0].function as any).name).toBe("get_weather");
    expect((toolCalls[0].function as any).arguments).toBe('{"city":"London"}');

    // Tool result renamed to "tool"
    expect(msgs[3]).toEqual({
      role: "tool",
      content: '{"temp": 22, "condition": "sunny"}',
      tool_call_id: "call_1",
    });
  });

  it("round-trips back to pi-ai format preserving structure", () => {
    const openaiMsgs = piToOpenAI(testMessages, systemPrompt);
    const result = openAIToPi(openaiMsgs, testMessages, systemPrompt);

    expect(result).toHaveLength(3);

    // User message
    expect(result[0].role).toBe("user");
    if (result[0].role === "user") {
      expect(result[0].content).toEqual([
        { type: "text", text: "What's the weather?" },
      ]);
    }

    // Assistant message — text and tool call both preserved
    expect(result[1].role).toBe("assistant");
    if (result[1].role === "assistant") {
      const textParts = result[1].content.filter((c) => c.type === "text");
      expect(textParts).toHaveLength(1);
      expect(textParts[0].text).toBe("Let me check.");

      const toolParts = result[1].content.filter((c) => c.type === "toolCall");
      expect(toolParts).toHaveLength(1);
      expect(toolParts[0].name).toBe("get_weather");

      // Structural metadata preserved from original
      expect(result[1].api).toBe("openai-completions");
      expect(result[1].provider).toBe("openai");
      expect(result[1].stopReason).toBe("toolUse");
    }

    // Tool result
    expect(result[2].role).toBe("toolResult");
    if (result[2].role === "toolResult") {
      expect(result[2].toolCallId).toBe("call_1");
      expect(result[2].toolName).toBe("get_weather");
      expect(result[2].isError).toBe(false);
    }
  });

  it("aligns messages correctly when some intermediate messages are dropped/summarized", () => {
    const openaiMsgs = [
      { role: "user" as const, content: "What's the weather?" },
      {
        role: "tool" as const,
        content: '{"temp": 22}',
        tool_call_id: "call_1",
      },
    ];

    const result = openAIToPi(openaiMsgs, testMessages, systemPrompt);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("toolResult");
    if (result[1].role === "toolResult") {
      expect(result[1].toolCallId).toBe("call_1");
      expect(result[1].toolName).toBe("get_weather");
    }
  });
});

describe("compressContext options forwarding", () => {
  beforeEach(() => {
    compressMock.mockClear();
  });

  it("passes modelId and contextWindow to compress when provided", async () => {
    const context = {
      messages: [
        {
          role: "user" as const,
          content: [{ type: "text" as const, text: "hello" }],
          timestamp: 1,
        },
      ],
      systemPrompt: "Be helpful.",
    };

    const config = {
      enabled: true,
      modelId: "gpt-4",
      contextWindow: 4000,
    };

    const result = await compressContext(context, config);

    expect(result).not.toBeNull();
    expect(compressMock).toHaveBeenCalled();

    const [, options] = compressMock.mock.calls[0];
    expect(options.model).toBe("gpt-4");
    expect(options.tokenBudget).toBe(4000);
  });

  it("omits model and tokenBudget when not configured", async () => {
    const context = {
      messages: [
        {
          role: "user" as const,
          content: [{ type: "text" as const, text: "hi" }],
          timestamp: 1,
        },
      ],
    };

    const config = {
      enabled: true,
    };

    const result = await compressContext(context, config);

    expect(result).not.toBeNull();
    expect(compressMock).toHaveBeenCalled();

    const [, options] = compressMock.mock.calls[0];
    expect(options.model).toBeUndefined();
    expect(options.tokenBudget).toBeUndefined();
  });

  it("returns null when disabled", async () => {
    const result = await compressContext({ messages: [] }, { enabled: false });
    expect(result).toBeNull();
    expect(compressMock).not.toHaveBeenCalled();
  });
});
