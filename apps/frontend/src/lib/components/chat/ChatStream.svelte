<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import { BotIcon } from '@hugeicons/core-free-icons';
	import Markdown from '$lib/components/Markdown.svelte';
	import {
		isThoughtWorthDisplaying,
		parseThinking,
		parseStreamSegments
	} from '$lib/utils/thinking.js';
	import AgentActivity from './AgentActivity.svelte';

	type Segment =
		| { type: 'text'; text: string }
		| {
				type: 'tool';
				toolCallId: string;
				toolName: string;
				args: unknown;
				result?: unknown;
				isError?: boolean;
		  };

	let {
		stream,
		showAvatar = true
	}: {
		stream: {
			id: string;
			text: string;
			isGenerating?: boolean;
			segments?: Segment[];
			headroomTokensSaved?: number;
			headroomRatio?: number;
		};
		showAvatar?: boolean;
	} = $props();

	// Parse stream into activities and content
	const parsed = $derived(() => {
		if (stream.segments && stream.segments.length > 0) {
			return parseStreamSegments(stream.segments);
		}
		// Fallback for raw text stream
		const activities: any[] = [];
		let content = '';
		const blocks = parseThinking(stream.text);
		for (const block of blocks) {
			if (block.type === 'think') {
				if (!isThoughtWorthDisplaying(block.text)) continue;
				activities.push({
					id: 'fallback-think',
					type: 'think',
					text: block.text
				});
			} else {
				content = block.text;
			}
		}
		return { activities, content };
	});

	const state = $derived(parsed());
	const hasActivities = $derived(state.activities.length > 0);
</script>

<div class="flex gap-3 {showAvatar ? '' : '-mt-3'}">
	<!-- Assistant avatar -->
	{#if showAvatar}
		<Avatar.Root size="sm" class="mt-0.5 shrink-0">
			<Avatar.Fallback class="bg-secondary/20 text-secondary">
				<Icon icon={BotIcon} class="size-3.5" />
			</Avatar.Fallback>
		</Avatar.Root>
	{:else}
		<div class="w-8 shrink-0"></div>
	{/if}

	<div class="flex w-full max-w-[80%] flex-col">
		<div
			class="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm leading-relaxed text-foreground"
		>
			<!-- Show unified activity log if stream has activities -->
			{#if hasActivities}
				<AgentActivity
					activities={state.activities}
					isGenerating={stream.isGenerating ?? true}
					headroomTokensSaved={stream.headroomTokensSaved ?? 0}
					headroomRatio={stream.headroomRatio ?? 1}
				/>
			{/if}

			{#if state.content && state.content.trim() !== ''}
				<Markdown content={state.content} />
			{:else if !hasActivities}
				<!-- Minimal loading state before any content or activity -->
				<span
					class="inline-flex items-center gap-1.5 text-xs text-muted-foreground italic select-none"
				>
					<span class="inline-block size-1.5 animate-pulse rounded-full bg-current"></span>
					Thinking
				</span>
			{/if}
		</div>
	</div>
</div>
