<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import { Navigation03Icon } from '@hugeicons/core-free-icons';

	let {
		disabled = false,
		error = '',
		onsend
	}: {
		disabled?: boolean;
		error?: string;
		onsend: (text: string) => void;
	} = $props();

	let text = $state('');

	function submit() {
		const msg = text.trim();
		if (!msg || disabled) return;
		text = '';
		onsend(msg);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}
</script>

<div
	class="mx-auto max-w-lg rounded-2xl border border-border/60 bg-card px-3 py-2.5 shadow-xl transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
>
	<form
		class="flex items-center gap-2"
		onsubmit={(e) => {
			e.preventDefault();
			submit();
		}}
	>
		<input
			type="text"
			placeholder="Type a message..."
			bind:value={text}
			{disabled}
			onkeydown={handleKeydown}
			class="min-w-0 flex-1 border-none bg-transparent px-1 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0 focus:outline-none"
		/>
		<Button type="submit" size="icon" disabled={disabled || !text.trim()}>
			<Icon icon={Navigation03Icon} class="size-4" />
		</Button>
	</form>
	{#if error}
		<p class="mx-auto mt-1.5 max-w-2xl text-xs text-destructive">{error}</p>
	{/if}
</div>
