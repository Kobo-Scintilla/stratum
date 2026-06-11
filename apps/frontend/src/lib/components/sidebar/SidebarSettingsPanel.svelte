<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { remult } from 'remult';
	import { AppSettings } from '@opaius/shared/entities/app-settings.js';
	import { AgentService } from '@opaius/shared/controllers/agent-service.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import Icon from '../Icon.svelte';
	import { AiBrain05Icon, Tick02Icon } from '@hugeicons/core-free-icons';

	const thinkingOptions = [
		{ value: 'off', label: 'Disabled' },
		{ value: 'minimal', label: 'Minimal' },
		{ value: 'low', label: 'Low' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'High' },
		{ value: 'xhigh', label: 'Max' }
	];
	let settings = $state<AppSettings | null>(null);
	let providerInfo = $state<Array<{ id: string; models: string[] }>>([]);
	let enabledProviders = $state<Set<string>>(new Set());
	let loaded = $state(false);
	let modelSwitcherOpen = $state(false);
	let thinkingSwitcherOpen = $state(false);
	let titleSummaryModelSwitcherOpen = $state(false);
	let saving = $state(false);

	let defaultModelProvider = $derived(settings?.defaultModelProvider ?? '');
	let defaultModelId = $derived(settings?.defaultModelId ?? '');
	let defaultThinkingLevel = $derived(settings?.defaultThinkingLevel ?? 'medium');
	let titleSummaryModelProvider = $derived(settings?.titleSummaryModelProvider ?? '');
	let titleSummaryModelId = $derived(settings?.titleSummaryModelId ?? '');

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

	// Only show models from providers that are configured AND enabled
	const modelGroups = $derived(
		providerInfo
			.filter((p) => p.models.length > 0 && enabledProviders.has(p.id))
			.map((p) => ({
				provider: p.id,
				models: p.models.map((m) => ({
					value: `${p.id}:${m}`,
					label: m,
					provider: p.id
				}))
			}))
	);

	const activeValue = $derived(
		defaultModelProvider && defaultModelId ? `${defaultModelProvider}:${defaultModelId}` : ''
	);

	onMount(async () => {
		const [providers, configured, appSettings] = await Promise.all([
			remult
				.call(AgentService.getProvidersInfo, undefined)
				.catch(() => [] as Array<{ id: string; models: string[] }>),
			remult
				.call(AgentService.getConfiguredProviders, undefined)
				.catch(() => [] as Array<{ id: string; enabled: boolean; hasKey: boolean }>),
			remult
				.repo(AppSettings)
				.findId('_defaults')
				.catch(() => null) as Promise<AppSettings | null>
		]);
		providerInfo = providers as Array<{ id: string; models: string[] }>;
		enabledProviders = new Set(
			(configured as Array<{ id: string; enabled: boolean; hasKey: boolean }>)
				.filter((c) => c.enabled && c.hasKey)
				.map((c) => c.id)
		);
		settings = appSettings;
		loaded = true;
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
		try {
			if (settings) {
				settings = await remult.repo(AppSettings).save({ ...settings, ...fields });
			} else {
				settings = await remult.repo(AppSettings).insert({
					id: '_defaults',
					defaultModelProvider: fields.defaultModelProvider ?? '',
					defaultModelId: fields.defaultModelId ?? '',
					defaultThinkingLevel: fields.defaultThinkingLevel ?? 'medium',
					titleSummaryModelProvider: fields.titleSummaryModelProvider ?? '',
					titleSummaryModelId: fields.titleSummaryModelId ?? ''
				});
			}
		} catch (e) {
			console.error('[settings] save failed', e);
		} finally {
			saving = false;
		}
	}
</script>

<Sidebar.Header class="gap-3.5 border-b px-4 py-3">
	<div class="flex items-center gap-2">
		<h2 class="text-sm font-semibold text-sidebar-foreground">Default Settings</h2>
	</div>
	<p class="text-xs text-sidebar-foreground/60">
		Defaults used when a session has no model or thinking level configured.
	</p>
</Sidebar.Header>

<Sidebar.Content class="p-4">
	<div class="space-y-4">
		<div class="space-y-2">
			<span class="text-xs font-medium text-sidebar-foreground/80">Default Model</span>

			{#if !loaded}
				<div
					class="animate-pulse rounded-lg border border-border/30 px-3 py-2 text-xs text-sidebar-foreground/40 italic"
				>
					Loading providers...
				</div>
			{:else if modelGroups.length > 0}
				{#if browser}
					<Popover.Root bind:open={modelSwitcherOpen}>
						<Popover.Trigger
							class="flex w-full items-center justify-between gap-2 rounded-lg border border-border/30 bg-sidebar-accent/30 px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
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
						</Popover.Trigger>
						<Popover.Content side="top" sideOffset={6} align="start" class="w-64 p-0">
							<Command.Root value={activeValue}>
								<Command.Input placeholder="Search models..." />
								<Command.List class="max-h-60">
									{#each modelGroups as group}
										<Command.Group heading={group.provider}>
											{#each group.models as m}
												<Command.Item value={m.value} onclick={() => onModelSelect(m.value)}>
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
		</div>
		<div class="space-y-2">
			<span class="text-xs font-medium text-sidebar-foreground/80">Default Thinking Level</span>

			{#if browser}
				<Popover.Root bind:open={thinkingSwitcherOpen}>
					<Popover.Trigger
						class="flex w-full items-center justify-between gap-2 rounded-lg border border-border/30 bg-sidebar-accent/30 px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
					>
						<div class="flex items-center gap-1.5">
							<Icon icon={AiBrain05Icon} class="size-4 opacity-70" />
							<span class="text-xs">{currentThinkingLabel}</span>
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
					<Popover.Content side="top" sideOffset={6} align="start" class="w-44 p-0">
						<Command.Root value={defaultThinkingLevel}>
							<Command.List>
								<Command.Group heading="Thinking Level">
									{#each thinkingOptions as opt}
										<Command.Item value={opt.value} onclick={() => onThinkingSelect(opt.value)}>
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
					<span class="text-xs">{currentThinkingLabel}</span>
				</button>
			{/if}
		</div>

		<div class="space-y-2">
			<span class="text-xs font-medium text-sidebar-foreground/80">Title Summary Model</span>

			{#if !loaded}
				<div
					class="animate-pulse rounded-lg border border-border/30 px-3 py-2 text-xs text-sidebar-foreground/40 italic"
				>
					Loading providers...
				</div>
			{:else if modelGroups.length > 0}
				{#if browser}
					<Popover.Root bind:open={titleSummaryModelSwitcherOpen}>
						<Popover.Trigger
							class="flex w-full items-center justify-between gap-2 rounded-lg border border-border/30 bg-sidebar-accent/30 px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
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
						</Popover.Trigger>
						<Popover.Content side="top" sideOffset={6} align="start" class="w-64 p-0">
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
					</button>
				{/if}
			{:else}
				<div
					class="rounded-lg border border-dashed border-border/30 px-3 py-2 text-xs text-sidebar-foreground/40 italic"
				>
					No providers configured. Add one in the sidebar first.
				</div>
			{/if}
		</div>

		{#if saving}
			<div class="text-xs text-sidebar-foreground/40 italic">Saving...</div>
		{/if}
	</div>
</Sidebar.Content>
