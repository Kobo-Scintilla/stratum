<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { getChatSession, type ChatSession } from '$lib/stores/chat-session.svelte.js';
	import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
	import { tick, onMount } from 'svelte';
	import { remult } from 'remult';
	import { ChatSessionSettings } from '$lib/shared/entities/chat-session-settings';
	import { AgentService } from '$lib/shared/services/agent-service';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';

	import EmptyState from '$lib/components/chat/EmptyState.svelte';
	import ChatMessage from '$lib/components/chat/ChatMessage.svelte';
	import ChatStream from '$lib/components/chat/ChatStream.svelte';
	import ChatInput from '$lib/components/chat/ChatInput.svelte';
	import ToolCall from '$lib/components/chat/ToolCall.svelte';

	let providerInfo = $state<Array<{ id: string; models: string[] }>>([]);
	let enabledProviders = $state<Set<string>>(new Set());
	let sessionSettings = $state<ChatSessionSettings | null>(null);
	let modelSwitcherOpen = $state(false);
let pendingModel = $state<{ provider: string; model: string } | null>(null);

	onMount(async () => {
		const [providers, configured] = await Promise.all([
			AgentService.getProvidersInfo(),
			AgentService.getConfiguredProviders()
		]);
		providerInfo = providers;
		// Only show providers that are enabled AND have API keys
		const enabled = new Set(
			configured.filter((c) => c.enabled && c.hasKey).map((c) => c.id)
		);
		enabledProviders = enabled;
	});
	let sessionId = $derived($page.params.sessionId);
	// svelte-ignore state_referenced_locally
	let chat: ChatSession = getChatSession(sessionId, $page.data.messages);
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
				chat.switchSession(cur, $page.data.messages);
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
								modelProvider: '',
								modelId: '',
								contextWindow: 20
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
				contextWindow: 20
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
	const modelReady = $derived(
		!!pendingModel || (
			!!sessionSettings?.modelProvider && !!sessionSettings?.modelId && enabledProviders.has(sessionSettings.modelProvider)
		)
	);

	const currentModelLabel = $derived(
		pendingModel
			? `${pendingModel.provider}/${pendingModel.model}`
			: sessionSettings?.modelProvider && sessionSettings?.modelId
				? `${sessionSettings.modelProvider}/${sessionSettings.modelId}`
				: 'Select a model'
	);

	const activeValue = $derived(
		pendingModel
			? `${pendingModel.provider}/${pendingModel.model}`
			: sessionSettings?.modelProvider && sessionSettings?.modelId
				? `${sessionSettings.modelProvider}/${sessionSettings.modelId}`
				: ''
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
	<ScrollArea.Root class="flex-1 px-4" bind:viewportRef={viewport}>
		<div class="mx-auto flex max-w-2xl flex-col gap-4 py-4">
			{#if chat.displayMessages.length === 0 && chat.activeStreams.length === 0 && !chat.isSending}
				<EmptyState />
			{/if}

			{#each chat.displayMessages as msg (msg.id)}
				{#if msg.content && msg.content.trim() !== ''}
					<ChatMessage message={msg} />
				{/if}
				{#if msg.toolCalls && msg.toolCalls.length > 0}
					<div class="flex gap-3">
						<div class="w-8 shrink-0"></div>
						<div class="max-w-[80%] space-y-2">
							{#each msg.toolCalls as tc}
								<ToolCall toolCall={tc} result={tc.result} open={false} />
							{/each}
						</div>
					</div>
				{/if}
			{/each}

			{#each chat.activeStreams as stream (stream.id)}
				<ChatStream {stream} />
			{/each}

			<div class="h-2"></div>
		</div>
	</ScrollArea.Root>

	<!-- Chat Input + Model Switcher -->
	<div class="sticky bottom-0 border-t border-border/25 bg-background">
		<ChatInput disabled={chat.isSending || !modelReady} error={!hasActiveProviders ? 'Configure a provider with an API key in the sidebar to start.' : !modelReady ? 'Select a model above to start.' : chat.error} onsend={handleSend} />

		{#if sessionId}
			<div class="mx-auto flex max-w-2xl items-center justify-end px-4 pb-2 pt-1">
				<Popover.Root bind:open={modelSwitcherOpen}>
					<Popover.Trigger>
						<button
							type="button"
							class="flex items-center gap-1.5 rounded-lg border border-border/30 bg-accent/5 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/15 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
						>
							<span>{currentModelLabel}</span>
							<svg class="size-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M6 9l6 6 6-6" />
							</svg>
						</button>
					</Popover.Trigger>
					<Popover.Content side="top" sideOffset={6} align="end" class="w-80 p-0">
						<Command.Root value={activeValue}>
							<Command.Input placeholder="Search models..." />
							<Command.List class="max-h-[min(60vh,28rem)]">
								<Command.Empty>{enabledProviders.size === 0 ? 'No providers configured — open the sidebar to add one.' : 'No model found.'}</Command.Empty>
								{#each modelGroups as group}
									<Command.Group heading={group.provider}>
										{#each group.models as m}
											<Command.Item
												value={m.value}
												class="content-visibility-auto"
												onclick={() => onModelSelect(m.value)}
											>
												<span class="text-[11px] font-mono text-muted-foreground shrink-0 w-24 truncate">{m.provider}</span>
												<span class="truncate text-xs">{m.label}</span>
											</Command.Item>
										{/each}
									</Command.Group>
								{/each}
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>
		{:else if hasActiveProviders}
			<div class="mx-auto flex max-w-2xl items-center justify-end px-4 pb-2 pt-1">
				<div class="relative">
					<button
					type="button"
					class="flex items-center gap-1.5 rounded-lg border border-border/30 bg-accent/5 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/15 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
					onclick={() => (modelSwitcherOpen = !modelSwitcherOpen)}
				>
					<span>{currentModelLabel}</span>
					<svg class="size-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M6 9l6 6 6-6" />
					</svg>
				</button>
				{#if modelSwitcherOpen}
					<div class="absolute bottom-full right-0 z-10 mb-1 w-80 rounded-xl border border-border/40 bg-popover p-1 shadow-lg">
						<div class="no-scrollbar max-h-72 overflow-y-auto">
							{#each modelGroups as group}
							<div class="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.provider}</div>
							{#each group.models as m}
								<button
									type="button"
									class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-accent/50 transition-colors"
									onclick={() => { onModelSelect(m.value); modelSwitcherOpen = false; }}
								>
									<span class="w-24 shrink-0 truncate font-mono text-[11px] text-muted-foreground">{m.provider}</span>
									<span class="truncate">{m.label}</span>
								</button>
							{/each}
							{/each}
						</div>
					</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
