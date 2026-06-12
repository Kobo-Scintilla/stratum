<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { remult } from 'remult';
	import { AppSettings } from '@stratum/shared/entities/app-settings.js';
	import { AgentService } from '@stratum/shared/controllers/agent-service.js';
	import { useDashboardState } from '$lib/stores/dashboard-state.svelte.js';
	import { headroomInstallStore } from '$lib/stores/headroom-install.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import Icon from '../Icon.svelte';
	import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
	import { AiBrain05Icon, Tick02Icon } from '@hugeicons/core-free-icons';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import ToolOptimizerSettings from './ToolOptimizerSettings.svelte';

	const thinkingOptions = [
		{ value: 'off', label: 'Disabled' },
		{ value: 'minimal', label: 'Minimal' },
		{ value: 'low', label: 'Low' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'High' },
		{ value: 'xhigh', label: 'Max' }
	];
	const dashboard = useDashboardState();
	let settings = $state<AppSettings | null>(dashboard.defaults);
	let providerInfo = $state<
		Array<{ id: string; models: Array<{ id: string; contextWindow: number }> }>
	>(dashboard.providers);
	let enabledProviders = $state<Set<string>>(
		new Set(dashboard.configured.filter((c) => c.enabled && c.hasKey).map((c) => c.id))
	);
	let loaded = $state(dashboard.defaults !== null);
	let modelSwitcherOpen = $state(false);
	let thinkingSwitcherOpen = $state(false);
	let titleSummaryModelSwitcherOpen = $state(false);
	let saving = $state(false);
	let showSavingIndicator = $state(false);
	let saveTimeout = $state<any>(null);

	let defaultModelProvider = $derived(settings?.defaultModelProvider ?? '');
	let defaultModelId = $derived(settings?.defaultModelId ?? '');
	let defaultThinkingLevel = $derived(settings?.defaultThinkingLevel ?? 'medium');
	let titleSummaryModelProvider = $derived(settings?.titleSummaryModelProvider ?? '');
	let titleSummaryModelId = $derived(settings?.titleSummaryModelId ?? '');
	let defaultHeadroomEnabled = $derived(settings?.defaultHeadroomEnabled ?? true);
	let defaultHeadroomCodeAst = $derived(settings?.defaultHeadroomCodeAst ?? true);
	let defaultHeadroomKompressModel = $derived(settings?.defaultHeadroomKompressModel ?? 'off');
	let defaultHeadroomCcr = $derived(settings?.defaultHeadroomCcr ?? true);

	const currentModelLabel = $derived(
		defaultModelProvider && defaultModelId ? `${defaultModelProvider}:${defaultModelId}` : 'Not set'
	);
	const currentThinkingLabel = $derived(
		thinkingOptions.find((o) => o.value === defaultThinkingLevel)?.label ?? 'Medium'
	);
	const currentTitleSummaryModelLabel = $derived(
		titleSummaryModelProvider && titleSummaryModelId
			? `${titleSummaryModelProvider}:${titleSummaryModelId}`
			: 'Default (Same as session model)'
	);

	const activeTitleSummaryValue = $derived(
		titleSummaryModelProvider && titleSummaryModelId
			? `${titleSummaryModelProvider}:${titleSummaryModelId}`
			: 'default'
	);

	const modelGroups = $derived(
		providerInfo
			.filter((p) => p.models.length > 0 && enabledProviders.has(p.id))
			.map((p) => ({
				provider: p.id,
				models: p.models.map((m) => ({
					value: `${p.id}:${m.id}`,
					label: m.id,
					provider: p.id
				}))
			}))
	);

	const headroomModelOptions = $derived([
		{ value: 'kompress-base', label: 'Kompress Base (Local ML)' },
		{ value: 'off', label: 'Disabled (No Prose Comp)' },
		...modelGroups.flatMap((g) =>
			g.models.map((m) => ({
				value: m.value,
				label: `${g.provider}: ${m.label}`
			}))
		)
	]);

	const currentHeadroomModelLabel = $derived(
		headroomModelOptions.find((o) => o.value === defaultHeadroomKompressModel)?.label ??
			defaultHeadroomKompressModel
	);

	const activeValue = $derived(
		defaultModelProvider && defaultModelId ? `${defaultModelProvider}:${defaultModelId}` : ''
	);

	onMount(async () => {
		headroomInstallStore.checkFeatures().catch(() => {});

		const hasInitialData = dashboard.defaults !== null;
		if (hasInitialData) {
			loaded = true;
		}

		try {
			const [providers, configured, appSettings] = await Promise.all([
				remult
					.call(AgentService.getProvidersInfo, undefined)
					.catch(
						() => [] as Array<{ id: string; models: Array<{ id: string; contextWindow: number }> }>
					),
				remult
					.call(AgentService.getConfiguredProviders, undefined)
					.catch(() => [] as Array<{ id: string; enabled: boolean; hasKey: boolean }>),
				remult
					.repo(AppSettings)
					.findId('_defaults')
					.catch(() => null) as Promise<AppSettings | null>
			]);
			providerInfo = providers;
			enabledProviders = new Set(
				(configured as Array<{ id: string; enabled: boolean; hasKey: boolean }>)
					.filter((c) => c.enabled && c.hasKey)
					.map((c) => c.id)
			);
			settings = appSettings;
			loaded = true;
		} catch (e) {
			console.error('[SidebarSettingsPanel] background fetch failed', e);
			loaded = true;
		}
	});

	async function onModelSelect(value: string) {
		const [provider, ...rest] = value.split(':');
		const model = rest.join(':');
		modelSwitcherOpen = false;
		await saveSettings({ defaultModelProvider: provider, defaultModelId: model });
	}

	async function onThinkingSelect(value: string) {
		thinkingSwitcherOpen = false;
		await saveSettings({ defaultThinkingLevel: value });
	}

	async function onTitleSummaryModelSelect(value: string) {
		titleSummaryModelSwitcherOpen = false;
		if (value === 'default') {
			await saveSettings({ titleSummaryModelProvider: '', titleSummaryModelId: '' });
		} else {
			const [provider, ...rest] = value.split(':');
			const model = rest.join(':');
			await saveSettings({ titleSummaryModelProvider: provider, titleSummaryModelId: model });
		}
	}



	async function saveSettings(fields: Partial<AppSettings>) {
		saving = true;
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			if (saving) showSavingIndicator = true;
		}, 150);

		try {
			if (settings) {
				settings = await remult.repo(AppSettings).save({ ...settings, ...fields });
			} else {
				settings = await remult.repo(AppSettings).insert({
					id: '_defaults',
					defaultModelProvider: fields.defaultModelProvider ?? '',
					defaultModelId: fields.defaultModelId ?? '',
					defaultHeadroomEnabled: fields.defaultHeadroomEnabled ?? true,
					defaultHeadroomCodeAst: fields.defaultHeadroomCodeAst ?? true,
					defaultHeadroomKompressModel: fields.defaultHeadroomKompressModel ?? 'off',
					defaultHeadroomCcr: fields.defaultHeadroomCcr ?? true,
					defaultThinkingLevel: fields.defaultThinkingLevel ?? 'medium',
					titleSummaryModelProvider: fields.titleSummaryModelProvider ?? '',
					titleSummaryModelId: fields.titleSummaryModelId ?? ''
				});
			}
		} catch (e) {
			console.error('[settings] save failed', e);
		} finally {
			saving = false;
			if (saveTimeout) clearTimeout(saveTimeout);
			showSavingIndicator = false;
		}
	}
</script>

<div class="flex h-full flex-col overflow-hidden">
	<Sidebar.Header
		class="shrink-0 gap-3.5 border-b bg-sidebar-accent/5 px-4 py-3 max-md:px-3 max-md:py-2.5"
	>
		<div class="flex w-full items-center justify-between">
			<div class="flex items-center gap-2">
				<div class="rounded bg-primary/10 p-1">
					<svg
						class="size-4 text-primary"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
						/>
						<circle cx="12" cy="12" r="3" />
					</svg>
				</div>
				<h2 class="text-sm font-semibold text-sidebar-foreground">Default Settings</h2>
			</div>
			{#if showSavingIndicator}
				<div
					class="flex animate-pulse items-center gap-1 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
				>
					Saving...
				</div>
			{/if}
		</div>
		<p class="text-[11px] leading-normal text-sidebar-foreground/60">
			Configure default models, thinking levels, and tool output compression settings.
		</p>
	</Sidebar.Header>

	<Sidebar.Content class="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
		<ScrollArea.Root class="h-full w-full flex-1">
			<div class="space-y-4 p-4 max-md:space-y-3 max-md:p-3">
				<!-- General Settings Card Group -->
				<div
					class="space-y-4 rounded-xl border border-border/30 bg-sidebar-accent/10 p-3.5 shadow-sm max-md:space-y-3 max-md:p-2.5"
				>
					<div class="flex items-center gap-2 border-b border-border/15 pb-2">
						<svg
							class="size-3.5 text-sidebar-foreground/60"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<circle cx="12" cy="12" r="10" />
							<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
						</svg>
						<span class="text-xs font-semibold text-sidebar-foreground">General Settings</span>
					</div>

					<div class="space-y-2">
						<span class="text-[11px] font-medium text-sidebar-foreground/80">Default Model</span>

						<Skeleton name="default-model-selector" loading={!loaded}>
							{#snippet fallback()}
								<div class="animate-pulse space-y-2">
									<div class="h-9 w-full rounded-lg bg-sidebar-foreground/10"></div>
								</div>
							{/snippet}

							{#if modelGroups.length > 0}
								{#if browser}
									<Popover.Root bind:open={modelSwitcherOpen}>
										<Popover.Trigger
											class="flex w-full items-center justify-between gap-2 rounded-lg border border-border/40 bg-sidebar-accent/25 px-3 py-2 text-xs text-sidebar-foreground transition-all hover:border-primary/30 hover:bg-sidebar-accent/40 focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
										>
											<span class="truncate text-xs font-medium">{currentModelLabel}</span>
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
											<Command.Root value={activeValue}>
												<Command.Input placeholder="Search models..." />
												<Command.List class="max-h-60">
													{#each modelGroups as group}
														<Command.Group heading={group.provider}>
															{#each group.models as m}
																<Command.Item
																	value={m.value}
																	onclick={() => onModelSelect(m.value)}
																>
																	<span
																		class="w-16 shrink-0 truncate font-mono text-[11px] text-muted-foreground"
																		>{m.provider}</span
																	>
																	<span class="truncate text-xs">{m.label}</span>
																	{#if m.value === activeValue}
																		<Icon icon={Tick02Icon} class="ml-auto size-3.5 text-primary" />
																	{/if}
																</Command.Item>
															{/each}
														</Command.Group>
													{/each}
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
										<span class="truncate text-xs">{currentModelLabel}</span>
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
							{:else}
								<div
									class="rounded-lg border border-dashed border-border/30 px-3 py-2 text-xs text-sidebar-foreground/40 italic"
								>
									No providers configured. Add one in the sidebar first.
								</div>
							{/if}
						</Skeleton>
					</div>

					<div class="space-y-2">
						<span class="text-[11px] font-medium text-sidebar-foreground/80"
							>Default Thinking Level</span
						>

						{#if browser}
							<Popover.Root bind:open={thinkingSwitcherOpen}>
								<Popover.Trigger
									class="flex w-full items-center justify-between gap-2 rounded-lg border border-border/40 bg-sidebar-accent/25 px-3 py-2 text-xs text-sidebar-foreground transition-all hover:border-primary/30 hover:bg-sidebar-accent/40 focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
								>
									<div class="flex items-center gap-1.5">
										<Icon icon={AiBrain05Icon} class="size-4 text-primary opacity-70" />
										<span class="text-xs font-medium">{currentThinkingLabel}</span>
									</div>
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
									class="w-44 border-border/40 p-0 shadow-lg"
									onOpenAutoFocus={(e) => e.preventDefault()}
									onCloseAutoFocus={(e) => e.preventDefault()}
								>
									<Command.Root value={defaultThinkingLevel}>
										<Command.List>
											<Command.Group heading="Thinking Level">
												{#each thinkingOptions as opt}
													<Command.Item
														value={opt.value}
														onclick={() => onThinkingSelect(opt.value)}
													>
														<span class="text-xs">{opt.label}</span>
														{#if opt.value === defaultThinkingLevel}
															<Icon icon={Tick02Icon} class="ml-auto size-3.5 text-primary" />
														{/if}
													</Command.Item>
												{/each}
											</Command.Group>
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
								<div class="flex items-center gap-1.5 opacity-60">
									<Icon icon={AiBrain05Icon} class="size-4 text-primary" />
									<span class="text-xs">{currentThinkingLabel}</span>
								</div>
								<svg
									class="size-3 shrink-0 opacity-40"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="M6 9l6 6 6-6" />
								</svg>
							</button>
						{/if}
					</div>
				</div>

				<!-- Tool Output Compression Card Group -->
				<ToolOptimizerSettings
					{defaultHeadroomEnabled}
					{defaultHeadroomCodeAst}
					{defaultHeadroomCcr}
					{defaultHeadroomKompressModel}
					{headroomModelOptions}
					{currentHeadroomModelLabel}
					{saveSettings}
				/>

				<div
					class="space-y-4 rounded-xl border border-border/30 bg-sidebar-accent/10 p-3.5 shadow-sm max-md:space-y-3 max-md:p-2.5"
				>
					<div class="flex items-center gap-2 border-b border-border/15 pb-2">
						<svg
							class="size-3.5 text-sidebar-foreground/60"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M4 6h16M4 12h16M4 18h7" />
						</svg>
						<span class="text-xs font-semibold text-sidebar-foreground"
							>Session Title Generation</span
						>
					</div>

					<div class="space-y-2">
						<span class="text-[11px] font-medium text-sidebar-foreground/80"
							>Title Summary Model</span
						>

						<Skeleton name="title-summary-model-selector" loading={!loaded}>
							{#snippet fallback()}
								<div class="animate-pulse space-y-2">
									<div class="h-9 w-full rounded-lg bg-sidebar-foreground/10"></div>
								</div>
							{/snippet}

							{#if modelGroups.length > 0}
								{#if browser}
									<Popover.Root bind:open={titleSummaryModelSwitcherOpen}>
										<Popover.Trigger
											class="flex w-full items-center justify-between gap-2 rounded-lg border border-border/40 bg-sidebar-accent/25 px-3 py-2 text-xs text-sidebar-foreground transition-all hover:border-primary/30 hover:bg-sidebar-accent/40 focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
										>
											<span class="truncate text-xs font-medium"
												>{currentTitleSummaryModelLabel}</span
											>
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
											<Command.Root value={activeTitleSummaryValue}>
												<Command.Input placeholder="Search models..." />
												<Command.List class="max-h-60">
													<Command.Group heading="Default">
														<Command.Item
															value="default"
															onclick={() => onTitleSummaryModelSelect('default')}
														>
															<span class="truncate text-xs">Default (Same as session model)</span>
															{#if activeTitleSummaryValue === 'default'}
																<Icon icon={Tick02Icon} class="ml-auto size-3.5 text-primary" />
															{/if}
														</Command.Item>
													</Command.Group>
													{#each modelGroups as group}
														<Command.Group heading={group.provider}>
															{#each group.models as m}
																<Command.Item
																	value={m.value}
																	onclick={() => onTitleSummaryModelSelect(m.value)}
																>
																	<span
																		class="w-16 shrink-0 truncate font-mono text-[11px] text-muted-foreground"
																		>{m.provider}</span
																	>
																	<span class="truncate text-xs">{m.label}</span>
																	{#if m.value === activeTitleSummaryValue}
																		<Icon icon={Tick02Icon} class="ml-auto size-3.5 text-primary" />
																	{/if}
																</Command.Item>
															{/each}
														</Command.Group>
													{/each}
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
										<span class="truncate text-xs">{currentTitleSummaryModelLabel}</span>
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
							{:else}
								<div
									class="rounded-lg border border-dashed border-border/30 px-3 py-2 text-xs text-sidebar-foreground/40 italic"
								>
									No providers configured. Add one in the sidebar first.
								</div>
							{/if}
						</Skeleton>
					</div>
				</div>
			</div>
		</ScrollArea.Root>
	</Sidebar.Content>
</div>
