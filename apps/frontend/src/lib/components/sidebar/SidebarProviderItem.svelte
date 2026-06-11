<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import Button from '../ui/button/button.svelte';
	import Icon from '../Icon.svelte';
	import {
		LockKeyFreeIcons,
		CheckmarkCircle01FreeIcons,
		Delete02FreeIcons,
		ArrowDown01FreeIcons
	} from '@hugeicons/core-free-icons';

	interface ProviderInfo {
		id: string;
		envKeys: string[];
		models: Array<{ id: string; contextWindow: number }>;
		isCustom: boolean;
	}

	interface DisplayItem {
		id: string;
		enabled: boolean;
		hasKey: boolean;
		baseUrl?: string | null;
		apiType?: string | null;
		models?: string | null;
		info: ProviderInfo;
	}

	let {
		item,
		open = false,
		onOpenChange,
		ontoggle,
		onsave,
		onremove
	}: {
		item: DisplayItem;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		ontoggle?: (id: string, enabled: boolean) => void;
		onsave?: (id: string, key: string) => Promise<void>;
		onremove?: (id: string) => void;
	} = $props();

	let apiKey = $state('');
	let saving = $state(false);
	let saved = $state(false);

	function formatName(name: string): string {
		return name
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}

	const statusColor = $derived(
		item.hasKey && item.enabled
			? 'bg-primary'
			: item.hasKey && !item.enabled
				? 'bg-muted-foreground/40'
				: 'bg-muted'
	);

	const statusTitle = $derived(
		!item.hasKey ? 'No API key configured' : !item.enabled ? 'Disabled' : 'Active'
	);

	async function handleSave() {
		const key = apiKey.trim();
		if (!key && item.hasKey) return;
		saving = true;
		try {
			await onsave?.(item.id, key);
			saved = true;
			apiKey = '';
			setTimeout(() => (saved = false), 2000);
		} finally {
			saving = false;
		}
	}
</script>

<Collapsible.Root
	{open}
	onOpenChange={(v) => onOpenChange?.(v)}
	class="overflow-hidden rounded-xl border border-border/40 bg-card/20"
>
	<Collapsible.Trigger
		class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors outline-none hover:bg-accent/50"
	>
		<div class="flex min-w-0 items-center gap-2">
			<span class="size-1.5 shrink-0 rounded-full {statusColor}" title={statusTitle}></span>
			<span class="truncate text-xs font-medium">{formatName(item.id)}</span>
			<span class="shrink-0 font-mono text-[10px] text-muted-foreground">{item.id}</span>
		</div>
		<Icon
			icon={ArrowDown01FreeIcons}
			class="ui-open:rotate-180 size-3 text-muted-foreground/60 transition-transform"
		/>
	</Collapsible.Trigger>
	<Collapsible.Content>
		<div class="flex flex-col gap-2 px-3 pt-1 pb-3">
			<Input
				type="password"
				placeholder={item.hasKey ? 'Key saved \u2014 type to replace' : 'Enter API key'}
				bind:value={apiKey}
				class="text-xs"
			/>

			{#if item.baseUrl}
				<div class="flex flex-col gap-1.5 rounded-lg bg-muted/30 px-2.5 py-2">
					<div class="flex items-center justify-between">
						<span class="text-[10px] text-muted-foreground">Base URL</span>
						<span class="max-w-[70%] truncate font-mono text-[10px] text-foreground/80"
							>{item.baseUrl}</span
						>
					</div>
					{#if (item.info.models?.length ?? 0) > 0}
						<div class="flex items-center justify-between">
							<span class="text-[10px] text-muted-foreground">Models</span>
							<span class="max-w-[70%] truncate font-mono text-[10px] text-foreground/80"
								>{item.info.models.join(', ')}</span
							>
						</div>
					{/if}
				</div>
			{/if}

			<div class="flex items-center gap-3 pt-1">
				<div class="flex items-center gap-2">
					<Switch checked={item.enabled} onCheckedChange={(v: boolean) => ontoggle?.(item.id, v)} />
					<span class="text-xs text-muted-foreground">{item.enabled ? 'Enabled' : 'Disabled'}</span>
				</div>
				<div class="flex-1"></div>
				{#if item.baseUrl}
					<button
						type="button"
						class="flex items-center gap-1 text-[10px] text-muted-foreground/60 transition-colors hover:text-destructive"
						onclick={() => onremove?.(item.id)}
					>
						<Icon icon={Delete02FreeIcons} class="size-3" />
						Remove
					</button>
				{/if}
				<Button
					size="sm"
					class="h-7 min-w-15 px-3 text-[11px] font-medium"
					onclick={handleSave}
					disabled={saving}
				>
					{#if saving}
						Saving...
					{:else}
						<div class="flex items-center gap-1">
							{#if saved}
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
