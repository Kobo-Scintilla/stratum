<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import { BotIcon } from '@hugeicons/core-free-icons';
	import Markdown from '$lib/components/Markdown.svelte';
	import ToolCall from './ToolCall.svelte';
	import { parseThinking } from '$lib/shared/utils/thinking';
	import { BrainIcon } from '@hugeicons/core-free-icons';

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
		stream
	}: {
		stream: {
			id: string;
			text: string;
			segments?: Segment[];
			toolCalls?: Array<{
				id: string;
				name: string;
				args: unknown;
				result?: unknown;
				isError?: boolean;
			}>;
		};
	} = $props();

	let displaySegments = $derived<Segment[]>(
		stream.segments?.length
			? stream.segments
			: stream.text
				? [{ type: 'text', text: stream.text }]
				: []
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
			<div
				class="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm leading-relaxed text-foreground"
			>
				{#if seg.text}
					{@const blocks = parseThinking(seg.text)}
					{#each blocks as block}
						{#if block.type === 'think'}
							<details
								class="mb-3 overflow-hidden rounded-lg border border-border/40 bg-card/30 text-muted-foreground"
								open
							>
								<summary
									class="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-medium tracking-wider text-muted-foreground/80 uppercase select-none hover:bg-muted/30"
								>
									<Icon icon={BrainIcon} class="size-3.5 animate-pulse text-primary" />
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
				{:else}
					<span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground italic">
						<span class="inline-block size-1.5 animate-pulse rounded-full bg-current"></span>
						Thinking
					</span>
				{/if}
			</div>
		{:else}
			{@const result =
				seg.result !== undefined
					? {
							result:
								typeof seg.result === 'string' ? seg.result : JSON.stringify(seg.result, null, 2),
							isError: seg.isError ?? false
						}
					: null}
			<!-- Tool segment: spacer for alignment -->
			<div class="w-8 shrink-0"></div>
			<div class="max-w-[80%]">
				<ToolCall
					toolCall={{
						id: seg.toolCallId,
						name: seg.toolName,
						args: seg.args,
						isError: seg.isError
					}}
					{result}
					open={false}
				/>
			</div>
		{/if}
	</div>
{/each}
