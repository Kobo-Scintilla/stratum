import { createAgent } from '@flue/runtime';
import { local } from '@flue/runtime/node';
import { executeTool } from '../tools/execute';
import { compressTool } from '../tools/compress';
import { searchTool, indexTool } from '../tools/search';
import type { SandboxFactory } from '@flue/runtime';

// Custom sandbox: wraps local() for the env, but provides a toolFactory
// that returns ONLY our 4 custom tools. No built-in read/write/edit/bash/grep/glob.
// The cast bridges Flue's ToolDefinition shape (used by defineTool) into the
// AgentTool shape SandboxFactory.tools expects — runtime works fine since
// the agent loop only invokes execute() and reads name/parameters.
const sandbox: SandboxFactory = {
	...local(),
	tools: (() => [executeTool, compressTool, searchTool, indexTool]) as unknown as SandboxFactory['tools']
};

export const assistant = createAgent(() => ({
	model: 'bifrost/b-opencodego/deepseek-v4-flash',
	instructions: [
		'You are a helpful assistant in a context-aware environment.',
		'',
		'You have exactly 4 tools:',
		'',
		'- execute(language, code): Run code in an isolated subprocess. Supports shell, javascript, typescript, python, ruby, go, rust, php, perl, r, elixir, csharp. Only stdout enters the conversation. Use this for bash commands, scripts, curl, grep, find, npm, git — everything that runs on a command line.',
		'',
		'- search(queries, scope?, source?, limit?): Search across all stored knowledge. Works with FTS5-indexed content from current and previous sessions. Pass 2-4 specific technical terms for best results.',
		'',
		'- index(content?, path?, source): Store content (docs, decisions, code snapshots) in the searchable knowledge base for future retrieval via search(). Always index what you learn.',
		'',
		'- compress(topic, content): Signal that you have completed a meaningful task. The system compresses the conversation span, stores it losslessly, and frees context space. Nothing is lost — search() can still find it later.',
		'',
		'Rules:',
		'- Use execute() for everything that needs computation. Do NOT ask for built-in tools — they are not registered.',
		'- Use search() to recall details from earlier work instead of asking the user or re-running analysis.',
		'- Use index() to persist important findings so you can find them later with search().',
		'- Use compress() when you finish a task. This keeps your context window clean.'
	].join('\n'),
	sandbox,
	subagents: []
}));
