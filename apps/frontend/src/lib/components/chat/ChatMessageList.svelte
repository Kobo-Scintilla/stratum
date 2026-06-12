<script lang="ts">
	import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
	import { tick } from 'svelte';
	import type { ChatSession } from '$lib/stores/chat-session.svelte.js';
	import EmptyState from './EmptyState.svelte';
	import ChatMessage from './ChatMessage.svelte';
	import ChatStream from './ChatStream.svelte';

	let { chat }: { chat: ChatSession } = $props();

	let viewport: HTMLElement | null = $state(null);
	let isNearBottom = true;
	let lastScrollHeight = 0;

	function handleScroll() {
		if (!viewport) return;

		const threshold = 100;
		isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < threshold;

		if (chat.isLoadingMore || !chat.hasMore) return;
		if (viewport.scrollTop < 80 && !chat.isSending) {
			lastScrollHeight = viewport.scrollHeight;
			const extra = Math.max(20, Math.ceil(viewport.clientHeight / 140));
			chat.loadMore(extra);
		}
	}

	$effect(() => {
		const el = viewport;
		if (el) {
			el.addEventListener('scroll', handleScroll, { passive: true });
			return () => {
				el.removeEventListener('scroll', handleScroll);
			};
		}
	});

	$effect(() => {
		chat.messages;
		chat.activeStreams;
		if (viewport) {
			tick().then(() => {
				if (lastScrollHeight > 0) {
					const diff = viewport!.scrollHeight - lastScrollHeight;
					viewport!.scrollTop = diff;
					lastScrollHeight = 0;
				} else if (isNearBottom || chat.isSending) {
					viewport!.scrollTop = viewport!.scrollHeight;
				}
			});
		}
	});
</script>

<ScrollArea.Root
	class="min-h-0 flex-1 overflow-hidden px-4 pr-4 md:pr-16"
	bind:viewportRef={viewport}
>
	<div class="mx-auto flex max-w-4xl min-w-0 flex-col gap-4 py-4">
		{#if chat.displayMessages.length === 0 && chat.activeStreams.length === 0 && !chat.isSending}
			<EmptyState />
		{/if}

		{#each chat.displayMessages as msg (msg.id)}
			<ChatMessage message={msg} />
		{/each}

		{#each chat.activeStreams as stream, index (stream.id)}
			{@const isCompleted = !stream.isGenerating && (!stream.text || stream.text.trim() === '')}
			{@const isConsecutive =
				!isCompleted &&
				index === 0 &&
				chat.displayMessages.length > 0 &&
				chat.displayMessages[chat.displayMessages.length - 1].role === 'assistant'}
			{@const lastMsg = isConsecutive
				? chat.displayMessages[chat.displayMessages.length - 1]
				: null}
			{@const streamText = stream.text ?? ''}
			{@const isDuplicate =
				lastMsg &&
				(!streamText || streamText.includes(lastMsg.content)) &&
				(!stream.segments ||
					stream.segments.every(
						(seg) =>
							seg.type !== 'tool' || lastMsg.activities?.some((act) => act.id === seg.toolCallId)
					))}
			{#if !isCompleted && !isDuplicate}
				<ChatStream {stream} showAvatar={!isConsecutive} />
			{/if}
		{/each}

		<div class="h-2"></div>
	</div>
</ScrollArea.Root>
