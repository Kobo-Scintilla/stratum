<script lang="ts">
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import { AiBrain05Icon } from '@hugeicons/core-free-icons';
	import ChatInput from '$lib/components/chat/ChatInput.svelte';
	import type { ChatMessage } from '@opaius/shared/entities/chat-message.js';
	import type { ChatSession } from '$lib/stores/chat-session.svelte.js';
	import type { ChatSessionSettings } from '@opaius/shared/entities/chat-session-settings.js';

	let {
		chat,
		sessionId,
		sessionSettings,
		messages,
		providerInfo,
		enabledProviders,
		pendingModel,
		pendingThinkingLevel,
		pendingHeadroomEnabled,
		appDefaults,
		onSend,
		onModelSelect,
		onThinkingSelect,
		updateSettings
	}: {
		chat: ChatSession;
		sessionId?: string;
		sessionSettings: ChatSessionSettings | null;
		messages: ChatMessage[];
		enabledProviders: Set<string>;
		providerInfo: Array<{ id: string; models: Array<{ id: string; contextWindow: number }> }>;
		pendingModel: { provider: string; model: string } | null;
		pendingThinkingLevel: string;
		pendingHeadroomEnabled: boolean;
		appDefaults: Record<string, any> | null;
		onSend: (text: string) => void;
		onModelSelect: (value: string) => void;
		onThinkingSelect: (value: string) => void;
		updateSettings: (fields: Partial<ChatSessionSettings>) => void;
	} = $props();
	let modelSwitcherOpen = $state(false);
	let thinkingSwitcherOpen = $state(false);
	let ctxLastRawMsg = $state<ChatMessage | null>(null);

	const currentThinkingLevel = $derived(
		sessionId && sessionSettings ? sessionSettings.thinkingLevel : pendingThinkingLevel
	);
	const thinkingOptions = [
		{ value: 'off', label: 'Disabled' },
		{ value: 'minimal', label: 'Minimal' },
		{ value: 'low', label: 'Low' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'High' },
		{ value: 'xhigh', label: 'Max' }
	];
	const currentThinkingLabel = $derived(
		thinkingOptions.find((o) => o.value === currentThinkingLevel)?.label ?? 'Medium'
	);

	const modelGroups = $derived(
		providerInfo
			.filter((p) => enabledProviders.has(p.id))
			.map((p) => ({
				provider: p.id,
				models: p.models.map((m) => ({
					value: `${p.id}/${m.id}`,
					label: m.id,
					provider: p.id,
					contextWindow: m.contextWindow
				}))
			}))
	);
	const hasActiveProviders = $derived(enabledProviders.size > 0);

	// Resolve effective model — session setting > app default
	const effectiveModel = $derived.by(() => {
		if (pendingModel) return pendingModel;
		if (sessionSettings?.modelProvider && sessionSettings?.modelId) {
			return { provider: sessionSettings.modelProvider, model: sessionSettings.modelId };
		}
		if (!appDefaults) return null;
		const provider =
			'defaultModelProvider' in appDefaults
				? appDefaults.defaultModelProvider
				: appDefaults.modelProvider;
		const model =
			'defaultModelId' in appDefaults ? appDefaults.defaultModelId : appDefaults.modelId;
		if (provider && model) return { provider, model };
		return null;
	});

	const selectedModel = $derived(
		effectiveModel
			? providerInfo
					.flatMap((p) => p.models.map((m) => ({ provider: p.id, ...m })))
					.find((m) => m.provider === effectiveModel.provider && m.id === effectiveModel.model)
			: null
	);

	const modelReady = $derived(
		!!pendingModel ||
			(!!effectiveModel &&
				enabledProviders.size > 0 &&
				enabledProviders.has(effectiveModel.provider))
	);

	const currentModelLabel = $derived(
		effectiveModel ? `${effectiveModel.provider}/${effectiveModel.model}` : 'Select a model'
	);

	const activeValue = $derived(
		effectiveModel ? `${effectiveModel.provider}/${effectiveModel.model}` : ''
	);

	$effect(() => {
		ctxLastRawMsg = messages.filter((m) => m.role === 'assistant').slice(-1)[0] ?? null;
	});
	const ctxTokens = $derived(ctxLastRawMsg?.inputTokens ?? 0);
	const ctxWindow = $derived(
		sessionSettings?.contextWindow && sessionSettings.contextWindow > 0
			? sessionSettings.contextWindow
			: (selectedModel?.contextWindow ?? 1_000_000)
	);
	const ctxPct = $derived(Math.min(Math.max(Math.round((ctxTokens / ctxWindow) * 100), 0), 100));
</script>

<!-- Chat Input + Model Switcher -->
<div class="sticky bottom-0 border-t border-border/10 bg-transparent pt-2 pb-4">
	<ChatInput
		disabled={chat.isSending || !modelReady}
		error={!hasActiveProviders
			? 'Configure a provider with an API key in the sidebar to start.'
			: !modelReady
				? 'Select a model above to start.'
				: chat.error}
		onsend={onSend}
	/>

	{#snippet modelSelector()}
		<Popover.Root bind:open={modelSwitcherOpen}>
			<Popover.Trigger
				class="flex items-center gap-1.5 rounded-lg border border-border/30 bg-accent/5 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent/15 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
			>
				<span>{currentModelLabel}</span>
				<svg
					class="size-3 opacity-60"
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
				align="end"
				class="w-80 p-0"
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<Command.Root value={activeValue}>
					<Command.Input placeholder="Search models..." />
					<Command.List class="max-h-[min(60vh,28rem)]">
						<Command.Empty
							>{enabledProviders.size === 0
								? 'No providers configured — open the sidebar to add one.'
								: 'No model found.'}</Command.Empty
						>
						{#each modelGroups as group}
							<Command.Group heading={group.provider}>
								{#each group.models as m}
									<Command.Item
										value={m.value}
										class="content-visibility-auto"
										onclick={() => {
											onModelSelect(m.value);
											modelSwitcherOpen = false;
										}}
									>
										<span class="w-24 shrink-0 truncate font-mono text-[11px] text-muted-foreground"
											>{m.provider}</span
										>
										<span class="truncate text-xs">{m.label}</span>
									</Command.Item>
								{/each}
							</Command.Group>
						{/each}
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	{/snippet}

	{#snippet thinkingSelector()}
		<Popover.Root bind:open={thinkingSwitcherOpen}>
			<Popover.Trigger
				class="flex items-center gap-1.5 rounded-lg border border-border/30 bg-accent/5 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent/15 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
			>
				<Icon icon={AiBrain05Icon} class="size-3.5 opacity-70" />
				<span>Thinking: {currentThinkingLabel}</span>
				<svg
					class="size-3 opacity-60"
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
				align="end"
				class="w-44 p-0"
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<Command.Root value={currentThinkingLevel}>
					<Command.List>
						<Command.Group heading="Thinking Level">
							{#each thinkingOptions as opt}
								<Command.Item
									value={opt.value}
									onclick={() => {
										onThinkingSelect(opt.value);
										thinkingSwitcherOpen = false;
									}}
									data-checked={currentThinkingLevel === opt.value ? 'true' : undefined}
									class="flex cursor-pointer items-center justify-between text-xs"
								>
									<span>{opt.label}</span>
								</Command.Item>
							{/each}
						</Command.Group>
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	{/snippet}

	{#snippet headroomToggle()}
		{@const enabled = sessionSettings?.headroomEnabled ?? pendingHeadroomEnabled}
		<button
			type="button"
			onclick={() => updateSettings({ headroomEnabled: !enabled })}
			class="flex items-center gap-1 rounded-lg border px-3 py-1 text-[11px] transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none
				{enabled
				? 'border-primary/30 bg-primary/8 text-primary hover:bg-primary/15'
				: 'border-border/30 bg-accent/5 text-muted-foreground hover:bg-accent/15 hover:text-foreground'}"
		>
			<svg
				class="size-3.5 shrink-0"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M4 14a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2z" />
				<path d="M12 4v4" />
				<path d="M8 18v2" />
				<path d="M16 18v2" />
			</svg>
			<span>Compress</span>
		</button>
	{/snippet}

	{#if sessionId || hasActiveProviders}
		<div
			class="mx-auto mt-2 flex w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-border/20 bg-black/5 px-3 py-1.5 backdrop-blur-2xl sm:w-fit sm:flex-nowrap sm:justify-end"
		>
			{@render headroomToggle()}
			{@render thinkingSelector()}
			{@render modelSelector()}
			{#if ctxTokens > 0}
				<div
					class="relative flex items-center justify-center"
					title="Context: {ctxPct}% ({ctxTokens.toLocaleString()}/{ctxWindow.toLocaleString()} tokens)"
				>
					<svg class="size-5" viewBox="0 0 42 42">
						<circle
							cx="21"
							cy="21"
							r="18"
							stroke="currentColor"
							class="text-muted-foreground/15"
							stroke-width="4"
							fill="none"
						/>
						<circle
							cx="21"
							cy="21"
							r="18"
							stroke="currentColor"
							class={ctxPct >= 90
								? 'text-destructive'
								: ctxPct >= 75
									? 'text-amber-500'
									: 'text-primary'}
							stroke-width="4"
							stroke-dasharray="{ctxPct}, 100"
							stroke-linecap="round"
							stroke-dashoffset="25"
							fill="none"
							transform="rotate(-90 21 21)"
						/>
						<text
							x="21"
							y="25"
							text-anchor="middle"
							font-size="6.5"
							font-weight="800"
							fill="currentColor"
							class="text-foreground tabular-nums">{ctxPct}</text
						>
					</svg>
				</div>
			{/if}
		</div>
	{/if}
</div>
