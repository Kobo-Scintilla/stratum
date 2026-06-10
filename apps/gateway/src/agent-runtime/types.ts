import type { Tool as PiAiTool, Message, Context } from '@earendil-works/pi-ai';

export interface AgentConfig {
	name: string;
	modelProvider: string;
	modelId: string;
	systemPrompt?: string;
	toolNames: string[];
	contextWindow?: number;
	thinkingLevel?: string;
}

/** A tool that an agent can call. */
export interface ToolDefinition {
	name: string;
	description: string;
	parameters: PiAiTool['parameters'];
	execute(args: Record<string, unknown>): Promise<ToolResult>;
}

export interface ToolResult {
	result: string;
	isError: boolean;
}

/** Tool call tracked during streaming. */
export interface TrackedToolCall {
	id: string;
	name: string;
	args: unknown;
	result?: unknown;
	isError?: boolean;
}

export type { PiAiTool, Message, Context };
