import { createAgent } from '@flue/runtime';
import { local } from '@flue/runtime/node';

import type { SandboxFactory } from '@flue/runtime';

// Custom sandbox: wraps local() for the env, but provides a toolFactory
// that returns ONLY our 4 custom tools. No built-in read/write/edit/bash/grep/glob.
// The cast bridges Flue's ToolDefinition shape (used by defineTool) into the
// AgentTool shape SandboxFactory.tools expects — runtime works fine since
// the agent loop only invokes execute() and reads name/parameters.

import { tmpdir } from 'node:os';
export const assistant = createAgent(() => ({
	model: 'opencode-go/deepseek-v4-flash',
	instructions: [].join('\n'),
	sandbox: local({
		// Random temp dir so the agent doesn't see project files (AGENTS.md, etc.)
		cwd: tmpdir()
	}),
	subagents: []
}));
