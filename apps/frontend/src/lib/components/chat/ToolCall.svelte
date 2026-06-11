<script lang="ts">
	import { slide } from 'svelte/transition';
	import Markdown from '$lib/components/Markdown.svelte';
	interface ToolCallData {
		id: string;
		name: string;
		args?: unknown;
		result?: unknown;
		isError?: boolean;
	}
	interface ToolResult {
		result: string;
		isError: boolean;
	}

	let {
		toolCall,
		result,
		open = false
	}: {
		toolCall: ToolCallData;
		result?: ToolResult | null;
		open?: boolean;
	} = $props();
</script>

<div class="rounded-lg border border-muted-foreground/20">
	<button
		type="button"
		onclick={() => (open = !open)}
		class="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-muted/30 focus-visible:outline-none"
	>
		<span class="flex items-center gap-1.5">
			<span class="inline-block size-1.5 rounded-full bg-current"></span>
			{toolCall.name}
			{#if result?.isError || toolCall.isError}
				<span class="ml-1 text-destructive">error</span>
			{/if}
		</span>
		<svg
			class="size-3 text-muted-foreground transition-transform duration-200 {open ? 'rotate-180' : ''}"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="M6 9l6 6 6-6" />
		</svg>
	</button>
	{#if open}
		<div
			transition:slide={{ duration: 200 }}
			class="border-t border-muted-foreground/20 px-3 py-2"
		>
			{#if toolCall.args}
				<div class="mb-1.5">
					<span class="text-[10px] font-medium tracking-wider text-muted-foreground uppercase"
						>Args</span
					>
					<pre
						class="mt-0.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">{JSON.stringify(
							toolCall.args,
							null,
							2
						)}</pre>
				</div>
			{/if}
			{#if result}
				<div>
					<span class="text-[10px] font-medium tracking-wider text-muted-foreground uppercase"
						>Result</span
					>
					<div
						class="mt-0.5 max-h-32 overflow-y-auto rounded bg-background/50 p-2 font-mono text-[11px] leading-relaxed"
					>
						<Markdown content={result.result} />
					</div>
				</div>
			{:else if !toolCall.isError}
				<span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
					<span class="inline-block size-1 animate-pulse rounded-full bg-current"></span>
					Running...
				</span>
			{/if}
		</div>
	{/if}
</div>
