<script lang="ts">
	import { browser } from '$app/environment';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import { BotIcon, UserIcon } from '@hugeicons/core-free-icons';
	import Markdown from '$lib/components/Markdown.svelte';
	import type { EnrichedMessage } from '$lib/stores/chat-session.svelte.js';
	import AgentActivity from './AgentActivity.svelte';
	import { AgentService } from '@stratum/shared/controllers/agent-service.js';
	import { toast } from 'svelte-sonner';

	let {
		message
	}: {
		message: EnrichedMessage;
	} = $props();

	const hasUsage = $derived(
		message.role === 'assistant' && message.isFinal && (message.inputTokens ?? 0) > 0
	);

	const hasActivities = $derived(
		message.role === 'assistant' && message.activities && message.activities.length > 0
	);

	async function handleRollback() {
		try {
			const ok = await AgentService.rollbackSessionToMessage(message.id);
			if (ok) {
				toast.success('Workspace rolled back to pre-tool execution checkpoint.');
				if (browser) {
					window.location.reload();
				}
			} else {
				toast.error('Rollback failed.');
			}
		} catch (err) {
			console.error(err);
			toast.error('Failed to trigger rollback.');
		}
	}
</script>

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

	<div class="flex max-w-[80%] flex-col">
		<div
			class="rounded-2xl px-3.5 py-2 text-sm leading-relaxed {message.role === 'user'
				? 'rounded-tr-sm bg-primary text-primary-foreground'
				: 'rounded-tl-sm bg-muted text-foreground'}"
		>
			<!-- If assistant has run steps (thinking / tool calls), show unified AgentActivity block -->
			{#if hasActivities}
				<AgentActivity
					activities={message.activities || []}
					isGenerating={false}
					headroomTokensSaved={message.headroomTokensSaved}
					headroomRatio={message.headroomRatio}
				/>
			{/if}

			{#if message.content && message.content.trim() !== ''}
				<Markdown content={message.content} />
			{/if}
		</div>

		{#if hasUsage || message.checkpointHash}
			<div
				class="mt-1 flex items-center gap-1.5 px-1 font-mono text-[10px] tracking-tight text-muted-foreground/40 select-none"
			>
				{#if hasUsage}
					<span>in: {message.inputTokens?.toLocaleString()}</span>
					<span>•</span>
					<span>out: {message.outputTokens?.toLocaleString()}</span>
					{#if (message.cacheReadTokens || 0) > 0 || (message.cacheWriteTokens || 0) > 0}
						<span>•</span>
						<span
							>cache: {message.cacheReadTokens?.toLocaleString()} read / {message.cacheWriteTokens?.toLocaleString()}
							write</span
						>
					{/if}
				{/if}
				{#if hasUsage && message.checkpointHash}
					<span>•</span>
				{/if}
				{#if message.checkpointHash}
					<button
						onclick={handleRollback}
						class="text-red-500 hover:text-red-400 hover:underline cursor-pointer transition-colors duration-150"
					>
						[Rollback Changes]
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>
