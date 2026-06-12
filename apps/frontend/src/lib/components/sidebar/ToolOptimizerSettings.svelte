<script lang="ts">
	import { browser } from '$app/environment';
	import { headroomInstallStore } from '$lib/stores/headroom-install.svelte.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import Icon from '../Icon.svelte';
	import { Tick02Icon } from '@hugeicons/core-free-icons';
	import type { AppSettings } from '@stratum/shared/entities/app-settings.js';

	interface Props {
		defaultHeadroomEnabled: boolean;
		defaultHeadroomCodeAst: boolean;
		defaultHeadroomCcr: boolean;
		defaultHeadroomKompressModel: string;
		headroomModelOptions: Array<{ value: string; label: string }>;
		currentHeadroomModelLabel: string;
		saveSettings: (fields: Partial<AppSettings>) => Promise<void>;
	}

	let {
		defaultHeadroomEnabled,
		defaultHeadroomCodeAst,
		defaultHeadroomCcr,
		defaultHeadroomKompressModel,
		headroomModelOptions,
		currentHeadroomModelLabel,
		saveSettings
	}: Props = $props();

	let headroomModelSwitcherOpen = $state(false);
	let showTerminal = $state(false);
	let preElement = $state<HTMLPreElement | null>(null);

	$effect(() => {
		if (headroomInstallStore.installLog && preElement) {
			preElement.scrollTop = preElement.scrollHeight;
		}
	});

	$effect(() => {
		if (headroomInstallStore.installingFeature) {
			showTerminal = true;
		}
	});

	async function onHeadroomModelSelect(value: string) {
		headroomModelSwitcherOpen = false;
		await saveSettings({ defaultHeadroomKompressModel: value });
	}
</script>

<div
	class="space-y-4 rounded-xl border border-primary/20 bg-gradient-to-br from-sidebar-accent/15 via-sidebar-accent/10 to-primary/5 p-3.5 shadow-sm transition-all duration-300 hover:border-primary/30 max-md:space-y-3 max-md:p-2.5"
>
	<div class="flex items-center justify-between gap-4">
		<div class="flex flex-col gap-0.5">
			<span class="flex items-center gap-1.5 text-xs font-semibold text-sidebar-foreground">
				<svg
					class="size-4 text-primary opacity-90"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						d="M4 14a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2z"
					/>
					<path d="M12 4v4" />
					<path d="M8 18v2" />
					<path d="M16 18v2" />
				</svg>
				Tool Output Optimizer
			</span>
			<span class="block text-[10px] leading-relaxed text-sidebar-foreground/50">
				Compress verbose command outputs, file content, and session history to save tokens.
			</span>
		</div>
		<Switch
			checked={defaultHeadroomEnabled}
			onCheckedChange={(checked) => saveSettings({ defaultHeadroomEnabled: checked })}
		/>
	</div>

	{#if defaultHeadroomEnabled}
		<div class="space-y-4 border-t border-border/15 pt-3">
			<!-- AST -->
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between gap-4">
					<div class="flex flex-col gap-0.5">
						<span
							class="flex items-center gap-1.5 text-xs font-semibold text-sidebar-foreground/85"
						>
							AST Code Optimizer
							{#if !headroomInstallStore.headroomCodeInstalled}
								<span
									class="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-500"
								>
									<span class="size-1 shrink-0 animate-ping rounded-full bg-amber-500"
									></span>
									Package required
								</span>
							{/if}
						</span>
						<span class="text-[10px] leading-relaxed text-sidebar-foreground/45">
							Strip method/function bodies from files during code reading tasks.
						</span>
					</div>
					{#if headroomInstallStore.headroomCodeInstalled}
						<Switch
							checked={defaultHeadroomCodeAst}
							onCheckedChange={(checked) =>
								saveSettings({ defaultHeadroomCodeAst: checked })}
							size="sm"
						/>
					{:else}
						<button
							type="button"
							onclick={() => headroomInstallStore.installFeature('code')}
							disabled={headroomInstallStore.installingFeature !== null}
							class="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-500 transition-all hover:bg-amber-500/20 active:scale-95 disabled:opacity-50"
						>
							Install
						</button>
					{/if}
				</div>
			</div>

			<!-- CCR -->
			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-col gap-0.5">
					<span class="text-xs font-semibold text-sidebar-foreground/85"
						>Reversible Store (CCR)</span
					>
					<span class="text-[10px] leading-relaxed text-sidebar-foreground/45">
						Use references for compressed code so the agent can retrieve the full file
						dynamically.
					</span>
				</div>
				<Switch
					checked={defaultHeadroomCcr}
					onCheckedChange={(checked) => saveSettings({ defaultHeadroomCcr: checked })}
					size="sm"
				/>
			</div>

			<!-- Prose Model Select -->
			<div class="space-y-2">
				<span
					class="flex items-center gap-1.5 text-[11px] font-semibold text-sidebar-foreground/75"
				>
					Prose / Log Compressor
					{#if !headroomInstallStore.headroomMlInstalled}
						<span
							class="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-500"
						>
							<span class="size-1 shrink-0 animate-ping rounded-full bg-amber-500"></span>
							ML required
						</span>
					{/if}
				</span>

				{#if browser}
					<Popover.Root bind:open={headroomModelSwitcherOpen}>
						<Popover.Trigger
							class="flex w-full items-center justify-between gap-2 rounded-lg border border-border/40 bg-sidebar-accent/20 px-3 py-2 text-xs text-sidebar-foreground transition-all hover:border-primary/30 hover:bg-sidebar-accent/40 focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
						>
							<span class="truncate text-xs font-medium">{currentHeadroomModelLabel}</span>
							<svg
								class="size-3 shrink-0 opacity-60"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M6 9l6 6 6-6" />
							</svg>
						</Popover.Trigger>
						<Popover.Content
							side="top"
							sideOffset={6}
							align="start"
							class="w-64 border-border/40 p-0 shadow-lg"
							onOpenAutoFocus={(e) => e.preventDefault()}
							onCloseAutoFocus={(e) => e.preventDefault()}
						>
							<Command.Root value={defaultHeadroomKompressModel}>
								<Command.Input placeholder="Search compressor model..." />
								<Command.List class="max-h-60">
									<Command.Group heading="Default Engines">
										{#each headroomModelOptions.filter((opt) => opt.value === 'kompress-base' || opt.value === 'off') as opt}
											<Command.Item
												value={opt.value}
												onclick={() => onHeadroomModelSelect(opt.value)}
											>
												<span class="text-xs">{opt.label}</span>
												{#if opt.value === defaultHeadroomKompressModel}
													<Icon icon={Tick02Icon} class="ml-auto size-3.5 text-primary" />
												{/if}
											</Command.Item>
										{/each}
									</Command.Group>
									{#if headroomModelOptions.some((opt) => opt.value !== 'kompress-base' && opt.value !== 'off')}
										<Command.Group heading="Configured Models">
											{#each headroomModelOptions.filter((opt) => opt.value !== 'kompress-base' && opt.value !== 'off') as opt}
												<Command.Item
													value={opt.value}
													onclick={() => onHeadroomModelSelect(opt.value)}
												>
													<span class="truncate text-xs">{opt.label}</span>
													{#if opt.value === defaultHeadroomKompressModel}
														<Icon icon={Tick02Icon} class="ml-auto size-3.5 text-primary" />
													{/if}
												</Command.Item>
											{/each}
										</Command.Group>
									{/if}
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				{:else}
					<button
						type="button"
						disabled
						class="flex w-full items-center justify-between gap-2 rounded-lg border border-border/30 bg-sidebar-accent/30 px-3 py-2 text-sm text-sidebar-foreground"
					>
						<span class="truncate text-xs">{currentHeadroomModelLabel}</span>
						<svg
							class="size-3 shrink-0 opacity-60"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M6 9l6 6 6-6" />
						</svg>
					</button>
				{/if}

				<!-- ML package install check -->
				{#if defaultHeadroomKompressModel === 'kompress-base' && !headroomInstallStore.headroomMlInstalled}
					<div
						class="mt-2 animate-in space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 duration-200 fade-in slide-in-from-top-1"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="space-y-1">
								<span
									class="flex items-center gap-1.5 text-[11px] font-semibold text-amber-500"
								>
									<svg
										class="size-3.5 shrink-0 text-amber-500"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
										/>
									</svg>
									ML Engines Required
								</span>
								<span class="block text-[10px] leading-normal text-sidebar-foreground/60">
									ModernBERT compressor requires ML libraries (`torch`, `transformers`) to
									run locally.
								</span>
							</div>
							<button
								type="button"
								onclick={() => headroomInstallStore.installFeature('ml')}
								disabled={headroomInstallStore.installingFeature !== null}
								class="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-500 transition-all hover:bg-amber-500/25 active:scale-95 disabled:opacity-50"
							>
								Install
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Installation streaming logs console -->
			{#if showTerminal && headroomInstallStore.installingFeature}
				<div
					class="mt-4 animate-in overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-[10px] text-zinc-300 shadow-2xl duration-300 fade-in slide-in-from-bottom-2"
				>
					<!-- Terminal Title Bar -->
					<div
						class="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-2"
					>
						<div class="flex items-center gap-1.5">
							<span class="size-2 rounded-full bg-red-500/80"></span>
							<span class="size-2 rounded-full bg-yellow-500/80"></span>
							<span class="size-2 animate-pulse rounded-full bg-green-500/80"></span>
							<span class="ml-1.5 font-sans text-[10px] font-semibold text-zinc-400"
								>pip installer</span
							>
						</div>
						<button
							type="button"
							class="text-[10px] text-zinc-500 transition-colors hover:text-zinc-300"
							onclick={() => {
								showTerminal = false;
							}}
						>
							Dismiss
						</button>
					</div>
					<!-- Terminal Body -->
					<div class="bg-black/40 p-3">
						<div class="mb-1.5 flex items-center gap-1.5 font-semibold text-emerald-400">
							<span class="text-zinc-500">$</span>
							Installing {headroomInstallStore.installingFeature === 'code'
								? 'AST Optimizer (headroom-ai[code])'
								: 'ML Engine (headroom-ai[ml])'}...
						</div>
						<pre
							bind:this={preElement}
							class="max-h-48 scrollbar-thin scrollbar-thumb-zinc-800 overflow-y-auto rounded-lg border border-zinc-800/40 bg-black/60 p-2.5 font-mono leading-relaxed whitespace-pre-wrap text-zinc-400 selection:bg-primary/20">{headroomInstallStore.installLog}</pre>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
