<script lang="ts">
	import type { ChatMessage } from '@opaius/shared/entities/chat-message.js';
	import type { ActiveStream } from '@opaius/shared/entities/active-stream.js';
	import { onMount } from 'svelte';
	import AnimatedNumber from '$lib/components/AnimatedNumber.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import {
		ArrowRight01Icon,
		ActivityIcon,
		AnalyticsIcon,
		InfinityIcon
	} from '@hugeicons/core-free-icons';

	let {
		messages = [] as ChatMessage[],
		activeStreams = [] as ActiveStream[],
		sessionId,
		headroomEnabled = true,
		contextWindow = 20
	}: {
		messages?: ChatMessage[];
		activeStreams?: ActiveStream[];
		sessionId: string | null | undefined;
		headroomEnabled?: boolean;
		contextWindow?: number;
	} = $props();

	let open = $state(false);

	// ── Compression stats (from messages and active streams) ──
	function calcCompressionStats(msgs: ChatMessage[], streams: ActiveStream[]) {
		let saved = 0;
		let count = 0;
		let ratioSum = 0;
		for (const m of msgs) {
			if (m.role === 'assistant' && (m.headroomTokensSaved || 0) > 0) {
				saved += m.headroomTokensSaved;
				count++;
				ratioSum += m.headroomRatio ?? 1;
			}
		}
		for (const s of streams) {
			if (s.headroomTokensSaved > 0) {
				saved += s.headroomTokensSaved;
				count++;
				ratioSum += s.headroomRatio;
			}
		}
		return { saved, count, avgRatio: count > 0 ? ratioSum / count : 1 };
	}

	let compStats = $derived(calcCompressionStats(messages, activeStreams));

	// ── Session usage totals (from messages) ──
	function calcUsageTotals(msgs: ChatMessage[]) {
		let input = 0;
		let output = 0;
		let cacheR = 0;
		let cacheW = 0;
		let cost = 0;
		for (const m of msgs) {
			input += m.inputTokens ?? 0;
			output += m.outputTokens ?? 0;
			cacheR += m.cacheReadTokens ?? 0;
			cacheW += m.cacheWriteTokens ?? 0;
			cost += (m as ChatMessage).usageCost ?? 0;
		}
		const last = msgs.filter((m) => m.role === 'assistant').slice(-1)[0];
		return {
			input,
			output,
			cacheR,
			cacheW,
			cost,
			total: msgs.length,
			lastInput: last?.inputTokens ?? 0
		};
	}
	let usage = $derived(calcUsageTotals(messages));
	function fmtTokens(n: number): string {
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
		if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
		return String(n);
	}

	function fmtCost(n: number): string {
		if (n === 0) return '—';
		return '$' + n.toFixed(6);
	}

	function fmtRatio(count: number, avgRatio: number): string {
		return count > 0 && avgRatio < 1 ? Math.round((1 - avgRatio) * 100) + '% saved' : '—';
	}
</script>

<!-- Floating trigger arrow -->
<button
	type="button"
	onclick={() => (open = !open)}
	class="fixed top-1/2 right-3 z-50 flex h-14
		w-6 -translate-y-1/2 cursor-pointer
		items-center justify-center rounded-l-lg border border-r-0
		border-border/60 bg-card text-foreground shadow-lg backdrop-blur-2xl
		transition-transform duration-200 ease-linear hover:bg-white/5
		focus-visible:ring-2
		focus-visible:ring-ring focus-visible:outline-none max-sm:hidden
		{open ? 'translate-x-[-320px]' : ''}"
	aria-label="{open ? 'Close' : 'Open'} session stats"
>
	<Icon
		icon={ArrowRight01Icon}
		class="size-4 {open ? 'rotate-180' : ''} transition-transform duration-200 ease-linear"
		strokeWidth={2.5}
	/>
</button>
<!-- Widget panel — always in DOM, transitions like shadcn sidebar -->
<div
	class="fixed inset-y-3 right-3 z-40 flex w-80 flex-col rounded-2xl
		border border-border/60 bg-card/95 shadow-2xl backdrop-blur-3xl transition-transform
		duration-200 ease-linear max-sm:hidden
		{open ? 'translate-x-0' : 'translate-x-[calc(100%+16px)]'}"
>
	<!-- Header -->
	<div class="flex items-center gap-2 border-b border-border/30 px-4 py-3.5">
		<svg
			class="size-4 shrink-0 text-primary"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<rect x="3" y="3" width="7" height="7" rx="1" />
			<rect x="14" y="3" width="7" height="7" rx="1" />
			<rect x="3" y="14" width="7" height="7" rx="1" />
			<rect x="14" y="14" width="7" height="7" rx="1" />
		</svg>
		<span class="text-xs font-semibold tracking-wide text-foreground/80 uppercase"
			>Session Stats</span
		>
	</div>

	<div class="flex-1 space-y-6 overflow-y-auto px-4 py-4">
		<!-- Headroom compression section -->
		<div class="space-y-2.5">
			<div
				class="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
			>
				<Icon icon={ActivityIcon} class="size-3.5" />
				<span>Headroom Compression</span>
			</div>

			{#if compStats.count > 0}
				<div class="grid grid-cols-2 gap-2">
					<div class="rounded-lg border border-primary/15 bg-primary/8 px-3 py-2">
						<div class="text-[10px] tracking-wider text-muted-foreground uppercase">
							Tokens Saved
						</div>
						<div class="text-sm font-semibold text-foreground tabular-nums">
							<AnimatedNumber value={compStats.saved} />
						</div>
					</div>
					<div class="rounded-lg border border-primary/15 bg-primary/8 px-3 py-2">
						<div class="text-[10px] tracking-wider text-muted-foreground uppercase">
							Avg Reduction
						</div>
						<div class="text-sm font-semibold text-foreground tabular-nums">
							{fmtRatio(compStats.count, compStats.avgRatio)}
						</div>
					</div>
				</div>
				<div class="rounded-lg border border-primary/15 bg-primary/8 px-3 py-2">
					<div class="text-[10px] tracking-wider text-muted-foreground uppercase">Compressions</div>
					<div class="text-sm font-semibold text-foreground tabular-nums">
						<AnimatedNumber value={compStats.count} />
					</div>
				</div>
			{:else}
				<div class="rounded-lg bg-muted/20 px-3 py-3 text-xs text-muted-foreground/60 italic">
					{#if !sessionId}
						Start a session to see compression stats.
					{:else if !headroomEnabled}
						Compression is disabled for this session.
					{:else}
						Compression is active. Waiting for context to grow...
					{/if}
				</div>
			{/if}
		</div>

		<div class="border-t border-border/15"></div>

		<!-- Session usage section -->
		<div class="space-y-2.5">
			<div
				class="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
			>
				<Icon icon={AnalyticsIcon} class="size-3.5" />
				<span>Session Usage</span>
			</div>

			{#if usage.total > 0}
				<div class="grid grid-cols-2 gap-2">
					<div class="rounded-lg border border-border/20 bg-card px-3 py-2">
						<div class="text-[10px] tracking-wider text-muted-foreground uppercase">
							Input Tokens
						</div>
						<div class="text-sm font-semibold text-foreground tabular-nums">
							<AnimatedNumber value={usage.input} />
						</div>
					</div>
					<div class="rounded-lg border border-border/20 bg-card px-3 py-2">
						<div class="text-[10px] tracking-wider text-muted-foreground uppercase">
							Output Tokens
						</div>
						<div class="text-sm font-semibold text-foreground tabular-nums">
							<AnimatedNumber value={usage.output} />
						</div>
					</div>
				</div>

				{#if usage.cacheR > 0 || usage.cacheW > 0}
					<div class="grid grid-cols-2 gap-2">
						<div class="rounded-lg border border-border/20 bg-card px-3 py-2">
							<div class="text-[10px] tracking-wider text-muted-foreground uppercase">
								Cache Read
							</div>
							<div class="text-sm font-semibold text-foreground tabular-nums">
								<AnimatedNumber value={usage.cacheR} />
							</div>
						</div>
						<div class="rounded-lg border border-border/20 bg-card px-3 py-2">
							<div class="text-[10px] tracking-wider text-muted-foreground uppercase">
								Cache Write
							</div>
							<div class="text-sm font-semibold text-foreground tabular-nums">
								<AnimatedNumber value={usage.cacheW} />
							</div>
						</div>
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-2">
					<div class="rounded-lg border border-border/20 bg-card px-3 py-2">
						<div class="text-[10px] tracking-wider text-muted-foreground uppercase">Messages</div>
						<div class="text-sm font-semibold text-foreground tabular-nums">
							<AnimatedNumber value={usage.total} />
						</div>
					</div>
					<div class="rounded-lg border border-secondary/20 bg-secondary/10 px-3 py-2">
						<div
							class="flex items-center gap-1.5 text-[10px] tracking-wider text-muted-foreground uppercase"
						>
							<Icon icon={InfinityIcon} class="size-3" />
							<span>Total Cost</span>
						</div>
						<div class="text-sm font-semibold text-foreground tabular-nums">
							{fmtCost(usage.cost)}
						</div>
					</div>
				</div>
			{:else}
				<div class="rounded-lg bg-muted/20 px-3 py-3 text-xs text-muted-foreground/60 italic">
					No messages yet. Start a conversation.
				</div>
			{/if}
		</div>

		<div class="border-t border-border/15"></div>

		<!-- Active Context section -->
		<div class="space-y-2.5">
			<div
				class="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
			>
				<svg
					class="size-3.5 text-muted-foreground"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M4 19v-2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
					<circle cx="12" cy="7" r="4" />
				</svg>
				<span>Active Context</span>
			</div>

			{#if usage.total > 0}
				<div class="grid grid-cols-2 gap-2">
					<div class="rounded-lg border border-border/20 bg-card px-3 py-2">
						<div class="text-[10px] tracking-wider text-muted-foreground uppercase">
							Context Used
						</div>
						<div class="text-sm font-semibold text-foreground tabular-nums">
							{fmtTokens(usage.lastInput)} / {fmtTokens(contextWindow)} tokens
						</div>
					</div>
					<div class="rounded-lg border border-secondary/20 bg-secondary/10 px-3 py-2">
						<div
							class="flex items-center gap-1.5 text-[10px] tracking-wider text-muted-foreground uppercase"
						>
							Fill
						</div>
						<div class="text-sm font-semibold text-foreground tabular-nums">
							{Math.min(Math.max(Math.round((usage.lastInput / contextWindow) * 100), 0), 100)}%
						</div>
					</div>
				</div>
			{:else}
				<div class="rounded-lg bg-muted/20 px-3 py-3 text-xs text-muted-foreground/60 italic">
					No active context yet.
				</div>
			{/if}
		</div>
	</div>
</div>
