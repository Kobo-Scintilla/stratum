import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import {
  createCheckpoint,
  rollbackToCheckpoint,
  completeCheckpoint,
} from "../git-checkpoint.js";

describe("Git Checkpoint Guardrails", () => {
  let testWorkspaceDir: string;
  let originalEnvWorkspace: string | undefined;

  beforeEach(() => {
    originalEnvWorkspace = process.env.STRATUM_WORKSPACE_DIR;
    testWorkspaceDir = path.join(
      os.tmpdir(),
      `stratum-test-workspace-${Math.random().toString(36).substring(2)}`,
    );
    process.env.STRATUM_WORKSPACE_DIR = testWorkspaceDir;
    fs.mkdirSync(testWorkspaceDir, { recursive: true });

    // Initialize mock git repo
    execSync("git init", { cwd: testWorkspaceDir, stdio: "ignore" });
    execSync("git config user.name 'Test User'", { cwd: testWorkspaceDir, stdio: "ignore" });
    execSync("git config user.email 'test@stratum.local'", { cwd: testWorkspaceDir, stdio: "ignore" });
    fs.writeFileSync(path.join(testWorkspaceDir, ".gitignore"), "node_modules/\n");
    execSync("git add .gitignore && git commit -m 'Initial commit'", {
      cwd: testWorkspaceDir,
      stdio: "ignore",
    });
  });

  afterEach(() => {
    process.env.STRATUM_WORKSPACE_DIR = originalEnvWorkspace;
    try {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    } catch {}
  });

  it("should return HEAD hash when workspace is clean", () => {
    const initialHead = execSync("git rev-parse HEAD", {
      cwd: testWorkspaceDir,
      encoding: "utf8",
    }).trim();
    const hash = createCheckpoint();
    expect(hash).toBe(initialHead);
  });

  it("should create checkpoint commit when workspace has unstaged changes", () => {
    // Modify a file
    fs.writeFileSync(path.join(testWorkspaceDir, "user_edit.txt"), "hello from user");

    const hash = createCheckpoint();
    expect(hash).not.toBeEmpty();

    // Verify checkpoint commit exists
    const commitMsg = execSync("git log -1 --format=%s", {
      cwd: testWorkspaceDir,
      encoding: "utf8",
    }).trim();
    expect(commitMsg).toContain("antigravity-checkpoint-user-dirty");
  });

  it("should rollback agent changes and restore user dirty state", () => {
    // 1. User edits file
    const userFilePath = path.join(testWorkspaceDir, "code.ts");
    fs.writeFileSync(userFilePath, "console.log('user original');\n");

    // 2. Pre-hook checkpoint
    const checkpointHash = createCheckpoint();

    // 3. Agent modifies file and adds new file
    fs.writeFileSync(userFilePath, "console.log('user original');\nconsole.log('agent edit');\n");
    const agentFilePath = path.join(testWorkspaceDir, "agent_new.ts");
    fs.writeFileSync(agentFilePath, "export const agent = true;\n");

    // Verify agent edits are present
    expect(fs.readFileSync(userFilePath, "utf8")).toContain("agent edit");
    expect(fs.existsSync(agentFilePath)).toBe(true);

    // 4. Rollback
    rollbackToCheckpoint(checkpointHash);

    // Verify agent changes are deleted
    expect(fs.existsSync(agentFilePath)).toBe(false);
    // Verify user original file contents are restored
    expect(fs.readFileSync(userFilePath, "utf8")).toBe("console.log('user original');\n");
    // Verify repository status has the user original file unstaged (dirty)
    const status = execSync("git status --porcelain", {
      cwd: testWorkspaceDir,
      encoding: "utf8",
    }).trim();
    expect(status).toContain("code.ts");
  });

  it("should complete checkpoint keeping both user and agent changes unstaged", () => {
    // 1. User edits file
    const userFilePath = path.join(testWorkspaceDir, "code.ts");
    fs.writeFileSync(userFilePath, "console.log('user original');\n");

    // 2. Pre-hook checkpoint
    const checkpointHash = createCheckpoint();

    // 3. Agent modifies file
    fs.writeFileSync(userFilePath, "console.log('user original');\nconsole.log('agent edit');\n");

    // 4. Complete/Accept
    completeCheckpoint(checkpointHash);

    // Verify both changes are kept
    expect(fs.readFileSync(userFilePath, "utf8")).toContain("agent edit");
    // Verify git history checkpoint commit is soft reset (HEAD is clean original commit)
    const commitMsg = execSync("git log -1 --format=%s", {
      cwd: testWorkspaceDir,
      encoding: "utf8",
    }).trim();
    expect(commitMsg).toBe("Initial commit");
  });
});
