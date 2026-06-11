/**
 * Headroom context compression integration.
 *
 * Manages the Headroom proxy lifecycle and provides pi-ai ↔ OpenAI message
 * format conversion for transparent context compression.
 *
 * Two modes:
 *  - **Manual**: HEADROOM_URL env var set → user manages the proxy themselves.
 *  - **Auto-managed**: No env var → extension installs & spawns headroom proxy.
 *
 * Toggle via `headroomEnabled` on AgentConfig / ChatSessionSettings.
 *
 * Adapted from pi-headroom (MIT) by mslavov.
 * @see https://github.com/mslavov/pi-headroom
 */

import { HeadroomClient, compress, type CompressResult } from "headroom-ai";
import type {
  Message,
  UserMessage as PiUserMessage,
  AssistantMessage as PiAssistantMessage,
  ToolResultMessage as PiToolResultMessage,
  TextContent,
  ThinkingContent,
  ImageContent,
  ToolCall as PiToolCall,
  Context,
} from "@earendil-works/pi-ai";
import type {
  OpenAIMessage,
  ToolCall as OpenAIToolCall,
  CompressOptions,
} from "headroom-ai";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// ─── Config ──────────────────────────────────────────────────────────

export interface HeadroomConfig {
  /** Master toggle — pass `false` to skip compression entirely. */
  enabled: boolean;
  /** Called with status messages for UI. */
  onStatus?: (msg: string) => void;
}

// ─── State ───────────────────────────────────────────────────────────

const USER_URL = process.env.HEADROOM_URL;
const PORT = parseInt(process.env.HEADROOM_PORT || "8787", 10);
const AUTO_MANAGE = !USER_URL;
const BASE_URL = USER_URL || `http://127.0.0.1:${PORT}`;

const HEADROOM_CLIENT = new HeadroomClient({
  baseUrl: BASE_URL,
  fallback: true,
  timeout: 15_000,
});

/** Proxy process handle (only in auto-manage mode). */
let proxyProcess: ChildProcess | null = null;
let weStartedProxy = false;
let proxyHealthy: boolean | null = null;

// ─── Health ──────────────────────────────────────────────────────────

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Proxy lifecycle (auto-manage) ───────────────────────────────────

const IS_WINDOWS = process.platform === "win32";
const VENV_DIR = join(homedir(), ".pi", "headroom-venv");
const VENV_BIN = IS_WINDOWS ? join(VENV_DIR, "Scripts") : join(VENV_DIR, "bin");
const VENV_PYTHON = join(VENV_BIN, IS_WINDOWS ? "python.exe" : "python");
const VENV_HEADROOM = join(VENV_BIN, IS_WINDOWS ? "headroom.exe" : "headroom");

async function execAsync(
  cmd: string,
  args: string[],
  timeoutMs = 30_000,
): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  let proc;
  try {
    proc = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: IS_WINDOWS,
    });
  } catch (err) {
    return Promise.reject(err);
  }
  let stdout = "";
  let stderr = "";
  proc.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  proc.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  proc.on("error", reject);
  proc.on("close", (code) => {
    if (code === 0) resolve(stdout);
    else reject(new Error(`Exit ${code}: ${stderr.slice(0, 500)}`));
  });
  const timer = setTimeout(() => {
    proc.kill();
    reject(new Error("Timeout"));
  }, timeoutMs);
  promise.finally(() => clearTimeout(timer));
  return promise;
}

function commandExists(cmd: string): boolean {
  try {
    execSync(IS_WINDOWS ? `where ${cmd}` : `command -v ${cmd}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

async function getPythonVersion(
  cmd: string,
): Promise<{ major: number; minor: number } | null> {
  if (!commandExists(cmd)) return null;
  try {
    const out = await execAsync(cmd, ["--version"]);
    const m = out.match(/Python (\d+)\.(\d+)/);
    return m ? { major: parseInt(m[1], 10), minor: parseInt(m[2], 10) } : null;
  } catch {
    return null;
  }
}

async function findPython(): Promise<string | null> {
  for (const cmd of ["python3", "python"]) {
    const ver = await getPythonVersion(cmd);
    if (ver && ver.major >= 3 && ver.minor >= 10) return cmd;
  }
  return null;
}

async function ensureVenv(
  onStatus: (msg: string) => void,
): Promise<string | null> {
  if (existsSync(VENV_HEADROOM)) return VENV_HEADROOM;

  const python = await findPython();
  if (!python) {
    onStatus("Python >=3.10 not found — cannot install Headroom proxy");
    return null;
  }

  if (!existsSync(VENV_PYTHON)) {
    onStatus("Creating Headroom venv...");
    try {
      await execAsync(python, ["-m", "venv", VENV_DIR], 60_000);
    } catch (err) {
      onStatus(`Failed to create venv: ${err}`);
      return null;
    }
  }

  onStatus("Installing headroom-ai[proxy] (this may take a minute)...");
  try {
    await execAsync(
      VENV_PYTHON,
      [
        "-m",
        "pip",
        "install",
        "headroom-ai[proxy]",
        "--quiet",
        "--disable-pip-version-check",
      ],
      180_000,
    );
  } catch (err) {
    onStatus(`pip install failed: ${err}`);
    return null;
  }

  return existsSync(VENV_HEADROOM) ? VENV_HEADROOM : null;
}

async function findHeadroomCli(): Promise<{
  cmd: string;
  args: string[];
} | null> {
  // Check system PATH first
  if (commandExists("headroom")) {
    try {
      await execAsync("headroom", ["--help"], 10_000);
      return { cmd: "headroom", args: [] };
    } catch {
      // not working
    }
  }

  // Check venv
  if (existsSync(VENV_HEADROOM)) {
    try {
      await execAsync(VENV_HEADROOM, ["--help"], 10_000);
      return { cmd: VENV_HEADROOM, args: [] };
    } catch {
      // venv binary broken
    }
  }

  // Try install
  const installed = await ensureVenv(() => {});
  if (installed) return { cmd: installed, args: [] };

  // Fallback: python -m headroom.cli
  if (existsSync(VENV_PYTHON)) {
    try {
      await execAsync(VENV_PYTHON, ["-m", "headroom.cli", "--help"], 10_000);
      return { cmd: VENV_PYTHON, args: ["-m", "headroom.cli"] };
    } catch {
      // nope
    }
  }

  return null;
}

async function startProxy(onStatus: (msg: string) => void): Promise<boolean> {
  const cli = await findHeadroomCli();
  if (!cli) {
    onStatus("Headroom CLI not found — cannot start proxy");
    return false;
  }

  const { promise, resolve } = Promise.withResolvers<void>();
  proxyProcess = spawn(
    cli.cmd,
    [...cli.args, "proxy", "--port", String(PORT)],
    {
      stdio: ["ignore", "pipe", "pipe"],
      shell: IS_WINDOWS,
    },
  );
  proxyProcess.stdout?.on("data", (chunk: Buffer) => {
    // Headroom prints "Listening on ..." when ready
    if (chunk.toString().includes("Listening")) resolve();
  });
  proxyProcess.stderr?.on("data", () => {
    /* ignore */
  });
  proxyProcess.on("error", () => {
    /* will be caught by health check */
  });
  proxyProcess.on("exit", () => {
    proxyProcess = null;
  });

  // Wait for "Listening" signal or health check loop
  const POLL_DELAYS = [500, 1000, 1000, 2000, 2000, 2000, 2000, 2000];
  for (const delay of POLL_DELAYS) {
    await sleep(delay);
    if (
      proxyProcess?.exitCode !== null &&
      proxyProcess?.exitCode !== undefined
    ) {
      onStatus("Headroom proxy exited unexpectedly");
      return false;
    }
    if (await checkHealth()) {
      weStartedProxy = true;
      return true;
    }
  }

  onStatus("Headroom proxy failed to start (health check timeout)");
  killProxy();
  return false;
}

function killProxy(): void {
  if (!proxyProcess) return;
  try {
    if (IS_WINDOWS) {
      proxyProcess.kill();
    } else {
      proxyProcess.kill("SIGTERM");
    }
  } catch {
    // already dead
  }
  proxyProcess = null;
}

// ─── Public lifecycle API ────────────────────────────────────────────

/**
 * Ensure the Headroom proxy is running and healthy.
 * In manual mode (HEADROOM_URL set) just health-checks the URL.
 * In auto mode, installs & spawns the proxy.
 */
export async function ensureProxyRunning(
  onStatus?: (msg: string) => void,
): Promise<boolean> {
  const status = onStatus ?? (() => {});

  if (!AUTO_MANAGE) {
    const healthy = await checkHealth();
    proxyHealthy = healthy;
    return healthy;
  }

  // Already running (our process or external)
  if (proxyHealthy || (proxyProcess && proxyProcess.exitCode === null)) {
    if (await checkHealth()) return true;
    proxyHealthy = false;
    // fall through to restart
  }

  if (proxyProcess) {
    status("Headroom proxy offline, restarting...");
    killProxy();
    weStartedProxy = false;
  }

  status("Starting Headroom proxy...");
  const ok = await startProxy(status);
  proxyHealthy = ok;
  return ok;
}

/**
 * Stop the proxy (only if we started it in auto-manage mode).
 */
export async function stopProxy(): Promise<void> {
  if (!weStartedProxy || !proxyProcess) return;

  const proc = proxyProcess;
  proxyProcess = null;
  weStartedProxy = false;
  proxyHealthy = null;

  try {
    if (IS_WINDOWS) {
      proc.kill();
    } else {
      proc.kill("SIGTERM");
      // Wait up to 3s for graceful exit
      const { promise, resolve } = Promise.withResolvers<void>();
      const done = Promise.race([
        promise,
        sleep(3000).then(() => {
          /* timeout */
        }),
      ]);
      proc.on("exit", () => resolve());
      await done;
      if (proc.exitCode === null) proc.kill("SIGKILL");
    }
  } catch {
    // already dead
  }
}

// ─── Format bridge: Pi-AI ↔ OpenAI ───────────────────────────────────

/**
 * Convert pi-ai Message[] + systemPrompt to OpenAI format for headroom.
 *
 * Transformations:
 *  - Prepend system prompt as `{ role: "system" }` message.
 *  - Strip ThinkingContent (opaque, not useful for compression).
 *  - Extract ToolCall from content array → `tool_calls` on message.
 *  - Rename role "toolResult" → "tool".
 *  - Flatten text content arrays to strings.
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
  // Adjust for prepended system message — headroom may keep or drop it
  let origIdx = 0;
  if (systemPrompt) {
    // Skip past system message in compressed if first message is system
    if (compressed.length > 0 && compressed[0].role === "system") {
      origIdx = 0; // system not in original messages array
    }
  }

  return compressed
    .filter((m) => m.role !== "system") // strip system if present
    .map((compMsg, i) => {
      const orig = original[i];
      if (orig) return alignMessage(compMsg, orig);
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

// ─── Main compression entry point ─────────────────────────────────────

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
    const result: CompressResult = await compress(openaiMessages, {
      client: HEADROOM_CLIENT,
      model: "", // let proxy decide
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

// ─── Helpers ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}
