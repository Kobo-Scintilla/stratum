import type { Tool as PiAiTool, Message, Model, Context } from '@earendil-works/pi-ai';
import type { ActiveStream } from '../entities/active-stream';

/** Configuration for a single agent. */
export interface AgentConfig {
	name: string;
	modelProvider: string;
	modelId: string;
	systemPrompt?: string;
	toolNames: string[];
	contextWindow?: number;
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

/** Internal state for one ask() invocation. */
interface StreamState {
	accumulatedText: string;
	lastWasTool: boolean;
	toolCalls: TrackedToolCall[];
	segments: ActiveStream['segments'];
}

export type { PiAiTool, Message, Context };
