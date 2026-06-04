import { createAgent } from '@flue/runtime';
import { local } from '@flue/runtime/node';

const sandbox = local();

export const assistant = createAgent(() => ({
	model: 'bifrost/b-opencodego/deepseek-v4-flash',
	instructions: 'You are a helpful and concise assistant.',
	sandbox,
	subagents: []
}));
