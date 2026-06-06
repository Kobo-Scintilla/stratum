<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import { BotIcon } from '@hugeicons/core-free-icons';
	import Markdown from '$lib/components/Markdown.svelte';
	import ToolCall from './ToolCall.svelte';

	type Segment =
		| { type: 'text'; text: string }
		| { type: 'tool'; toolCallId: string; toolName: string; args: unknown; result?: unknown; isError?: boolean };

	let { stream }: {
		stream: { id: string; text: string; segments?: Segment[]; toolCalls?: Array<{ id: string; name: string; args: unknown; result?: unknown; isError?: boolean }> };
	} = $props();

	let displaySegments = $derived<Segment[]>(
		stream.segments?.length ? stream.segments : stream.text ? [{ type: 'text', text: stream.text }] : []
	);
</script>

{#each displaySegments as seg, i (i)}
	<div class="flex gap-3">
		{#if seg.type === 'text'}
			<!-- Text segment: show avatar only on first segment or if standalone -->
			<Avatar.Root size="sm" class="mt-0.5 shrink-0">
				<Avatar.Fallback class="bg-secondary/20 text-secondary">
					<Icon icon={BotIcon} class="size-3.5" />
				</Avatar.Fallback>
			</Avatar.Root>
			<div class="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm leading-relaxed text-foreground">
				{#if seg.text}
					<Markdown content={seg.text} />
				{:else}
					<span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground italic">
						<span class="inline-block size-1.5 animate-pulse rounded-full bg-current"></span>
						Thinking
					</span>
				{/if}
			</div>
		{:else}
			{@const result = seg.result !== undefined ? { result: typeof seg.result === 'string' ? seg.result : JSON.stringify(seg.result, null, 2), isError: seg.isError ?? false } : null}
			<!-- Tool segment: spacer for alignment -->
			<div class="w-8 shrink-0" />
			<div class="max-w-[80%]">
				<ToolCall
					toolCall={{ id: seg.toolCallId, name: seg.toolName, args: seg.args, isError: seg.isError }}
					{result}
					open={true}
				/>
			</div>

		{/if}
	</div>
{/each}