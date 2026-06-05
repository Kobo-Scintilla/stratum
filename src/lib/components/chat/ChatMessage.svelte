<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import { BotIcon, UserIcon } from '@hugeicons/core-free-icons';
	import Markdown from '$lib/components/Markdown.svelte';

	let { message }: {
		message: { id: string; role: string; content: string };
	} = $props();
</script>

<div class="flex gap-3 {message.role === 'user' ? 'flex-row-reverse' : ''}">
	<Avatar.Root size="sm" class="mt-0.5 shrink-0">
		<Avatar.Fallback
			class={message.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}
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
			? 'bg-primary text-primary-foreground rounded-tr-sm'
			: 'rounded-tl-sm bg-muted text-foreground'}"
	>
		{#if message.content}
			<Markdown content={message.content} />
		{/if}
	</div>
</div>
