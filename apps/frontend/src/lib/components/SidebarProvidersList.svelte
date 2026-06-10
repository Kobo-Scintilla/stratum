<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { onMount } from 'svelte';
	import { toggleProviderEnabled, setEnabledProviders } from '$lib/stores/providers-state.svelte.js';
	import { scale } from 'svelte/transition';
	import Icon from './Icon.svelte';
	import Button from './ui/button/button.svelte';
	import { createCachedQuery } from '$lib/shared/cached-query.svelte.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import {
		Settings02FreeIcons,
		Search01FreeIcons,
		PlusSignIcon,
		LockKeyFreeIcons,
		ViewFreeIcons,
		ViewOffFreeIcons,
		CheckmarkCircle01FreeIcons,
		Delete02FreeIcons,
		ArrowDown01FreeIcons
	} from '@hugeicons/core-free-icons';

	// ── Cached queries (instant from cache, background refresh) ──
	const providerInfoQuery = createCachedQuery(
		'providerInfo',
		() => fetch('http://localhost:3001/api/getProvidersInfo', { method: 'POST' }).then(r => r.json()),
		{ persistence: 'local' }
	);
	const configuredQuery = createCachedQuery(
		'configuredProviders',
		() => fetch('http://localhost:3001/api/getConfiguredProviders', { method: 'POST' }).then(r => r.json()),
		{ persistence: 'local' }
	);

	const availableProviders = $derived(providerInfoQuery.data as Array<{ id: string; envKeys: string[]; models: string[]; isCustom: boolean }> | null);
	const loading = $derived(providerInfoQuery.loading && configuredQuery.loading);

	let configuredProviders = $state<Record<string, { enabled: boolean; hasKey: boolean; baseUrl?: string; apiType?: string; models?: string }>>({});
	let apiKeys = $state<Record<string, string>>({});
	let saving = $state<Record<string, boolean>>({});
	let saved = $state<Record<string, boolean>>({});
	let searchQuery = $state('');
	let showDropdown = $state(false);
	let openCollapsibles = $state<Record<string, boolean>>({});
	let addDialogOpen = $state(false);
	let newProviderName = $state('');
	let newProviderBaseUrl = $state('');
	let newProviderApiKey = $state('');
	let newProviderApiType = $state('openai-completions');
	let newProviderModels = $state('');
	let newProviderSaving = $state(false);

	// Sync configured from query data
	$effect(() => {
		const configs = configuredQuery.data;
		if (configs && configs.length > 0) {
			configuredProviders = Object.fromEntries(
				configs.map((c: { id: string; enabled: boolean; hasKey: boolean; baseUrl?: string; apiType?: string; models?: string }) => [
					c.id,
					{ enabled: c.enabled, hasKey: c.hasKey, baseUrl: c.baseUrl, apiType: c.apiType, models: c.models }
				])
			);
		}
	});

	// Sync enabled providers for model selector — only from fresh data (not cache seed)
	$effect(() => {
		const configs = configuredQuery.data;
		if (configs && configs.length > 0 && !configuredQuery.refreshing) {
			setEnabledProviders(new Set(configs.filter((c: { enabled: boolean; hasKey: boolean }) => c.enabled && c.hasKey).map((c: { id: string }) => c.id)));
		}
	});

	// Fetch API keys once on mount (not cached for security)
	onMount(async () => {
		try {
			const keys = await fetch('http://localhost:3001/api/getProviderApiKeys', { method: 'POST' }).then(r => r.json());
			apiKeys = Object.fromEntries(Object.entries(keys).map(([id]) => [id, '']));
		} catch (err) {
			console.error('Failed to load API keys:', err);
		}
	});
	const filteredAvailable = $derived.by(() => {
		if (!searchQuery.trim()) return [];
		const q = searchQuery.toLowerCase();
		return (availableProviders ?? []).filter(
			(p) =>
				p.id.toLowerCase().includes(q) ||
				p.models.some((m) => m.toLowerCase().includes(q))
		);
	});

	const configuredList = $derived.by(() => {
		return Object.entries(configuredProviders)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([id, cfg]) => ({
				id,
				enabled: cfg.enabled,
				hasKey: cfg.hasKey,
				baseUrl: cfg.baseUrl,
				info: (availableProviders ?? []).find((p) => p.id === id) ?? {
					id,
					envKeys: [],
					models: [],
					isCustom: !!cfg.baseUrl
				}
			}));
	});

	function isConfigured(providerId: string): boolean {
		return providerId in configuredProviders;
	}

	/** Add provider to list locally only. DB write happens when key is saved. */
	function addProvider(providerId: string) {
		configuredProviders[providerId] = { enabled: true, hasKey: false };
		searchQuery = '';
		showDropdown = false;
	}

	async function toggleProvider(providerId: string, enabled: boolean) {
		configuredProviders[providerId] = {
			...configuredProviders[providerId],
			enabled
		};
		// Sync to shared state immediately for dashboard model selector
		toggleProviderEnabled(providerId, enabled);
		// Sync to DB if entry already persisted
		if (configuredProviders[providerId]?.hasKey || configuredProviders[providerId]?.baseUrl) {
			await fetch('http://localhost:3001/api/toggleProvider', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerId, enabled }) });
		}
	}
	async function saveKey(providerId: string) {
		const key = apiKeys[providerId]?.trim() || '';
		if (!key && configuredProviders[providerId]?.hasKey) return;

		saving[providerId] = true;
		try {
			await fetch('http://localhost:3001/api/saveProviderKey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerId, apiKey: key }) });
			saved[providerId] = true;
			configuredProviders[providerId] = {
				...configuredProviders[providerId],
				enabled: configuredProviders[providerId]?.enabled ?? true,
				hasKey: !!key
			};
			// Sync to model selector — only if key was saved (provider now hasKey)
			if (configuredProviders[providerId]?.enabled && !!key) {
				toggleProviderEnabled(providerId, true);
			}
			apiKeys[providerId] = '';
			setTimeout(() => {
				saved[providerId] = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to save API key:', err);
		} finally {
			saving[providerId] = false;
		}
	}

	async function removeProvider(providerId: string) {
		delete configuredProviders[providerId];
		// Remove from model selector immediately
		toggleProviderEnabled(providerId, false);
		try {
			await fetch('http://localhost:3001/api/deleteProviderKey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerId }) });
		} catch (err) {
			console.error('Failed to remove provider:', err);
		}
	}



	async function addCustomProvider() {
		if (!newProviderName.trim() || !newProviderBaseUrl.trim()) return;
		newProviderSaving = true;
		try {
			const models = newProviderModels
				.split(',')
				.map((m) => m.trim())
				.filter(Boolean);
			await fetch('http://localhost:3001/api/saveCustomProvider', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					providerId: newProviderName.trim(),
					apiKey: newProviderApiKey,
					baseUrl: newProviderBaseUrl.trim(),
					apiType: newProviderApiType,
					models
				})
			});
			addDialogOpen = false;
			resetForm();
			await Promise.all([providerInfoQuery.refresh(), configuredQuery.refresh()]);
		} catch (err) {
			console.error('Failed to add provider:', err);
		} finally {
			newProviderSaving = false;
		}
	}

	function resetForm() {
		newProviderName = '';
		newProviderBaseUrl = '';
		newProviderApiKey = '';
		newProviderApiType = 'openai-completions';
		newProviderModels = '';
	}

	function formatName(name: string): string {
		return name
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	function statusColor(item: (typeof configuredList)[number]): string {
		if (item.hasKey && item.enabled) return 'bg-primary';
		if (item.hasKey && !item.enabled) return 'bg-muted-foreground/40';
		return 'bg-muted';
	}

	function statusTitle(item: (typeof configuredList)[number]): string {
		if (!item.hasKey) return 'No API key configured';
		if (!item.enabled) return 'Disabled';
		return 'Active';
	}
	function onSearchBlur(e: FocusEvent) {
		const related = e.relatedTarget as Node | null;
		const dropdownEl = (e.currentTarget as HTMLElement)
			.closest('.relative')
			?.querySelector('[data-dropdown]');
		if (dropdownEl && related && dropdownEl.contains(related)) {
			return;
		}
		showDropdown = false;
	}
</script>

<Sidebar.Header class="gap-3.5 border-b px-4 py-3">
	<div class="flex w-full items-center gap-3">
		<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20">
			<Icon icon={Settings02FreeIcons} class="size-4 text-primary" />
		</div>
		<span class="text-sm font-medium">LLM Providers</span>
	</div>
</Sidebar.Header>

<Sidebar.Content class="p-4">
	{#if loading}
		<div class="flex h-32 items-center justify-center text-xs text-muted-foreground">
			Loading providers...
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			<!-- Search + Dropdown -->
			<div class="relative">
				<div class="relative">
					<Icon
						icon={Search01FreeIcons}
						class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/60"
					/>
					<Input
						type="text"
						placeholder="Search providers or models..."
						bind:value={searchQuery}
						onfocus={() => (showDropdown = true)}
						onblur={onSearchBlur}
						class="pl-8 text-xs"
					/>
				</div>

				<!-- Dropdown -->
				{#if showDropdown && searchQuery.trim()}
					<div
						transition:scale={{ start: 0.95, duration: 150, opacity: 0 }}
						class="absolute z-10 mt-1 w-full rounded-xl border border-border/40 bg-popover p-1 shadow-lg origin-top"
						data-dropdown
					>
						<div class="no-scrollbar max-h-48 overflow-y-auto">
							{#if filteredAvailable.length > 0}
								{#each filteredAvailable as p (p.id)}
									<div class="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent/50">
										<div class="flex min-w-0 flex-col">
											<span class="truncate text-xs font-medium text-foreground">
												{formatName(p.id)}
											</span>
											<span class="truncate font-mono text-[10px] text-muted-foreground">
												{p.id} &middot; {p.models.length} model{p.models.length === 1 ? '' : 's'}
											</span>
										</div>
										{#if isConfigured(p.id)}
											<span class="shrink-0 text-[10px] text-muted-foreground">Added</span>
										{:else}
											<Button
												size="sm"
												class="h-6 shrink-0 px-2.5 text-[10px] font-medium"
												onclick={() => addProvider(p.id)}
											>
												Add
											</Button>
										{/if}
									</div>
								{/each}
							{:else}
								<div class="px-3 py-4 text-center text-[10px] text-muted-foreground">
									No providers match &quot;{searchQuery}&quot;
								</div>
							{/if}
						</div>
						<div class="border-t border-border/20 px-1 pt-1">
							<button
								type="button"
								class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
								onclick={() => { addDialogOpen = true; showDropdown = false; }}
							>
								<Icon icon={PlusSignIcon} class="size-3.5 shrink-0" />
								Add custom provider...
							</button>
						</div>
					</div>
				{/if}
			</div>
			<!-- Add Custom Provider Dialog -->
			<Dialog.Root bind:open={addDialogOpen}>
				<Dialog.Content class="sm:max-w-md">
					<Dialog.Header>
						<Dialog.Title>Add Custom Provider</Dialog.Title>
						<Dialog.Description>
							Configure a custom LLM provider with its own API endpoint and models.
						</Dialog.Description>
					</Dialog.Header>
					<div class="flex flex-col gap-3 py-4">
						<Input
							type="text"
							placeholder="Provider name (e.g. my-provider)"
							bind:value={newProviderName}
						/>
						<Input
							type="text"
							placeholder="Base URL (e.g. https://api.example.com)"
							bind:value={newProviderBaseUrl}
						/>
						<Input
							type="password"
							placeholder="API Key (optional)"
							bind:value={newProviderApiKey}
						/>
						<Select.Root
							type="single"
							value={newProviderApiType}
							onValueChange={(v: string) => (newProviderApiType = v)}
						>
							<Select.Trigger class="w-full text-xs">
								{newProviderApiType}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="openai-completions">OpenAI Completions</Select.Item>
								<Select.Item value="openai-responses">OpenAI Responses</Select.Item>
								<Select.Item value="anthropic-messages">Anthropic Messages</Select.Item>
							</Select.Content>
						</Select.Root>
						<Input
							type="text"
							placeholder="Model IDs (comma-separated: gpt-4,claude-3)"
							bind:value={newProviderModels}
						/>
					</div>
					<Dialog.Footer>
						<Button
							size="sm"
							class="h-8 text-xs"
							onclick={addCustomProvider}
							disabled={newProviderSaving || !newProviderName.trim() || !newProviderBaseUrl.trim()}
						>
							{newProviderSaving ? 'Adding...' : 'Add Provider'}
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>

			<!-- Configured providers -->
			{#if configuredList.length > 0}
				<div class="flex flex-col gap-1">
					{#each configuredList as item (item.id)}
						<Collapsible.Root
							open={openCollapsibles[item.id] ?? false}
							onOpenChange={(v: boolean) => (openCollapsibles[item.id] = v)}
							class="overflow-hidden rounded-xl border border-border/40 bg-card/20"
						>
							<Collapsible.Trigger class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-accent/50 transition-colors outline-none">
								<div class="flex items-center gap-2 min-w-0">
									<span
										class="size-1.5 shrink-0 rounded-full {statusColor(item)}"
										title={statusTitle(item)}
									></span>
									<span class="truncate text-xs font-medium">{formatName(item.id)}</span>
									<span class="shrink-0 font-mono text-[10px] text-muted-foreground">{item.id}</span>
								</div>
								<Icon icon={ArrowDown01FreeIcons} class="size-3 text-muted-foreground/60 transition-transform ui-open:rotate-180" />
							</Collapsible.Trigger>
							<Collapsible.Content>
								<div class="flex flex-col gap-2 px-3 pb-3 pt-1">
									<!-- API Key — never shows existing key -->
									<Input
										type="password"
										placeholder={item.hasKey ? 'Key saved — type to replace' : 'Enter API key'}
										bind:value={apiKeys[item.id]}
										class="text-xs"
									/>

									<!-- Custom provider details -->
									{#if item.baseUrl}
										<div class="flex flex-col gap-1.5 rounded-lg bg-muted/30 px-2.5 py-2">
											<div class="flex items-center justify-between">
												<span class="text-[10px] text-muted-foreground">Base URL</span>
												<span class="max-w-[70%] truncate text-[10px] font-mono text-foreground/80">{item.baseUrl}</span>
											</div>
											{#if item.info.models.length > 0}
												<div class="flex items-center justify-between">
													<span class="text-[10px] text-muted-foreground">Models</span>
													<span class="max-w-[70%] truncate text-[10px] font-mono text-foreground/80">{item.info.models.join(', ')}</span>
												</div>
											{/if}
										</div>
									{/if}

									<!-- Enable + Save row -->
									<div class="flex items-center gap-3 pt-1">
										<div class="flex items-center gap-2">
											<Switch
												checked={item.enabled}
												onCheckedChange={(v: boolean) => toggleProvider(item.id, v)}
											/>
											<span class="text-xs text-muted-foreground">{item.enabled ? 'Enabled' : 'Disabled'}</span>
										</div>
										<div class="flex-1"></div>
										{#if item.baseUrl}
											<button
												type="button"
												class="flex items-center gap-1 text-[10px] text-muted-foreground/60 transition-colors hover:text-destructive"
												onclick={() => removeProvider(item.id)}
											>
												<Icon icon={Delete02FreeIcons} class="size-3" />
												Remove
											</button>
										{/if}
										<Button
											size="sm"
											class="h-7 min-w-15 px-3 text-[11px] font-medium"
											onclick={() => saveKey(item.id)}
											disabled={saving[item.id]}
										>
											{#if saving[item.id]}
												Saving...
											{:else}
												<div class="flex items-center gap-1">
													{#if saved[item.id]}
														<Icon icon={CheckmarkCircle01FreeIcons} class="size-3" />
														Saved
													{:else}
														<Icon icon={LockKeyFreeIcons} class="size-3" />
														Save
													{/if}
												</div>
											{/if}
										</Button>
									</div>
								</div>
							</Collapsible.Content>
						</Collapsible.Root>
					{/each}
				</div>
			{:else}
				<div class="py-6 text-center text-xs text-muted-foreground">
					No providers configured. Search above to add one.
				</div>
			{/if}
		</div>
	{/if}
</Sidebar.Content>
