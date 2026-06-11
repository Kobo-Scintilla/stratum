<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import {
		toggleProviderEnabled,
		setEnabledProviders,
		activeProviderIds
	} from '$lib/stores/providers-state.svelte.js';
	import { createCachedQuery } from '$lib/utils/cached-query.svelte.js';
	import { remult } from 'remult';
	import { AgentService } from '@opaius/shared/controllers/agent-service.js';
	import { Settings02FreeIcons } from '@hugeicons/core-free-icons';
	import Icon from '../Icon.svelte';
	import SidebarProviderSearch from './SidebarProviderSearch.svelte';
	import SidebarProviderItem from './SidebarProviderItem.svelte';
	import * as Form from '$lib/components/ui/form/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { z } from 'zod';

	interface ProviderInfo {
		id: string;
		envKeys: string[];
		models: Array<{ id: string; contextWindow: number }>;
		isCustom: boolean;
	}

	interface ConfiguredProviderDto {
		id: string;
		enabled: boolean;
		hasKey: boolean;
		baseUrl?: string;
		apiType?: string;
		models?: string;
	}

	// ── Queries ──
	const providerInfoQuery = createCachedQuery<ProviderInfo[] | undefined>(
		'providerInfo',
		() => remult.call(AgentService.getProvidersInfo, undefined) as Promise<ProviderInfo[]>,
		{ persistence: 'local' }
	);
	const configuredQuery = createCachedQuery<ConfiguredProviderDto[] | undefined>(
		'configuredProviders',
		() =>
			remult.call(AgentService.getConfiguredProviders, undefined) as Promise<
				ConfiguredProviderDto[]
			>,
		{ persistence: 'local' }
	);

	const availableProviders = $derived(providerInfoQuery.data ?? null);
	const loading = $derived(providerInfoQuery.loading && configuredQuery.loading);

	// ── Configured provider state ──
	let configuredProviders = $state<
		Record<
			string,
			{ enabled: boolean; hasKey: boolean; baseUrl?: string; apiType?: string; models?: string }
		>
	>({});
	let openCollapsibles = $state<Record<string, boolean>>({});

	$effect(() => {
		const configs = configuredQuery.data;
		if (configs && configs.length > 0) {
			configuredProviders = Object.fromEntries(
				configs.map((c) => [
					c.id,
					{
						enabled: c.enabled,
						hasKey: c.hasKey,
						baseUrl: c.baseUrl,
						apiType: c.apiType,
						models: c.models
					}
				])
			);
		}
	});

	$effect(() => {
		const configs = configuredQuery.data;
		if (configs && configs.length > 0 && !configuredQuery.refreshing) {
			setEnabledProviders(activeProviderIds(configs));
		}
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

	const configuredIds = $derived(new Set(Object.keys(configuredProviders)));

	// ── Handlers ──
	function handleAdd(id: string) {
		configuredProviders[id] = { enabled: true, hasKey: false };
	}

	async function handleToggle(id: string, enabled: boolean) {
		configuredProviders[id] = { ...configuredProviders[id], enabled };
		toggleProviderEnabled(id, enabled);
		if (configuredProviders[id]?.hasKey || configuredProviders[id]?.baseUrl) {
			try {
				await remult.call(AgentService.toggleProvider, undefined, id, enabled);
			} catch (err) {
				console.error('Toggle failed:', err);
			}
		}
	}

	async function handleSaveKey(id: string, key: string) {
		if (!key && configuredProviders[id]?.hasKey) return;
		await remult.call(AgentService.saveProviderKey, undefined, id, key);
		configuredProviders[id] = {
			...configuredProviders[id],
			enabled: configuredProviders[id]?.enabled ?? true,
			hasKey: !!key
		};
		if (configuredProviders[id]?.enabled && !!key) {
			toggleProviderEnabled(id, true);
		}
	}

	async function handleRemove(id: string) {
		delete configuredProviders[id];
		toggleProviderEnabled(id, false);
		try {
			await remult.call(AgentService.deleteProviderKey, undefined, id);
		} catch (err) {
			console.error('Remove failed:', err);
		}
	}

	// ── Custom provider form (superforms + formsnap) ──
	let showCustomForm = $state(false);

	const customSchema = z.object({
		name: z.string().min(1, 'Name is required'),
		baseUrl: z.string().min(1, 'Base URL is required'),
		apiType: z.string(),
		models: z.string(),
		apiKey: z.string()
	});

	const cf = superForm(
		{ name: '', baseUrl: '', apiType: 'openai-completions', models: '', apiKey: '' },
		{
			validators: zodClient(customSchema as any) as any,
			SPA: true,
			onSubmit: async (e) => {
				e.cancel();
				const fd = e.formData;
				const name = (fd.get('name') as string) ?? '';
				const apiKey = (fd.get('apiKey') as string) ?? '';
				const baseUrl = (fd.get('baseUrl') as string) ?? '';
				const apiType = (fd.get('apiType') as string) ?? '';
				try {
					await remult.call(
						AgentService.saveCustomProvider,
						undefined,
						name,
						apiKey,
						baseUrl,
						apiType
					);
					if (apiKey.trim()) {
						await remult.call(AgentService.saveProviderKey, undefined, name, apiKey);
					}
					showCustomForm = false;
					await Promise.all([providerInfoQuery.refresh(), configuredQuery.refresh()]);
				} catch (err) {
					console.error('Failed to save custom provider:', err);
				}
			}
		}
	);

	const { form: cfData, constraints: cfConstraints, enhance: cfEnhance } = cf;

	function updateField(field: string, value: string) {
		cfData.update((d) => ({ ...d, [field]: value }));
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
			<SidebarProviderSearch
				providers={availableProviders ?? []}
				{configuredIds}
				onadd={handleAdd}
				onaddcustom={() => (showCustomForm = true)}
			/>

			{#if showCustomForm}
				<form method="POST" use:cfEnhance class="contents">
					<div class="overflow-hidden rounded-xl border border-border/40 bg-card/20">
						<div class="flex items-center justify-between gap-2 px-3 py-2">
							<span class="flex items-center gap-2 text-xs font-medium">
								<span class="size-1.5 rounded-full bg-muted"></span>
								New Custom Provider
							</span>
							<button
								type="button"
								class="text-[10px] text-muted-foreground/60 transition-colors hover:text-foreground"
								onclick={() => (showCustomForm = false)}
							>
								Cancel
							</button>
						</div>
						<div class="flex flex-col gap-3 px-3 pb-3">
							<Form.Field form={cf} name="name">
								<Form.Label class="text-xs">Provider Name</Form.Label>
								<Form.Control>
									<Input
										{...$cfConstraints.name}
										value={$cfData.name}
										oninput={(e) => updateField('name', (e.target as HTMLInputElement).value)}
										placeholder="e.g. my-provider"
										class="text-xs"
									/>
								</Form.Control>
								<Form.FieldErrors class="text-[10px]" />
							</Form.Field>
							<Form.Field form={cf} name="baseUrl">
								<Form.Label class="text-xs">Base URL</Form.Label>
								<Form.Control>
									<Input
										{...$cfConstraints.baseUrl}
										value={$cfData.baseUrl}
										oninput={(e) => updateField('baseUrl', (e.target as HTMLInputElement).value)}
										placeholder="https://api.example.com"
										class="text-xs"
									/>
								</Form.Control>
								<Form.FieldErrors class="text-[10px]" />
							</Form.Field>
							<Form.Field form={cf} name="apiType">
								<Form.Label class="text-xs">API Type</Form.Label>
								<Form.Control>
									<Select.Root
										type="single"
										value={$cfData.apiType}
										onValueChange={(v: string) => updateField('apiType', v)}
									>
										<Select.Trigger class="w-full text-xs">{$cfData.apiType}</Select.Trigger>
										<Select.Content>
											<Select.Item value="openai-completions">OpenAI Completions</Select.Item>
											<Select.Item value="openai-responses">OpenAI Responses</Select.Item>
											<Select.Item value="anthropic-messages">Anthropic Messages</Select.Item>
										</Select.Content>
									</Select.Root>
								</Form.Control>
							</Form.Field>
							<Form.Field form={cf} name="models">
								<Form.Label class="text-xs">Model IDs</Form.Label>
								<Form.Control>
									<Input
										{...$cfConstraints.models}
										value={$cfData.models}
										oninput={(e) => updateField('models', (e.target as HTMLInputElement).value)}
										placeholder="gpt-4, claude-3 (comma-separated)"
										class="text-xs"
									/>
								</Form.Control>
							</Form.Field>
							<Form.Field form={cf} name="apiKey">
								<Form.Label class="text-xs">API Key</Form.Label>
								<Form.Control>
									<Input
										{...$cfConstraints.apiKey}
										type="password"
										value={$cfData.apiKey}
										oninput={(e) => updateField('apiKey', (e.target as HTMLInputElement).value)}
										placeholder="Optional"
										class="text-xs"
									/>
								</Form.Control>
							</Form.Field>
							<div class="flex gap-2 pt-1">
								<Button
									variant="secondary"
									size="sm"
									type="button"
									class="h-8 text-xs"
									onclick={() => (showCustomForm = false)}
								>
									Cancel
								</Button>
								<Form.Button class="h-8 flex-1 text-xs">Add Provider</Form.Button>
							</div>
						</div>
					</div>
				</form>
			{/if}

			{#if configuredList.length > 0}
				<div class="flex flex-col gap-1">
					{#each configuredList as item (item.id)}
						<SidebarProviderItem
							{item}
							open={openCollapsibles[item.id] ?? false}
							onOpenChange={(v) => (openCollapsibles[item.id] = v)}
							ontoggle={handleToggle}
							onsave={handleSaveKey}
							onremove={handleRemove}
						/>
					{/each}
				</div>
			{:else if !showCustomForm}
				<div class="py-6 text-center text-xs text-muted-foreground">
					No providers configured. Search above to add one.
				</div>
			{/if}
		</div>
	{/if}
</Sidebar.Content>
