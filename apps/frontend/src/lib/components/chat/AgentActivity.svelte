<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import {
		AiBrain05Icon,
		ArrowDown01FreeIcons,
		Loading02FreeIcons
	} from '@hugeicons/core-free-icons';
	import ToolCall from './ToolCall.svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		activities: any[];
		isGenerating?: boolean;
		headroomTokensSaved?: number;
		headroomRatio?: number;
	}

	let {
		activities = [],
		isGenerating = false,
		headroomTokensSaved = 0,
		headroomRatio = 1
	}: Props = $props();

	let open = $state(false);

	$effect(() => {
		if (isGenerating) {
			open = true;
		}
	});

	// Summary stats
	const thoughtsCount = $derived(activities.filter((a) => a.type === 'think').length);
	const toolsCount = $derived(activities.filter((a) => a.type === 'tool').length);

	const statusText = $derived(() => {
		if (isGenerating && activities.length > 0) {
			const last = activities[activities.length - 1];
			if (last.type === 'think') return 'Thinking...';
			if (last.type === 'tool') return `Running ${last.name}...`;
			return 'Processing...';
		}

		const parts = [];
		if (thoughtsCount > 0) parts.push(`thought process`);
		if (toolsCount > 0) parts.push(`${toolsCount} tool call${toolsCount > 1 ? 's' : ''}`);
		return parts.length > 0 ? `${parts.join(' & ')} completed` : 'Thought process & tools';
	});

	const showHeadroomBadge = $derived(headroomTokensSaved > 0);
	const headroomPct = $derived(Math.round((1 - headroomRatio) * 100));
</script>

<div
	class="mb-3 overflow-hidden rounded-xl border border-border/30 bg-card/10 shadow-sm backdrop-blur-md transition-all duration-300"
>
	<!-- Trigger Header -->
	<button
		type="button"
		onclick={() => (open = !open)}
		class="flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground transition-colors select-none hover:bg-muted/10 focus-visible:outline-none"
	>
		<div class="flex items-center gap-2">
			<!-- Brain icon that pulses while running -->
			<div class="relative flex items-center justify-center">
				{#if isGenerating}
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/30 opacity-75"
					></span>
				{/if}
				<Icon
					icon={AiBrain05Icon}
					class="relative z-10 size-4 text-primary {isGenerating ? 'animate-pulse' : ''}"
				/>
			</div>

			<span class="font-semibold text-foreground/80 capitalize">{statusText()}</span>

			<!-- Headroom badge -->
			{#if showHeadroomBadge}
				<span
					class="inline-flex items-center gap-0.5 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium tracking-tight text-primary transition-all duration-200 select-none"
				>
					⚡ compressed (-{headroomPct}%)
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<!-- Animated chevron -->
			<Icon
				icon={ArrowDown01FreeIcons}
				class="size-3.5 transition-transform duration-200 {open ? 'rotate-180' : ''}"
			/>
		</div>
	</button>

	<!-- Content Area -->
	{#if open}
		<div
			transition:slide={{ duration: 200 }}
			class="border-t border-border/20 bg-muted/5 px-4 py-3"
		>
			<div class="relative ml-2.5 space-y-4 border-l border-dashed border-border/50 py-1 pl-4">
				{#each activities as step, idx (step.id || idx)}
					<div class="relative">
						<!-- Timeline Node Icon -->
						<div
							class="absolute top-0.5 -left-[23px] flex size-[14px] items-center justify-center rounded-full border border-border bg-background shadow-sm"
						>
							{#if step.type === 'think'}
								<Icon icon={AiBrain05Icon} class="size-2 text-muted-foreground" />
							{/if}
							{#if step.type === 'tool'}
								<div
									class="size-1.5 rounded-full {step.result
										? step.isError
											? 'bg-destructive'
											: 'bg-emerald-500'
										: 'animate-pulse bg-primary'}"
								></div>
							{/if}
							{#if step.type === 'info'}
								<div class="size-1 rounded-full bg-muted-foreground"></div>
							{/if}
						</div>

						<!-- Step Content -->
						<div class="space-y-1">
							<div
								class="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-foreground/60 uppercase"
							>
								{#if step.type === 'think'}
									<span>Thought Process</span>
								{:else if step.type === 'tool'}
									<span class="font-mono text-primary normal-case">{step.name}</span>
									{#if step.result}
										{#if step.isError}
											<span
												class="rounded border border-destructive/20 bg-destructive/10 px-1 font-sans text-[9px] text-destructive uppercase"
												>error</span
											>
										{:else}
											<span
												class="rounded border border-emerald-500/20 bg-emerald-500/10 px-1 font-sans text-[9px] text-emerald-500 uppercase"
												>success</span
											>
										{/if}
									{:else}
										<Icon icon={Loading02FreeIcons} class="size-3 animate-spin text-primary" />
									{/if}
								{:else if step.type === 'info'}
									<span>Update</span>
								{/if}
							</div>

							{#if step.type === 'think'}
								<div
									class="pl-1 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground/80 italic"
								>
									{step.text}
								</div>
							{/if}

							{#if step.type === 'tool'}
								<div class="max-w-full pl-1">
									<ToolCall
										toolCall={{
											id: step.id,
											name: step.name,
											args: step.args,
											isError: step.isError
										}}
										result={step.result}
										open={false}
									/>
								</div>
							{/if}

							{#if step.type === 'info'}
								<div class="pl-1 text-xs leading-relaxed text-muted-foreground/70">
									{step.text}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- Headroom detail inside panel -->
			{#if showHeadroomBadge}
				<div
					class="mt-3 flex items-center gap-1.5 rounded-lg border border-primary/10 bg-primary/5 px-2.5 py-1.5 font-mono text-[10px] tracking-tight text-primary/80"
				>
					<span
						>⚡ Headroom compressed: saved {headroomTokensSaved.toLocaleString()} tokens ({headroomPct}%
						reduction)</span
					>
				</div>
			{/if}
		</div>
	{/if}
</div>
