<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { AgentService } from '@opaius/shared/controllers/agent-service.js';
	import { getChatSession, type ChatSession } from '$lib/stores/chat-session.svelte.js';
	import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
	import { tick, onMount } from 'svelte';
	import { remult } from 'remult';
	import { ChatSessionSettings } from '@opaius/shared/entities/chat-session-settings.js';
	import { AppSettings } from '@opaius/shared/entities/app-settings.js';
	import { getEnabledProviders, setEnabledProviders } from '$lib/stores/providers-state.svelte.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import { AiBrain05Icon } from '@hugeicons/core-free-icons';

	import EmptyState from '$lib/components/chat/EmptyState.svelte';
	import ChatMessage from '$lib/components/chat/ChatMessage.svelte';
	import ChatStream from '$lib/components/chat/ChatStream.svelte';
	import ChatInput from '$lib/components/chat/ChatInput.svelte';
	import ToolCall from '$lib/components/chat/ToolCall.svelte';
	import SessionStatsWidget from '$lib/components/chat/SessionStatsWidget.svelte';
	let { data }: { data: any } = $props();

	let sessionId = $derived($page.params.sessionId);
	// svelte-ignore state_referenced_locally
	let providerInfo = $state<Array<{ id: string; models: string[] }>>(data.providers ?? []);
	// svelte-ignore state_referenced_locally
	let sessionSettings = $state<ChatSessionSettings | null>(data.settings ?? null);
	// svelte-ignore state_referenced_locally
	let appDefaults: { modelProvider: string; modelId: string; thinkingLevel: string } | null =
		$state(data.defaults ?? null);

	// Initialize the shared store during SSR/hydration from server-loaded data
	// svelte-ignore state_referenced_locally
	const initialEnabled = new Set<string>(
		(data.configured ?? [])
			.filter((c: any) => c.enabled && c.hasKey)
			.map((c: any) => c.id as string)
	);
	setEnabledProviders(initialEnabled);

	// svelte-ignore state_referenced_locally
	let enabledProviders = $state<Set<string>>(initialEnabled);
	let modelSwitcherOpen = $state(false);
	let pendingModel = $state<{ provider: string; model: string } | null>(null);
	let thinkingSwitcherOpen = $state(false);
	let pendingThinkingLevel = $state('medium');
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

	function onThinkingSelect(value: string) {
		if (sessionId && sessionSettings) {
			updateSettings({ thinkingLevel: value });
		} else {
			pendingThinkingLevel = value;
		}
		thinkingSwitcherOpen = false;
	}

	// Keep states synchronized with layout load data updates
	$effect(() => {
		providerInfo = data.providers ?? [];
		sessionSettings = data.settings ?? null;
		appDefaults = data.defaults ?? null;

		const nextEnabled = new Set<string>(
			(data.configured ?? [])
				.filter((c: any) => c.enabled && c.hasKey)
				.map((c: any) => c.id as string)
		);
		setEnabledProviders(nextEnabled);
	});

	// Sync from shared store when sidebar toggles providers
	$effect(() => {
		enabledProviders = getEnabledProviders();
	});

	// Clear model selection if its provider gets disabled
	$effect(() => {
		const enabled = getEnabledProviders();
		if (
			sessionSettings?.modelProvider &&
			sessionSettings.modelId &&
			!enabled.has(sessionSettings.modelProvider)
		) {
			if (sessionId) {
				updateSettings({ modelProvider: '', modelId: '' });
			} else {
				pendingModel = null;
			}
		}
	});

	onMount(async () => {
		const [providers, configured, defaults] = await Promise.all([
			remult.call(AgentService.getProvidersInfo, undefined),
			remult.call(AgentService.getConfiguredProviders, undefined),
			remult
				.repo(AppSettings)
				.findId('_defaults')
				.catch(() => null)
		]);
		providerInfo = providers as Array<{
			id: string;
			envKeys: string[];
			models: string[];
			isCustom: boolean;
		}>;
		const freshEnabled = new Set(
			(configured as Array<{ id: string; enabled: boolean; hasKey: boolean }>)
				.filter((c) => c.enabled && c.hasKey)
				.map((c) => c.id)
		);
		setEnabledProviders(freshEnabled);
		enabledProviders = freshEnabled;
		if (defaults) {
			appDefaults = {
				modelProvider: defaults.defaultModelProvider,
				modelId: defaults.defaultModelId,
				thinkingLevel: defaults.defaultThinkingLevel
			};
		}
	});

	// svelte-ignore state_referenced_locally
	let chat: ChatSession = getChatSession(sessionId, data.messages);
	// Show toast on chat errors
	$effect(() => {
		if (chat.error) {
			toast.error(chat.error, {
				description: 'Fix the issue and try again.',
				duration: 8000
			});
		}
	});

	let viewport: HTMLElement | null = $state(null);
	let lastScrollHeight = 0;

	// React to URL param changes — switch session or reset.
	// svelte-ignore state_referenced_locally
	let prevSessionId = $state<string | undefined>(sessionId);
	$effect(() => {
		const cur = sessionId;
		if (cur) {
			if (cur !== prevSessionId) {
				prevSessionId = cur;
				chat.switchSession(cur, data.messages);
			}
		} else if (prevSessionId !== undefined) {
			prevSessionId = undefined;
			chat.reset();
		}
	});

	$effect(() => {
		if (sessionId) {
			remult
				.repo(ChatSessionSettings)
				.findId(sessionId)
				.then(async (settings) => {
					if (settings) {
						sessionSettings = settings;
					} else {
						try {
							sessionSettings = await remult.repo(ChatSessionSettings).insert({
								id: sessionId,
								modelProvider: pendingModel?.provider ?? '',
								modelId: pendingModel?.model ?? '',
								contextWindow: 20,
								thinkingLevel: pendingThinkingLevel,
								headroomEnabled: true
							});
						} catch (e) {
							sessionSettings = (await remult.repo(ChatSessionSettings).findId(sessionId)) || null;
						}
					}
				});
		} else {
			sessionSettings = null;
		}
	});

	async function updateSettings(fields: Partial<ChatSessionSettings>) {
		if (!sessionId || !sessionSettings) return;
		sessionSettings = await remult.repo(ChatSessionSettings).save({
			...sessionSettings,
			...fields
		});
	}
	async function handleSend(text: string) {
		const wasNull = !chat.sessionId;
		const model = pendingModel;

		if (wasNull && model) {
			const sid = crypto.randomUUID();
			await remult.repo(ChatSessionSettings).insert({
				id: sid,
				modelProvider: model.provider,
				modelId: model.model,
				contextWindow: 20,
				thinkingLevel: pendingThinkingLevel,
				headroomEnabled: true,
				title: text.slice(0, 50)
			});
			pendingModel = null;
			await chat.switchSession(sid);
		}

		chat.send(text);
		if (wasNull && chat.sessionId && browser) {
			goto(`/dashboard/${chat.sessionId}`, { replaceState: true, noScroll: true, keepFocus: true });
		}
	}

	function handleScroll() {
		if (!viewport) return;
		if (viewport.scrollTop < 30 && !chat.isSending && chat.messages.length >= 50) {
			lastScrollHeight = viewport.scrollHeight;
			chat.loadMore();
		}
	}

	$effect(() => {
		const el = viewport;
		if (el) {
			el.addEventListener('scroll', handleScroll, { passive: true });
			return () => {
				el.removeEventListener('scroll', handleScroll);
			};
		}
	});

	// Auto-scroll
	$effect(() => {
		chat.messages;
		chat.activeStreams;
		if (viewport) {
			tick().then(() => {
				if (lastScrollHeight > 0) {
					const diff = viewport!.scrollHeight - lastScrollHeight;
					viewport!.scrollTop = diff;
					lastScrollHeight = 0;
				} else {
					viewport!.scrollTop = viewport!.scrollHeight;
				}
			});
		}
	});

	const modelGroups = $derived(
		providerInfo
			.filter((p) => enabledProviders.has(p.id))
			.map((p) => ({
				provider: p.id,
				models: p.models.map((m) => ({
					value: `${p.id}/${m}`,
					label: m,
					provider: p.id
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
		const d = appDefaults;
		if (d?.modelProvider && d?.modelId) {
			return { provider: d.modelProvider, model: d.modelId };
		}
		return null;
	});

	const modelReady = $derived(
		!!pendingModel || (!!effectiveModel && enabledProviders.has(effectiveModel.provider))
	);

	const currentModelLabel = $derived(
		effectiveModel ? `${effectiveModel.provider}/${effectiveModel.model}` : 'Select a model'
	);

	const activeValue = $derived(
		effectiveModel ? `${effectiveModel.provider}/${effectiveModel.model}` : ''
	);
	function onModelSelect(value: string) {
		const [provider, ...rest] = value.split('/');
		const model = rest.join('/');
		if (provider && model) {
			if (sessionId && sessionSettings) {
				updateSettings({ modelProvider: provider, modelId: model });
			} else {
				pendingModel = { provider, model };
			}
		}
		modelSwitcherOpen = false;
	}
</script>

<div class="flex h-full flex-col">
	<SessionStatsWidget
		messages={chat.messages}
		activeStreams={chat.activeStreams}
		{sessionId}
		headroomEnabled={sessionSettings?.headroomEnabled ?? true}
		contextWindow={sessionSettings?.contextWindow ?? 20}
	/>
	<ScrollArea.Root class="flex-1 px-4 pr-16" bind:viewportRef={viewport}>
		<div class="mx-auto flex max-w-2xl flex-col gap-4 py-4">
			{#if chat.displayMessages.length === 0 && chat.activeStreams.length === 0 && !chat.isSending}
				<EmptyState />
			{/if}

			{#each chat.displayMessages as msg (msg.id)}
				<ChatMessage message={msg} />
			{/each}

			{#each chat.activeStreams as stream, index (stream.id)}
				{@const isConsecutive =
					index === 0 &&
					chat.displayMessages.length > 0 &&
					chat.displayMessages[chat.displayMessages.length - 1].role === 'assistant'}
				{@const lastMsg = isConsecutive
					? chat.displayMessages[chat.displayMessages.length - 1]
					: null}
				{@const isDuplicate =
					lastMsg &&
					(!stream.text || lastMsg.content.includes(stream.text)) &&
					(!stream.segments ||
						stream.segments.every(
							(seg) =>
								seg.type !== 'tool' || lastMsg.activities?.some((act) => act.id === seg.toolCallId)
						))}
				{#if !isDuplicate}
					<ChatStream {stream} showAvatar={!isConsecutive} />
				{/if}
			{/each}

			<div class="h-2"></div>
		</div>
	</ScrollArea.Root>

	<!-- Chat Input + Model Switcher -->
	<div class="sticky bottom-0 border-t border-border/10 bg-transparent pt-2 pb-4">
		<ChatInput
			disabled={chat.isSending || !modelReady}
			error={!hasActiveProviders
				? 'Configure a provider with an API key in the sidebar to start.'
				: !modelReady
					? 'Select a model above to start.'
					: chat.error}
			onsend={handleSend}
		/>

		{#snippet modelSelector()}
			{@const activeCtxMsgs =
				chat.displayMessages.filter((m) => m.role === 'assistant').slice(-1)[0]?.contextMessages ?? 0}
			{@const limit = sessionSettings?.contextWindow ?? 20}
			{@const pct = Math.min(Math.max(Math.round((activeCtxMsgs / limit) * 100), 0), 100)}
			<Popover.Root bind:open={modelSwitcherOpen}>
				<Popover.Trigger
					class="flex items-center gap-1.5 rounded-lg border border-border/30 bg-accent/5 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent/15 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
				>
					<!-- Circular Context Indicator -->
					<div
						class="relative flex items-center justify-center"
						title="Context filled: {pct}% ({activeCtxMsgs}/{limit} msgs)"
					>
						<svg class="size-3.5" viewBox="0 0 36 36">
							<path
								stroke="currentColor"
								class="text-muted-foreground/15"
								stroke-width="4.5"
								fill="none"
								d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
							/>
							<path
								stroke="currentColor"
								class="{pct >= 90
									? 'text-destructive'
									: pct >= 75
										? 'text-amber-500'
										: 'text-primary'}"
								stroke-width="4.5"
								stroke-dasharray="{pct}, 100"
								stroke-linecap="round"
								fill="none"
								d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
							/>
						</svg>
					</div>

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
				<Popover.Content side="top" sideOffset={6} align="end" class="w-80 p-0">
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
											onclick={() => onModelSelect(m.value)}
										>
											<span
												class="w-24 shrink-0 truncate font-mono text-[11px] text-muted-foreground"
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
				<Popover.Content side="top" sideOffset={6} align="end" class="w-44 p-0">
					<Command.Root value={currentThinkingLevel}>
						<Command.List>
							<Command.Group heading="Thinking Level">
								{#each thinkingOptions as opt}
									<Command.Item
										value={opt.value}
										onclick={() => onThinkingSelect(opt.value)}
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
			<button
				type="button"
				onclick={() => updateSettings({ headroomEnabled: !sessionSettings?.headroomEnabled })}
				class="flex items-center gap-1 rounded-lg border px-3 py-1 text-[11px] transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none
					{sessionSettings?.headroomEnabled
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
				class="mx-auto mt-2 flex w-fit max-w-lg items-center justify-end gap-2 rounded-xl border border-border/20 bg-black/5 px-3 py-1.5 backdrop-blur-2xl"
			>
				{@render headroomToggle()}
				{@render thinkingSelector()}
				{@render modelSelector()}
			</div>
		{/if}
	</div>
</div>
