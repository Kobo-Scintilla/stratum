import { Type } from '@earendil-works/pi-ai';
import type { ToolDefinition, ToolResult } from './types.js';
import type { Tool as PiAiTool } from '@earendil-works/pi-ai';
import { getTimeTool } from './tools/get-time.js';

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
			parameters: t.parameters
		}));
	}

	async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
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
