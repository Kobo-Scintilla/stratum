/**
 * Headroom proxy lifecycle management.
 *
 * Handles auto-installation (Python venv via pip), spawning, health checking,
 * and graceful shutdown of the Headroom compression proxy.
 *
 * Two modes:
 *  - **Manual**: `HEADROOM_URL` env var set → user manages the proxy themselves.
 *  - **Auto-managed**: No env var → installs & spawns headroom proxy in
 *    `~/.pi/headroom-venv`.
 *
 * Adapted from pi-headroom (MIT) by mslavov.
 * @see https://github.com/mslavov/pi-headroom
 */

import { spawn, execSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// ─── Config ──────────────────────────────────────────────────────────

export const USER_URL =
  process.env.HEADROOM_BASE_URL || process.env.HEADROOM_URL;
const PORT = parseInt(process.env.HEADROOM_PORT || "8787", 10);
const AUTO_MANAGE_ENV = process.env.HEADROOM_AUTO_MANAGE;
export const AUTO_MANAGE =
  AUTO_MANAGE_ENV == null ? !USER_URL : AUTO_MANAGE_ENV !== "false";
export const BASE_URL = USER_URL || `http://127.0.0.1:${PORT}`;

// ─── State ───────────────────────────────────────────────────────────

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

/**
 * Ensure the Headroom proxy is running and healthy.
 * In manual mode (`HEADROOM_BASE_URL`, `HEADROOM_URL`, or `HEADROOM_AUTO_MANAGE=false`) just health-checks the URL.
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

// ─── Helpers ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}
