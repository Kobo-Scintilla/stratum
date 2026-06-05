<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import { Navigation03Icon } from '@hugeicons/core-free-icons';

	let { disabled = false, error = '', onsend }: {
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

<div class="border-t border-border/25 px-4 py-3">
	<form
		class="mx-auto flex max-w-2xl items-center gap-2"
		onsubmit={(e) => { e.preventDefault(); submit(); }}
	>
		<Input
			type="text"
			placeholder="Type a message..."
			bind:value={text}
			{disabled}
			onkeydown={handleKeydown}
		/>
		<Button type="submit" size="icon" disabled={disabled || !text.trim()}>
			<Icon icon={Navigation03Icon} class="size-4" />
		</Button>
	</form>
	{#if error}
		<p class="mx-auto mt-1.5 max-w-2xl text-xs text-destructive">{error}</p>
	{/if}
</div>
