<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { onMount } from 'svelte';
	import { remult } from 'remult';
	import { ProviderSetting } from '$lib/shared/entities/provider-setting';
	import { AgentService } from '$lib/shared/services/agent-service';
	import Icon from './Icon.svelte';
	import Button from './ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
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
		Delete02FreeIcons
	} from '@hugeicons/core-free-icons';

	let availableProviders = $state<
		Array<{ id: string; envKeys: string[]; models: string[]; isCustom: boolean }>
	>([]);
	let apiKeys = $state<Record<string, string>>({});
	let visibleKeys = $state<Record<string, boolean>>({});
	let saving = $state<Record<string, boolean>>({});
	let saved = $state<Record<string, boolean>>({});
	let loading = $state(true);
	let searchQuery = $state('');

	// Add provider form
	let addDialogOpen = $state(false);
	let newProviderName = $state('');
	let newProviderBaseUrl = $state('');
	let newProviderApiKey = $state('');
	let newProviderApiType = $state('openai-completions');
	let newProviderModels = $state('');
	let newProviderSaving = $state(false);

	onMount(async () => {
		await loadProviders();
	});

	async function loadProviders() {
		try {
			availableProviders = await AgentService.getProvidersInfo();
			const keys = await AgentService.getProviderApiKeys();
			apiKeys = keys;
		} catch (err) {
			console.error('Failed to load provider info:', err);
		} finally {
			loading = false;
		}
	}

	const filteredProviders = $derived.by(() => {
		if (!searchQuery.trim()) return availableProviders;
		const q = searchQuery.toLowerCase();
		return availableProviders.filter(
			(p) => p.id.toLowerCase().includes(q) || p.models.some((m) => m.toLowerCase().includes(q))
		);
	});

	async function saveKey(providerId: string) {
		saving[providerId] = true;
		try {
			await AgentService.saveProviderKey(providerId, apiKeys[providerId] || '');
			saved[providerId] = true;
			setTimeout(() => {
				saved[providerId] = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to save API key:', err);
		} finally {
			saving[providerId] = false;
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
			await AgentService.saveCustomProvider(
				newProviderName.trim(),
				newProviderApiKey,
				newProviderBaseUrl.trim(),
				newProviderApiType,
				models
			);
			addDialogOpen = false;
			resetForm();
			await loadProviders();
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

	async function removeProvider(providerId: string) {
		try {
			await AgentService.deleteProviderKey(providerId);
			await loadProviders();
		} catch (err) {
			console.error('Failed to remove provider:', err);
		}
	}

	function formatName(name: string): string {
		return name
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
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
		<div class="flex flex-col gap-4">
			<!-- Search -->
			<div class="relative">
				<Icon
					icon={Search01FreeIcons}
					class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/60"
				/>
				<Input
					type="text"
					placeholder="Search providers or models..."
					bind:value={searchQuery}
					class="pl-8 text-xs"
				/>
			</div>

			<!-- Add Provider -->
			<Button
				size="sm"
				class="h-7 w-full text-[11px] font-medium"
				onclick={() => (addDialogOpen = true)}
			>
				<Icon icon={PlusSignIcon} class="size-3.5" />
				Add Provider
			</Button>

			<!-- Add Provider Dialog -->
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

			<!-- Provider cards -->
			<div class="flex flex-col gap-3">
				{#if searchQuery.trim() && filteredProviders.length === 0}
					<div class="py-4 text-center text-xs text-muted-foreground">
						No providers or models match "{searchQuery}"
					</div>
				{/if}
				{#each filteredProviders as p (p.id)}
					<div class="flex flex-col gap-2 rounded-xl border border-border/40 bg-card/20 p-3.5">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="text-xs font-semibold text-foreground">{formatName(p.id)}</span>
								<span
									class="size-1.5 rounded-full {apiKeys[p.id] ? 'bg-primary' : 'bg-muted'}"
									title={apiKeys[p.id] ? 'API key configured' : 'API key missing'}
								></span>
							</div>
							<div class="flex items-center gap-1.5">
								<span class="font-mono text-[10px] text-muted-foreground">{p.id}</span>
								{#if p.isCustom}
									<button
										type="button"
										class="text-muted-foreground/60 transition-colors hover:text-destructive"
										onclick={() => removeProvider(p.id)}
										title="Remove provider"
									>
										<Icon icon={Delete02FreeIcons} class="size-3" />
									</button>
								{/if}
							</div>
						</div>

						{#if p.envKeys.length > 0}
							<div class="font-mono text-[10px] text-muted-foreground">
								Requires: {p.envKeys.join(', ')}
							</div>
						{/if}

						<div class="relative mt-1">
							<Input
								type={visibleKeys[p.id] ? 'text' : 'password'}
								placeholder="Enter API key"
								bind:value={apiKeys[p.id]}
								class="pr-10 text-xs"
							/>
							<button
								type="button"
								class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground"
								onclick={() => (visibleKeys[p.id] = !visibleKeys[p.id])}
							>
								{#if visibleKeys[p.id]}
									<Icon icon={ViewOffFreeIcons} class="size-3.5" />
								{:else}
									<Icon icon={ViewFreeIcons} class="size-3.5" />
								{/if}
							</button>
						</div>

						<div class="mt-1 flex items-center justify-between">
							<span class="text-[10px] text-muted-foreground">
								{p.models.length} model{p.models.length === 1 ? '' : 's'} available
							</span>
							<Button
								size="sm"
								class="h-7 min-w-[60px] px-3 text-[11px] font-medium"
								onclick={() => saveKey(p.id)}
								disabled={saving[p.id]}
							>
								{#if saving[p.id]}
									Saving...
								{:else}
									<div class="flex items-center gap-1">
										{#if saved[p.id]}
											<Icon
												icon={CheckmarkCircle01FreeIcons}
												class="size-3 text-primary-foreground"
											/>
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
				{/each}
			</div>
		</div>
	{/if}
</Sidebar.Content>
