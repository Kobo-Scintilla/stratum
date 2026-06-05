<script lang="ts">
	import { onMount } from 'svelte';
	import { remult } from 'remult';
	import { ActiveStream } from '$lib/shared/entities/ActiveStream';
	import { ChatMessage } from '$lib/shared/entities/ChatMessage';
	import { AgentService } from '$lib/shared/AgentService';

	let promptText = $state('');
	let chatMessages = $state<ChatMessage[]>([]);
	let activeStreams = $state<ActiveStream[]>([]);
	let sending = $state(false);
	let errorMsg = $state('');

	let chatContainer: HTMLDivElement | null = $state(null);

	onMount(() => {
		// Recover any missed messages from Flue sessions
		AgentService.recoverMessages('default').catch((err: unknown) => {
			console.error('Message recovery error:', err);
		});

		// Subscribe to ChatMessage changes (all roles)
		const unsubscribeMsgs = remult
			.repo(ChatMessage)
			.liveQuery({
				orderBy: { sortOrder: 'asc' as const }
			})
			.subscribe({
				next: (info) => {
					chatMessages = info.items;
					scrollToBottom();
				},
				error: (err: Error) => {
					console.error('ChatMessage liveQuery error:', err);
					errorMsg = 'Subscription Error: ' + (err.message || JSON.stringify(err));
				}
			});

		// Subscribe to ActiveStream changes (real-time streaming)
		const unsubscribeActive = remult
			.repo(ActiveStream)
			.liveQuery({
				orderBy: { createdAt: 'asc' as const }
			})
			.subscribe({
				next: (info) => {
					activeStreams = info.items;
					scrollToBottom();
				},
				error: (err: Error) => {
					console.error('ActiveStream liveQuery error:', err);
					errorMsg = 'Active Stream Subscription Error: ' + (err.message || JSON.stringify(err));
				}
			});

		return () => {
			unsubscribeMsgs();
			unsubscribeActive();
		};
	});

	function scrollToBottom() {
		setTimeout(() => {
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		}, 50);
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!promptText.trim() || sending) return;

		const prompt = promptText;
		promptText = '';
		sending = true;
		errorMsg = '';

		try {
			await AgentService.ask(prompt);
		} catch (err: unknown) {
			console.error(err);
			const errMsg = err instanceof Error ? err.message : String(err);
			errorMsg = errMsg || 'An error occurred. Please try again.';
		} finally {
			sending = false;
		}
	}

	async function handleClearHistory() {
		sending = true;
		errorMsg = '';
		try {
			await AgentService.clearHistory();
		} catch (err: unknown) {
			console.error(err);
			const errMsg = err instanceof Error ? err.message : String(err);
			errorMsg = errMsg || 'Failed to clear history. Please try again.';
		} finally {
			sending = false;
		}
	}
</script>

<svelte:head>
	<title>Test Chat — Agent Tools</title>
</svelte:head>

<div class="chat-app">
	<header>
		<h1>🧪 Agent Tool Test</h1>
		<div class="header-actions">
			<span class="live-badge">● LIVE</span>
			<button onclick={handleClearHistory} disabled={sending}>Clear</button>
		</div>
	</header>

	<main class="chat-main" bind:this={chatContainer}>
		{#if chatMessages.length === 0 && activeStreams.length === 0}
			<div class="welcome">
				<h2>Agent Testing Console</h2>
				<p>Ask the agent what tools it has available. Test execute, search, index, and compress.</p>
				<div class="quick-prompts">
					<button onclick={() => { promptText = 'What tools do you have available? List them all.'; }}>
						List all tools
					</button>
					<button onclick={() => { promptText = 'Run echo hello in shell using execute'; }}>
						Test execute tool
					</button>
				</div>
			</div>
		{/if}

		{#each chatMessages as msg (msg.id)}
			<div class="message msg-{msg.role}">
				<div class="msg-meta">
					<strong>{msg.role === 'user' ? '👤 You' : msg.role === 'assistant' ? '🤖 Assistant' : '🔧 Tool'}</strong>
					<small>{new Date(msg.createdAt).toLocaleTimeString()}</small>
				</div>
				{#if msg.role === 'tool'}
					<div class="tool-result">
						<span class="tool-name">╰ {msg.toolName ?? 'tool'}</span>
						{#if msg.isError}<span class="error-badge">ERROR</span>{/if}
						<pre>{msg.content}</pre>
					</div>
				{:else}
					<div class="bubble" class:user={msg.role === 'user'}>
						{msg.content}
					</div>
				{/if}
				{#if msg.toolCalls && msg.toolCalls.length > 0}
					<div class="tool-calls">
						{#each msg.toolCalls as tc}
							<details>
								<summary>🔧 {tc.name} {tc.isError ? '✗ Error' : tc.result !== undefined ? '✓ Done' : '⏳ Running'}</summary>
								<pre>Args: {JSON.stringify(tc.args, null, 2)}</pre>
								{#if tc.result !== undefined}
									<pre>Result: {typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2)}</pre>
								{/if}
							</details>
						{/each}
					</div>
				{/if}
			</div>
		{/each}

		{#each activeStreams as msg (msg.id)}
			{#if !chatMessages.some((m) => m.role === 'assistant' && new Date(m.createdAt) >= new Date(msg.createdAt))}
				<div class="message msg-user">
					<div class="msg-meta"><strong>👤 You</strong></div>
					<div class="bubble user">{msg.prompt}</div>
				</div>
				<div class="message msg-assistant streaming">
					<div class="msg-meta"><strong>🤖 Assistant</strong></div>
					<div class="bubble">
						{msg.text}<span class="cursor">|</span>
					</div>
				</div>
			{/if}
		{/each}
	</main>

	<footer>
		<form onsubmit={handleSubmit}>
			<input
				type="text"
				bind:value={promptText}
				placeholder="Ask the agent about its tools..."
				disabled={sending}
			/>
			<button type="submit" disabled={sending || !promptText.trim()}>
				{sending ? '⏳' : 'Send'}
			</button>
		</form>
		{#if errorMsg}
			<div class="error">{errorMsg}</div>
		{/if}
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, sans-serif;
		background: #0d0d0d;
		color: #e0e0e0;
	}

	.chat-app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		max-width: 800px;
		margin: 0 auto;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: #1a1a1a;
		border-bottom: 1px solid #333;
	}

	header h1 { margin: 0; font-size: 1.1rem; }
	.header-actions { display: flex; gap: 8px; align-items: center; }
	.live-badge { color: #4ade80; font-size: 0.75rem; }
	button { padding: 6px 14px; background: #333; color: #e0e0e0; border: 1px solid #555; border-radius: 6px; cursor: pointer; }
	button:disabled { opacity: 0.4; cursor: default; }
	button:hover:not(:disabled) { background: #444; }

	.chat-main {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
	}

	.welcome { text-align: center; padding: 40px 16px; color: #888; }
	.welcome h2 { color: #ccc; }
	.quick-prompts { display: flex; gap: 8px; justify-content: center; margin-top: 16px; flex-wrap: wrap; }
	.quick-prompts button { background: #222; border-color: #444; }

	.message { margin-bottom: 16px; }
	.msg-meta { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; font-size: 0.8rem; color: #888; }

	.bubble {
		padding: 10px 14px;
		border-radius: 8px;
		background: #1a1a1a;
		border: 1px solid #333;
		white-space: pre-wrap;
		line-height: 1.5;
	}
	.bubble.user { background: #1e3a5f; border-color: #2a5a8f; }

	.tool-result {
		padding: 8px 12px;
		background: #111;
		border: 1px solid #333;
		border-radius: 6px;
		font-size: 0.85rem;
	}
	.tool-name { color: #f59e0b; }
	.error-badge { color: #ef4444; margin-left: 8px; }
	pre { white-space: pre-wrap; word-break: break-all; margin: 4px 0; font-size: 0.8rem; color: #aaa; }

	.tool-calls { margin-top: 8px; }
	.tool-calls details { margin-bottom: 4px; }
	.tool-calls summary { cursor: pointer; padding: 4px 8px; background: #1a1a1a; border-radius: 4px; font-size: 0.85rem; }
	.tool-calls pre { margin-left: 8px; }

	.streaming .cursor { animation: blink 1s infinite; }
	@keyframes blink { 50% { opacity: 0; } }

	footer {
		padding: 12px 16px;
		background: #1a1a1a;
		border-top: 1px solid #333;
	}
	footer form { display: flex; gap: 8px; }
	footer input {
		flex: 1;
		padding: 10px 14px;
		background: #222;
		color: #e0e0e0;
		border: 1px solid #444;
		border-radius: 6px;
		font-size: 0.95rem;
	}
	footer input:disabled { opacity: 0.5; }
	.error { color: #ef4444; margin-top: 8px; font-size: 0.85rem; }
</style>
