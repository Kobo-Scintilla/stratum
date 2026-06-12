<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import Button from '../ui/button/button.svelte';
	import Icon from '../Icon.svelte';
	import { slide } from 'svelte/transition';
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

	const BRANDING: Record<
		string,
		{
			name: string;
			gradient: string;
			textColor: string;
			borderColor: string;
			bgMuted: string;
			logoChar: string;
			accentColor: string;
		}
	> = {
		openai: {
			name: 'OpenAI',
			gradient: 'from-[#10a37f] to-[#0d8568]',
			textColor: 'text-[#10a37f]',
			borderColor: 'border-[#10a37f]/20',
			bgMuted: 'bg-[#10a37f]/5',
			logoChar: 'O',
			accentColor: '#10a37f'
		},
		anthropic: {
			name: 'Anthropic',
			gradient: 'from-[#cc785c] to-[#a35e47]',
			textColor: 'text-[#cc785c]',
			borderColor: 'border-[#cc785c]/20',
			bgMuted: 'bg-[#cc785c]/5',
			logoChar: 'A',
			accentColor: '#cc785c'
		},
		google: {
			name: 'Google Gemini',
			gradient: 'from-[#4285f4] via-[#ea4335] to-[#fbbc05]',
			textColor: 'text-[#4285f4]',
			borderColor: 'border-[#4285f4]/20',
			bgMuted: 'bg-[#4285f4]/5',
			logoChar: 'G',
			accentColor: '#4285f4'
		},
		gemini: {
			name: 'Google Gemini',
			gradient: 'from-[#4285f4] via-[#ea4335] to-[#fbbc05]',
			textColor: 'text-[#4285f4]',
			borderColor: 'border-[#4285f4]/20',
			bgMuted: 'bg-[#4285f4]/5',
			logoChar: 'G',
			accentColor: '#4285f4'
		},
		deepseek: {
			name: 'DeepSeek',
			gradient: 'from-[#3b82f6] to-[#1d4ed8]',
			textColor: 'text-[#3b82f6]',
			borderColor: 'border-[#3b82f6]/20',
			bgMuted: 'bg-[#3b82f6]/5',
			logoChar: 'D',
			accentColor: '#3b82f6'
		},
		groq: {
			name: 'Groq',
			gradient: 'from-[#f55036] to-[#c2331f]',
			textColor: 'text-[#f55036]',
			borderColor: 'border-[#f55036]/20',
			bgMuted: 'bg-[#f55036]/5',
			logoChar: 'Q',
			accentColor: '#f55036'
		},
		openrouter: {
			name: 'OpenRouter',
			gradient: 'from-[#7c3aed] to-[#4f46e5]',
			textColor: 'text-[#7c3aed]',
			borderColor: 'border-[#7c3aed]/20',
			bgMuted: 'bg-[#7c3aed]/5',
			logoChar: 'R',
			accentColor: '#7c3aed'
		},
		ollama: {
			name: 'Ollama',
			gradient: 'from-[#6b7280] to-[#374151]',
			textColor: 'text-foreground',
			borderColor: 'border-[#6b7280]/20',
			bgMuted: 'bg-[#6b7280]/5',
			logoChar: '🦙',
			accentColor: '#6b7280'
		},
		together: {
			name: 'Together AI',
			gradient: 'from-[#222222] to-[#000000]',
			textColor: 'text-foreground',
			borderColor: 'border-border/30',
			bgMuted: 'bg-sidebar-accent/10',
			logoChar: 'T',
			accentColor: '#222222'
		},
		cohere: {
			name: 'Cohere',
			gradient: 'from-[#008080] to-[#004d4d]',
			textColor: 'text-[#008080]',
			borderColor: 'border-[#008080]/20',
			bgMuted: 'bg-[#008080]/5',
			logoChar: 'C',
			accentColor: '#008080'
		},
		mistral: {
			name: 'Mistral AI',
			gradient: 'from-[#fd7e14] to-[#e65c00]',
			textColor: 'text-[#fd7e14]',
			borderColor: 'border-[#fd7e14]/20',
			bgMuted: 'bg-[#fd7e14]/5',
			logoChar: 'M',
			accentColor: '#fd7e14'
		}
	};

	const brand = () => {
		const key = item.id.toLowerCase();
		if (BRANDING[key]) return BRANDING[key];

		let hash = 0;
		for (let i = 0; i < item.id.length; i++) {
			hash = item.id.charCodeAt(i) + ((hash << 5) - hash);
		}
		const h1 = Math.abs(hash % 360);
		const h2 = (h1 + 40) % 360;

		return {
			name: formatName(item.id),
			gradient: `from-[hsl(${h1},70%,50%)] to-[hsl(${h2},70%,40%)]`,
			textColor: `text-[hsl(${h1},70%,45%)]`,
			borderColor: `border-[hsl(${h1},70%,45%)]/20`,
			bgMuted: `bg-[hsl(${h1},70%,45%)]/5`,
			logoChar: item.id.charAt(0).toUpperCase(),
			accentColor: `hsl(${h1},70%,45%)`
		};
	};

	const statusBadge = () => {
		if (item.hasKey && item.enabled) {
			return {
				text: 'Active',
				classes: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'
			};
		}
		if (item.hasKey && !item.enabled) {
			return {
				text: 'Disabled',
				classes: 'text-muted-foreground border-border/20 bg-sidebar-accent/20'
			};
		}
		return {
			text: 'No Key',
			classes: 'text-amber-500 border-amber-500/20 bg-amber-500/5'
		};
	};

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
	onOpenChange={(v: boolean) => onOpenChange?.(v)}
	class="overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-md {item.hasKey &&
	item.enabled
		? `${brand().borderColor} ${brand().bgMuted}`
		: 'border-border/40 bg-sidebar-accent/5 hover:border-border/80'}"
>
	<Collapsible.Trigger
		class="flex w-full items-center justify-between gap-2 px-3.5 py-3.5 text-xs font-semibold transition-colors outline-none hover:bg-sidebar-accent/10 max-md:px-3 max-md:py-2.5"
	>
		<div class="flex min-w-0 items-center gap-3">
			<div
				class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br {brand()
					.gradient} font-bold text-white shadow-sm ring-1 ring-white/10 select-none"
			>
				{brand().logoChar}
			</div>
			<div class="flex min-w-0 flex-col items-start text-left">
				<span class="truncate text-xs font-bold text-sidebar-foreground">{brand().name}</span>
				<span class="shrink-0 font-mono text-[9px] text-muted-foreground/60">{item.id}</span>
			</div>
		</div>
		<div class="flex items-center gap-2.5 max-md:gap-1.5">
			<span
				class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold transition-colors {statusBadge()
					.classes}"
			>
				<span
					class="size-1.5 rounded-full bg-current {item.hasKey && item.enabled
						? 'animate-pulse'
						: ''}"
				></span>
				{statusBadge().text}
			</span>
			<Icon
				icon={ArrowDown01FreeIcons}
				class="ui-open:rotate-180 size-3.5 text-sidebar-foreground/45 transition-transform duration-200"
			/>
		</div>
	</Collapsible.Trigger>
	<Collapsible.Content>
		<div
			transition:slide={{ duration: 150 }}
			class="flex flex-col gap-3 border-t border-border/10 bg-sidebar-accent/5 px-3.5 pt-2 pb-4 max-md:gap-2 max-md:px-3 max-md:pt-1.5 max-md:pb-3"
		>
			<div class="relative flex items-center">
				<Input
					type="password"
					placeholder={item.hasKey ? 'Key saved \u2014 type to replace' : 'Enter API key'}
					bind:value={apiKey}
					class="h-9 rounded-lg border-border/30 bg-background pr-8 text-xs focus:border-primary/50 focus:ring-primary/20"
				/>
				<div class="absolute right-3 text-muted-foreground/40">
					<Icon icon={LockKeyFreeIcons} class="size-3.5" />
				</div>
			</div>

			{#if item.baseUrl}
				<div
					class="flex flex-col gap-2 rounded-lg border border-border/10 bg-background/50 px-3 py-2.5"
				>
					<div class="flex items-center justify-between gap-2">
						<span class="text-[10px] font-medium text-muted-foreground">Base URL</span>
						<span class="max-w-[70%] truncate font-mono text-[9px] text-foreground/80"
							>{item.baseUrl}</span
						>
					</div>
					{#if (item.info.models?.length ?? 0) > 0}
						<div class="mt-1 flex flex-col gap-1 border-t border-border/5 pt-2">
							<span class="text-[10px] font-medium text-muted-foreground">Available Models</span>
							<div class="mt-0.5 flex flex-wrap gap-1">
								{#each item.info.models as model}
									<span
										class="inline-flex items-center rounded border border-border/10 bg-sidebar-accent px-1.5 py-0.5 font-mono text-[8px] text-sidebar-foreground/80"
									>
										{model.id}
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<div class="flex items-center gap-3 pt-1 max-md:flex-wrap max-md:gap-2">
				<div class="flex items-center gap-2">
					<Switch checked={item.enabled} onCheckedChange={(v: boolean) => ontoggle?.(item.id, v)} />
					<span class="text-[11px] font-medium text-sidebar-foreground/60"
						>{item.enabled ? 'Enabled' : 'Disabled'}</span
					>
				</div>
				<div class="flex-1"></div>
				{#if item.baseUrl}
					<button
						type="button"
						class="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/60 transition-colors hover:text-destructive"
						onclick={() => onremove?.(item.id)}
					>
						<Icon icon={Delete02FreeIcons} class="size-3.5" />
						Remove
					</button>
				{/if}
				<Button
					size="sm"
					class="h-8 min-w-16 rounded-lg bg-primary px-4 text-[10px] font-bold tracking-wider text-primary-foreground uppercase hover:bg-primary/95"
					onclick={handleSave}
					disabled={saving}
				>
					{#if saving}
						Saving...
					{:else}
						<div class="flex items-center gap-1">
							{#if saved}
								<Icon icon={CheckmarkCircle01FreeIcons} class="size-3.5" />
								Saved
							{:else}
								<Icon icon={LockKeyFreeIcons} class="size-3.5" />
								Save
							{/if}
						</div>
					{/if}
				</Button>
			</div>
		</div>
	</Collapsible.Content>
</Collapsible.Root>
