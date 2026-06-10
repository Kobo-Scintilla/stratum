<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { BotIcon } from '@hugeicons/core-free-icons';
</script>

<div class="flex flex-1 items-center justify-center py-16 text-center">
	<div>
		<div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
			<Icon icon={BotIcon} class="size-6 text-primary/50" />
		</div>
		<p class="text-sm font-medium">Start a conversation</p>
		<p class="mt-1 text-xs text-muted-foreground">
			Type a message below to begin chatting with the assistant.
		</p>
	</div>
</div>
