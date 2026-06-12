import type { AgentConfig } from "./types.js";

class AgentRegistry {
  private agents = new Map<string, AgentConfig>();

  register(config: AgentConfig): void {
    this.agents.set(config.name, config);
  }

  get(name: string): AgentConfig | undefined {
    return this.agents.get(name);
  }

  list(): AgentConfig[] {
    return Array.from(this.agents.values());
  }
}

export const agentRegistry = new AgentRegistry();

agentRegistry.register({
  name: "assistant",
  modelProvider: "",
  modelId: "",
  systemPrompt: "",
  toolNames: [
    "get_time",
    "read",
    "write",
    "edit",
    "bash",
    "search",
    "ast_search",
  ],
});
