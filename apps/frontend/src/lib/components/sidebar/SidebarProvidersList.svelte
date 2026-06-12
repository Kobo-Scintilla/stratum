<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useDashboardState } from '$lib/stores/dashboard-state.svelte.js';
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
	import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
	import { slide } from 'svelte/transition';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	interface ProviderInfo {
		id: string;
		envKeys: string[];
		models: Array<{ id: string; contextWindow: number }>;
		isCustom: boolean;
	}

	const dashboard = useDashboardState();
	const loading = $derived(dashboard.providersLoading && dashboard.configuredLoading);

	let openCollapsibles = $state<Record<string, boolean>>({});

	const configuredList = () => {
		return dashboard.configured
			.map((c) => {
				const info = dashboard.providers.find((p) => p.id === c.id) ?? {
					id: c.id,
					envKeys: [],
					models: [],
					isCustom: !!c.baseUrl
				};
				return {
					id: c.id,
					enabled: c.enabled,
					hasKey: c.hasKey,
					baseUrl: c.baseUrl,
					apiType: c.apiType,
					models: c.models,
					info
				};
			})
			.sort((a, b) => a.id.localeCompare(b.id));
	};

	const coreProviders = () => configuredList().filter((item) => !item.info.isCustom);
	const customProviders = () => configuredList().filter((item) => item.info.isCustom);

	const configuredIds = () => new Set(dashboard.configured.map((c) => c.id));

	function handleAdd(id: string) {
		dashboard.configured.push({ id, enabled: true, hasKey: false });
	}

	async function handleToggle(id: string, enabled: boolean) {
		dashboard.toggleProviderEnabledLocal(id, enabled);
		const cfg = dashboard.configured.find((c) => c.id === id);
		if (cfg?.hasKey || cfg?.baseUrl) {
			try {
				await remult.call(AgentService.toggleProvider, undefined, id, enabled);
			} catch (err) {
				console.error('Toggle failed:', err);
			}
		}
	}

	async function handleSaveKey(id: string, key: string) {
		const cfg = dashboard.configured.find((c) => c.id === id);
		if (!key && cfg?.hasKey) return;
		await remult.call(AgentService.saveProviderKey, undefined, id, key);

		const idx = dashboard.configured.findIndex((c) => c.id === id);
		if (idx !== -1) {
			dashboard.configured[idx].hasKey = !!key;
			dashboard.configured[idx].enabled = dashboard.configured[idx].enabled ?? true;
		}
	}

	async function handleRemove(id: string) {
		dashboard.configured = dashboard.configured.filter((c) => c.id !== id);
		try {
			await remult.call(AgentService.deleteProviderKey, undefined, id);
		} catch (err) {
			console.error('Remove failed:', err);
		}
	}

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
					await dashboard.refreshProviders();
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

	$effect(() => {
		if (dashboard.activeTab === 'providers') {
			dashboard.refreshProviders();
		}
	});
</script>

<div class="flex h-full flex-col overflow-hidden">
	<Sidebar.Header
		class="shrink-0 gap-3.5 border-b bg-sidebar-accent/5 px-4 py-3 max-md:px-3 max-md:py-2.5"
	>
		<div class="flex w-full items-center gap-3">
			<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20">
				<Icon icon={Settings02FreeIcons} class="size-4 text-primary" />
			</div>
			<div class="flex flex-col">
				<span class="text-sm font-semibold text-sidebar-foreground">LLM Providers</span>
				<span class="mt-0.5 text-[10px] leading-none text-sidebar-foreground/50"
					>Configure API credentials & endpoints</span
				>
			</div>
		</div>
	</Sidebar.Header>

	<Sidebar.Content class="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
		<ScrollArea.Root class="h-full w-full flex-1">
			<div class="space-y-4 p-4 max-md:space-y-3 max-md:p-3">
				<Skeleton name="providers-list" {loading}>
					{#snippet fallback()}
						<div class="animate-pulse space-y-3">
							{#each Array(4) as _, i}
								<div
									class="flex items-center justify-between rounded-xl border border-border/10 bg-sidebar-accent/5 p-3.5"
								>
									<div class="flex items-center gap-3">
										<div class="size-6 shrink-0 rounded-md bg-sidebar-foreground/10"></div>
										<div class="space-y-2">
											<div class="h-3 w-24 rounded bg-sidebar-foreground/15"></div>
											<div class="h-2 w-16 rounded bg-sidebar-foreground/10"></div>
										</div>
									</div>
									<div class="h-5 w-9 rounded-full bg-sidebar-foreground/10"></div>
								</div>
							{/each}
						</div>
					{/snippet}

					<div class="flex flex-col gap-3">
						<SidebarProviderSearch
							providers={dashboard.providers}
							configuredIds={configuredIds()}
							onadd={handleAdd}
							onaddcustom={() => (showCustomForm = true)}
						/>

						{#if showCustomForm}
							<form method="POST" use:cfEnhance class="contents">
								<div
									transition:slide={{ duration: 200 }}
									class="overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-1 shadow-inner max-md:p-0"
								>
									<div
										class="mb-2 flex items-center justify-between gap-2 border-b border-border/10 px-3 py-2 max-md:px-2 max-md:py-1.5"
									>
										<span class="flex items-center gap-2 text-xs font-semibold text-primary">
											<span class="size-1.5 animate-pulse rounded-full bg-primary"></span>
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
									<div class="flex flex-col gap-3 px-3 pb-3 max-md:gap-2 max-md:px-2 max-md:pb-2">
										<Form.Field form={cf} name="name">
											<Form.Label class="text-xs">Provider Name</Form.Label>
											<Form.Control>
												<Input
													{...$cfConstraints.name}
													value={$cfData.name}
													oninput={(e) => updateField('name', (e.target as HTMLInputElement).value)}
													placeholder="e.g. local-llama"
													class="border-border/40 bg-sidebar-accent/10 text-xs focus:border-primary/50 focus:ring-primary/20"
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
													oninput={(e) =>
														updateField('baseUrl', (e.target as HTMLInputElement).value)}
													placeholder="http://127.0.0.1:11434"
													class="border-border/40 bg-sidebar-accent/10 text-xs focus:border-primary/50 focus:ring-primary/20"
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
													<Select.Trigger
														class="w-full border-border/40 bg-sidebar-accent/10 text-xs focus:border-primary/50 focus:ring-primary/20"
														>{$cfData.apiType}</Select.Trigger
													>
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
													oninput={(e) =>
														updateField('models', (e.target as HTMLInputElement).value)}
													placeholder="llama3, mistral (comma-separated)"
													class="border-border/40 bg-sidebar-accent/10 text-xs focus:border-primary/50 focus:ring-primary/20"
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
													oninput={(e) =>
														updateField('apiKey', (e.target as HTMLInputElement).value)}
													placeholder="Optional"
													class="border-border/40 bg-sidebar-accent/10 text-xs focus:border-primary/50 focus:ring-primary/20"
												/>
											</Form.Control>
										</Form.Field>
										<div class="flex gap-2 pt-1 max-md:flex-col max-md:gap-1.5">
											<Button
												variant="secondary"
												size="sm"
												type="button"
												class="h-8 text-xs"
												onclick={() => (showCustomForm = false)}
											>
												Cancel
											</Button>
											<Form.Button class="h-8 flex-1 bg-primary text-xs hover:bg-primary/90"
												>Add Provider</Form.Button
											>
										</div>
									</div>
								</div>
							</form>
						{/if}

						{#if configuredList().length > 0}
							<div class="flex flex-col gap-2.5">
								{#if coreProviders().length > 0}
									<div
										class="mt-2 px-1 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase"
									>
										Core API Providers
									</div>
									{#each coreProviders() as item (item.id)}
										<SidebarProviderItem
											{item}
											open={openCollapsibles[item.id] ?? false}
											onOpenChange={(v: boolean) => (openCollapsibles[item.id] = v)}
											ontoggle={handleToggle}
											onsave={handleSaveKey}
											onremove={handleRemove}
										/>
									{/each}
								{/if}

								{#if customProviders().length > 0}
									<div
										class="mt-3 px-1 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase"
									>
										Custom / Local Endpoints
									</div>
									{#each customProviders() as item (item.id)}
										<SidebarProviderItem
											{item}
											open={openCollapsibles[item.id] ?? false}
											onOpenChange={(v: boolean) => (openCollapsibles[item.id] = v)}
											ontoggle={handleToggle}
											onsave={handleSaveKey}
											onremove={handleRemove}
										/>
									{/each}
								{/if}
							</div>
						{:else}
							<div
								class="rounded-xl border border-dashed border-border/40 bg-sidebar-accent/5 py-12 text-center text-xs text-muted-foreground"
							>
								No providers configured. Search above to add one.
							</div>
						{/if}
					</div>
				</Skeleton>
			</div>
		</ScrollArea.Root>
	</Sidebar.Content>
</div>
