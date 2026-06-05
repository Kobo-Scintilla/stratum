<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { createChatSession, type ChatSession } from '$lib/shared/chat.svelte.js';
	import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
	import { tick } from 'svelte';

	import EmptyState from '$lib/components/chat/EmptyState.svelte';
	import ChatMessage from '$lib/components/chat/ChatMessage.svelte';
	import ChatStream from '$lib/components/chat/ChatStream.svelte';
	import ChatInput from '$lib/components/chat/ChatInput.svelte';
	import ToolCall from '$lib/components/chat/ToolCall.svelte';

	let sessionId = $derived($page.params.sessionId);
	let chat: ChatSession = createChatSession(sessionId);
	let viewport: HTMLElement | null = $state(null);

	// Correlate tool-role messages with assistant toolCalls by toolCallId
	let toolResults = $derived.by(() => {
		const map = new Map<string, { result: string; isError: boolean }>();
		for (const m of chat.messages) {
			if (m.role === 'tool' && m.toolCallId) {
				map.set(m.toolCallId, { result: String(m.toolResult ?? ''), isError: m.isError ?? false });
			}
		}
		return map;
	});

	// Filter out tool messages (shown inline with their parent assistant message)
	let displayMessages = $derived(chat.messages.filter((m) => m.role !== 'tool'));

	// React to URL param changes — switch session or reset.
	// MUST NOT read chat.sessionId inside this effect — chat.send()
	// changes it, causing the effect to rerun and call reset() mid-stream.
	let prevSessionId = $state(sessionId);
	$effect(() => {
		const cur = sessionId;
		if (cur) {
			if (cur !== prevSessionId) {
				prevSessionId = cur;
				chat.switchSession(cur);
			}
		} else if (prevSessionId !== null) {
			prevSessionId = null;
			chat.reset();
		}
	});

	function handleSend(text: string) {
		const wasNull = !chat.sessionId;
		chat.send(text);
		if (wasNull && chat.sessionId && browser) {
			// Silent URL update — avoids SvelteKit navigation that would
			// destroy the in-flight ChatSession and its live subscriptions.
			history.replaceState(history.state, '', `/dashboard/${chat.sessionId}`);
		}
	}

	// Auto-scroll on new messages
	$effect(() => {
		chat.messages;
		chat.activeStreams;
		if (viewport) {
			tick().then(() => {
				viewport!.scrollTop = viewport!.scrollHeight;
			});
		}
	});
</script>

<div class="flex h-full flex-col">
	<ScrollArea.Root class="flex-1 px-4" bind:viewportRef={viewport}>
		<div class="mx-auto flex max-w-2xl flex-col gap-4 py-4">
			{#if displayMessages.length === 0 && chat.activeStreams.length === 0 && !chat.isSending}
				<EmptyState />
			{/if}

			{#each displayMessages as msg (msg.id)}
				<ChatMessage message={msg} />
				{#if msg.toolCalls && msg.toolCalls.length > 0}
					<div class="flex gap-3">
						<div class="w-8 shrink-0"></div>
						<div class="max-w-[80%] space-y-2">
							{#each msg.toolCalls as tc}
								{@const result = toolResults.get(tc.id)}
								<ToolCall toolCall={tc} {result} open={false} />
							{/each}
						</div>
					</div>
				{/if}
			{/each}

			{#each chat.activeStreams as stream (stream.id)}
				<ChatStream {stream} />
			{/each}

			<div class="h-2" />
		</div>
	</ScrollArea.Root>

	<ChatInput disabled={chat.isSending} error={chat.error} onsend={handleSend} />
</div>
