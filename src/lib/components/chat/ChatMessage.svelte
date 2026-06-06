<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import { BotIcon, UserIcon, AiBrain05Icon } from '@hugeicons/core-free-icons';
	import Markdown from '$lib/components/Markdown.svelte';
	import { parseThinking } from '$lib/shared/utils/thinking';

	let {
		message
	}: {
		message: { id: string; role: string; content: string };
	} = $props();

	const blocks = $derived(parseThinking(message.content));
</script>

{#if message.content && message.content.trim() !== ''}
	<div class="flex gap-3 {message.role === 'user' ? 'flex-row-reverse' : ''}">
		<Avatar.Root size="sm" class="mt-0.5 shrink-0">
			<Avatar.Fallback
				class={message.role === 'user'
					? 'bg-primary/20 text-primary'
					: 'bg-secondary/20 text-secondary'}
			>
				{#if message.role === 'user'}
					<Icon icon={UserIcon} class="size-3.5" />
				{:else}
					<Icon icon={BotIcon} class="size-3.5" />
				{/if}
			</Avatar.Fallback>
		</Avatar.Root>

		<div
			class="max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed {message.role === 'user'
				? 'rounded-tr-sm bg-primary text-primary-foreground'
				: 'rounded-tl-sm bg-muted text-foreground'}"
		>
			{#each blocks as block}
				{#if block.type === 'think'}
					<details
						class="mb-3 overflow-hidden rounded-lg border border-border/40 bg-card/30 text-muted-foreground"
						open
					>
						<summary
							class="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-medium tracking-wider text-muted-foreground/80 uppercase select-none hover:bg-muted/30"
						>
							<Icon icon={AiBrain05Icon} class="size-3.5 animate-pulse text-primary" />
							Thought Process
						</summary>
						<div
							class="ml-3.5 border-l-2 border-primary/30 px-3 pt-1 pb-3 text-xs leading-relaxed whitespace-pre-wrap italic"
						>
							{block.text}
						</div>
					</details>
				{:else}
					<Markdown content={block.text} />
				{/if}
			{/each}
		</div>
	</div>
{/if}
