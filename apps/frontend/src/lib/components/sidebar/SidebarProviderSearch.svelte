<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Icon from '../Icon.svelte';
	import { Search01FreeIcons, PlusSignIcon } from '@hugeicons/core-free-icons';

	let {
		providers = [],
		configuredIds = new Set<string>(),
		onadd,
		onaddcustom
	}: {
		providers: Array<{ id: string; models: Array<{ id: string; contextWindow: number }> }>;
		configuredIds: Set<string>;
		onadd?: (id: string) => void;
		onaddcustom?: () => void;
	} = $props();

	let query = $state('');
	let open = $state(false);

	function formatName(name: string): string {
		return name
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}

	const unconfigured = () => providers.filter((p) => !configuredIds.has(p.id));

	const filtered = () =>
		query.trim()
			? unconfigured().filter(
					(p) =>
						p.id.toLowerCase().includes(query.toLowerCase()) ||
						p.models.some((m) => m.id.toLowerCase().includes(query.toLowerCase()))
				)
			: unconfigured();

	function handleSelect(id: string) {
		onadd?.(id);
		query = '';
		open = false;
	}

	function handleCustom() {
		onaddcustom?.();
		query = '';
		open = false;
	}

	function onInputFocus() {
		open = true;
	}

	function onInputInput() {
		open = true;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger class="w-full">
		{#snippet child({ props })}
			<div
				{...props}
				class="relative"
				role="presentation"
				onmousedown={(e) => e.stopPropagation()}
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
				<Icon
					icon={Search01FreeIcons}
					class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/60"
				/>
				<Input
					type="text"
					placeholder="Search providers or models..."
					bind:value={query}
					onfocus={onInputFocus}
					oninput={onInputInput}
					class="pl-8 text-xs"
				/>
			</div>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content
		class="w-[var(--bits-popover-anchor-width)] p-1"
		align="start"
		trapFocus={false}
		onOpenAutoFocus={(e) => e.preventDefault()}
		onCloseAutoFocus={(e) => e.preventDefault()}
		onInteractOutside={() => (open = false)}
	>
		<Command.Root>
			<Command.List>
				{#if filtered().length > 0}
					<Command.Group>
						{#each filtered() as p (p.id)}
							<Command.Item value={p.id} onclick={() => handleSelect(p.id)}>
								<div class="flex flex-col gap-0">
									<span class="text-xs font-medium">{formatName(p.id)}</span>
									<span class="text-[10px] text-muted-foreground"
										>{p.id} &middot; {p.models.length} model{p.models.length === 1 ? '' : 's'}</span
									>
								</div>
							</Command.Item>
						{/each}
					</Command.Group>
				{:else}
					<div class="py-6 text-center text-xs text-muted-foreground">No providers found</div>
				{/if}
				<Command.Separator />
				<Command.Item onclick={handleCustom}>
					<Icon icon={PlusSignIcon} class="size-3.5 shrink-0" />
					<span>Add custom provider...</span>
				</Command.Item>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
