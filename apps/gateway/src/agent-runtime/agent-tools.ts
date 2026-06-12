import { Type } from "@earendil-works/pi-ai";
import type { ToolDefinition, ToolResult } from "./types.js";
import type { Tool as PiAiTool } from "@earendil-works/pi-ai";
import { getTimeTool } from "./tools/get-time.js";
import { getPiCodingTools } from "./tools/pi-tools.js";

export type { ToolDefinition, ToolResult };

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getPiAiTools(): PiAiTool[] {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { result: `Tool "${name}" not found`, isError: true };
    }
    try {
      return await tool.execute(args);
    } catch (err) {
      return { result: String(err), isError: true };
    }
  }
}

export const toolRegistry = new ToolRegistry();

toolRegistry.register(getTimeTool);

import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const workspaceDir = process.env.STRATUM_WORKSPACE_DIR || path.join(os.homedir(), ".stratum", "workspace");
if (!fs.existsSync(workspaceDir)) {
  fs.mkdirSync(workspaceDir, { recursive: true });
}

// Register OMP SDK tools (read, write, edit, bash, search) in the stratum workspace
const piTools = getPiCodingTools(workspaceDir);
for (const tool of piTools) {
  toolRegistry.register(tool);
}

