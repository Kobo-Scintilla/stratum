// Barrel export for all custom Flue tools.

export { executeTool } from './execute';
export { compressTool } from './compress';
export { searchTool, indexTool } from './search';
export { buildHandoffArtifact, shouldHandoff, formatHandoffForPrompt } from './handoff';
export type { HandoffArtifact } from './handoff';

import type { ToolDefinition } from '@flue/runtime';
import { executeTool } from './execute';
import { compressTool } from './compress';
import { searchTool, indexTool } from './search';

// All custom tools ready for agent registration
export const allTools: ToolDefinition[] = [
	executeTool,
	compressTool,
	searchTool,
	indexTool
];
