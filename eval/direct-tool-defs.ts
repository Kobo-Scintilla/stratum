// OpenAI function-calling tool definitions for the direct eval runner.
//
// We import the Flue `ToolDefinition` objects (valibot schemas) and convert
// each `parameters` field to a plain JSON Schema via `@valibot/to-json-schema`
// so it can be sent to the OpenAI-compatible Bifrost endpoint.

import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { toJsonSchema } from '@valibot/to-json-schema';
import { executeTool } from '../src/lib/server/tools/execute.js';
import { compressTool } from '../src/lib/server/tools/compress.js';
import { searchTool, indexTool } from '../src/lib/server/tools/search.js';

type FlueTool = { name: string; description: string; parameters: unknown };

function toOpenAITool(t: FlueTool): ChatCompletionTool {
	return {
		type: 'function',
		function: {
			name: t.name,
			description: t.description,
			parameters: toJsonSchema(t.parameters as Parameters<typeof toJsonSchema>[0])
		}
	};
}

export const TOOL_DEFS: ChatCompletionTool[] = [
	toOpenAITool(executeTool as unknown as FlueTool),
	toOpenAITool(compressTool as unknown as FlueTool),
	toOpenAITool(searchTool as unknown as FlueTool),
	toOpenAITool(indexTool as unknown as FlueTool)
];
