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
	let configuredProviders = $state<Set<string>>(new Set());
	let sessionSettings = $state<ChatSessionSettings | null>(null);
	let modelSwitcherOpen = $state(false);

	onMount(async () => {
		const [providers, keys] = await Promise.all([
			AgentService.getProvidersInfo(),
			AgentService.getProviderApiKeys()
		]);
		providerInfo = providers;
		// Only show providers that have API keys configured
		const configured = new Set(Object.keys(keys));
		configuredProviders = configured;
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
								modelProvider: 'opencode-go',
								modelId: 'deepseek-v4-flash',
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

	function handleSend(text: string) {
		const wasNull = !chat.sessionId;
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

	// Model groups — only configured providers
	const modelGroups = $derived(
		providerInfo
			.filter((p) => configuredProviders.has(p.id))
			.map((p) => ({
				provider: p.id,
				models: p.models.map((m) => ({
					value: `${p.id}/${m}`,
					label: m,
					provider: p.id
				}))
			}))
	);

	const currentModelLabel = $derived(
		sessionSettings ? `${sessionSettings.modelProvider}/${sessionSettings.modelId}` : 'Select model'
	);

	const activeValue = $derived(
		sessionSettings ? `${sessionSettings.modelProvider}/${sessionSettings.modelId}` : ''
	);
	function onModelSelect(value: string) {
		const [provider, ...rest] = value.split('/');
		const model = rest.join('/');
		if (provider && model) {
			updateSettings({ modelProvider: provider, modelId: model });
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
		<ChatInput disabled={chat.isSending} error={chat.error} onsend={handleSend} />

		{#if sessionId && sessionSettings}
			<div class="mx-auto flex max-w-2xl items-center justify-end px-4 pb-2 pt-1">
				<Popover.Root bind:open={modelSwitcherOpen}>
					<Popover.Trigger>
						<button
							type="button"
							class="flex items-center gap-1.5 rounded-full border border-border/30 bg-accent/5 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/15 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
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
								<Command.Empty>No model found.</Command.Empty>
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
		{/if}
	</div>
</div>
