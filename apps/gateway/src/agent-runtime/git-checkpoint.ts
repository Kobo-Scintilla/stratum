import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

function getWorkspaceDir(): string {
  return process.env.STRATUM_WORKSPACE_DIR || path.join(os.homedir(), ".stratum", "workspace");
}

function runGit(args: string[]): string {
  const workspaceDir = getWorkspaceDir();
  try {
    // Ensure git is configured if not already
    execSync("git config user.name || git config user.name 'Stratum Agent'", { cwd: workspaceDir, stdio: "ignore" });
    execSync("git config user.email || git config user.email 'agent@stratum.local'", { cwd: workspaceDir, stdio: "ignore" });
    
    const cmd = `git ${args.join(" ")}`;
    const output = execSync(cmd, { cwd: workspaceDir, encoding: "utf8" });
    return output.trim();
  } catch (err) {
    console.error(`Git command failed: git ${args.join(" ")}`, err);
    throw err;
  }
}

/**
 * Creates a git checkpoint commit if there are changes.
 * Returns the hash of the checkpoint (or current HEAD if clean).
 */
export function createCheckpoint(): string {
  const workspaceDir = getWorkspaceDir();
  // Ensure the directory exists and is a git repo
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }
  if (!fs.existsSync(path.join(workspaceDir, ".git"))) {
    try {
      execSync("git init", { cwd: workspaceDir, stdio: "ignore" });
      fs.writeFileSync(path.join(workspaceDir, ".gitignore"), ".encryption-key\n.env\nnode_modules\n");
      execSync("git add .gitignore && git commit -m 'Initial commit'", { cwd: workspaceDir, stdio: "ignore" });
    } catch (err) {
      console.error("Failed to init git workspace:", err);
      return "";
    }
  }

  try {
    const status = runGit(["status", "--porcelain"]);
    if (!status) {
      // Clean workspace, return current HEAD
      return runGit(["rev-parse", "HEAD"]);
    }

    // Dirty workspace, commit changes as user-dirty checkpoint
    runGit(["add", "-A"]);
    runGit(["commit", "-m", '"antigravity-checkpoint-user-dirty"', "--no-verify"]);
    return runGit(["rev-parse", "HEAD"]);
  } catch (err) {
    console.error("Failed to create checkpoint:", err);
    return "";
  }
}

/**
 * Rolls back the workspace to the specified checkpoint commit.
 * Restores user dirty state if the checkpoint was created from a dirty state.
 */
export function rollbackToCheckpoint(hash: string): void {
  if (!hash) return;
  try {
    // Reset hard to target hash
    runGit(["reset", "--hard", hash]);
    // Clean untracked files
    runGit(["clean", "-fd"]);

    // Check if this was a dirty-state checkpoint
    const commitMsg = runGit(["log", "-1", "--format=%s", hash]);
    if (commitMsg.includes("antigravity-checkpoint-user-dirty")) {
      // Reset HEAD back by 1 commit but keep user modifications unstaged
      runGit(["reset", "HEAD~1", "--"]);
    }
  } catch (err) {
    console.error("Failed to rollback to checkpoint:", err);
  }
}

/**
 * Completes/accepts changes.
 * Restores user dirty state as unstaged, combining it with new agent changes.
 */
export function completeCheckpoint(hash: string): void {
  if (!hash) return;
  try {
    const commitMsg = runGit(["log", "-1", "--format=%s", hash]);
    if (commitMsg.includes("antigravity-checkpoint-user-dirty")) {
      // Soft reset the checkpoint commit so both user changes and agent changes are unstaged
      runGit(["reset", "HEAD~1", "--"]);
    }
  } catch (err) {
    console.error("Failed to complete checkpoint:", err);
  }
}
