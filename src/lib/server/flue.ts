import { assistant } from './agents/assistant';
import { createFlueContext, resolveModel, invokeWorkflowAttached } from '@flue/runtime/internal';
import { FlueSessionStore } from '../shared/FlueSessionStore';
import { local } from '@flue/runtime/node';
import type { AgentEvent } from '../shared/types';
import type { FlueEvent } from '@flue/runtime';


class AsyncQueue<T> {
	private queue: T[] = [];
	private resolvers: ((value: IteratorResult<T>) => void)[] = [];
	private done = false;

	push(value: T) {
		if (this.resolvers.length > 0) {
			const resolve = this.resolvers.shift();
			resolve?.({ value, done: false });
		} else {
			this.queue.push(value);
		}
	}

	close() {
		this.done = true;
		while (this.resolvers.length > 0) {
			const resolve = this.resolvers.shift();
			resolve?.({ value: undefined as unknown as T, done: true });
		}
	}

	[Symbol.asyncIterator]() {
		return {
			next: (): Promise<IteratorResult<T>> => {
				if (this.queue.length > 0) {
					return Promise.resolve({ value: this.queue.shift()!, done: false });
				}
				if (this.done) {
					return Promise.resolve({ value: undefined as unknown as T, done: true });
				}
				return new Promise((resolve) => {
					this.resolvers.push(resolve);
				});
			}
		};
	}
}

export const flue = {
	agents: {
		invoke(
			agentName: string,
			sessionId: string,
			options: { mode: string; payload: { message: string } }
		): AsyncQueue<AgentEvent> {
			const prompt = options.payload.message;
			const queue = new AsyncQueue<AgentEvent>();

			const createContext = (
				id: string,
				runId: string | undefined,
				payload: unknown,
				req: Request | undefined
			) => {
				return createFlueContext({
					id,
					runId,
					payload,
					req,
					env: process.env,
					agentConfig: {
						systemPrompt: '',
						skills: {},
						model: undefined,
						resolveModel
					},
					createDefaultEnv: () => {
						const sandbox = local();
						sandbox.tools = () => [];
						return sandbox.createSessionEnv({ id });
					},
					defaultStore: new FlueSessionStore() as never
				});
			};

			invokeWorkflowAttached({
				owner: { kind: 'workflow', workflowName: 'chat', instanceId: sessionId },
				id: sessionId,
				runId: sessionId + '-' + Date.now(),
				handler: async ({ init, payload }) => {
					const harness = await init(assistant);
					const session = await harness.session();

					const proto = Object.getPrototypeOf(session) as {
						createBuiltinTools?: (this: unknown, ...args: unknown[]) => Array<{ name: string }>;
						__hijacked?: boolean;
					};
					if (proto && typeof proto.createBuiltinTools === 'function' && !proto.__hijacked) {
						proto.__hijacked = true;
						const originalCreateBuiltinTools = proto.createBuiltinTools;
						proto.createBuiltinTools = function (this: unknown, ...args: unknown[]) {
							const tools = originalCreateBuiltinTools.apply(this, args);
							return tools.filter((t) => t.name !== 'task');
						};
					}

					await session.prompt(payload.message);
				},
				payload: { message: prompt },
				request: new Request('http://localhost'),
				createContext,
				onEvent: (event: FlueEvent) => {
					switch (event.type) {
						case 'text_delta':
							queue.push({ type: 'text_delta', text: event.text });
							break;
						case 'tool_start':
						case 'tool_execution_start':
							queue.push({
								type: event.type,
								toolName: event.toolName,
								toolCallId: event.toolCallId,
								args: event.args
							} as AgentEvent);
							break;
						case 'tool_call':
							queue.push({
								type: 'tool_call',
								toolName: event.toolName,
								toolCallId: event.toolCallId
							});
							break;
						case 'tool_execution_end':
							queue.push({
								type: 'tool_execution_end',
								toolCallId: event.toolCallId,
								toolName: event.toolName,
								result: event.result,
								isError: event.isError
							});
							break;
						case 'turn_request':
							queue.push({
								type: 'turn_request',
								model: event.model,
								provider: event.provider,
								input: event.input
							});
							break;
						case 'turn_end':
							queue.push({ type: 'turn_end', message: event.message, toolResults: event.toolResults });
							break;
					}
				}
			})
				.then(() => queue.close())
				.catch((err: unknown) => {
					console.error('Flue Agent Invoke Error:', err);
					queue.push({ type: 'error', error: err });
					queue.close();
				});

			return queue;
		}
	}
};
globalThis.flue = flue;
