<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { getChatSession, type ChatSession } from '$lib/stores/chat-session.svelte.js';
	import { remult } from 'remult';
	import { AppSettings } from '@opaius/shared/entities/app-settings.js';
	import { ChatSessionSettings } from '@opaius/shared/entities/chat-session-settings.js';
	import {
		getEnabledProviders,
		setEnabledProviders,
		activeProviderIds
	} from '$lib/stores/providers-state.svelte.js';
	import ChatInputBar from '$lib/components/chat/ChatInputBar.svelte';
	import ChatMessageList from '$lib/components/chat/ChatMessageList.svelte';
	import ToolCall from '$lib/components/chat/ToolCall.svelte';
	import SessionStatsWidget from '$lib/components/chat/SessionStatsWidget.svelte';
	// ── SSR load data DTOs ──
	interface ProviderInfoDto {
		id: string;
		models: Array<{ id: string; contextWindow: number }>;
	}
	interface ConfiguredProviderDto {
		id: string;
		enabled: boolean;
		hasKey: boolean;
	}
	interface AppDefaultsDto {
		modelProvider: string;
		modelId: string;
		thinkingLevel: string;
		defaultThinkingLevel?: string;
		defaultHeadroomEnabled?: boolean;
	}
	const pageData = $derived(
		$page.data as typeof data & {
			providers?: ProviderInfoDto[];
			configured?: ConfiguredProviderDto[];
			defaults?: AppDefaultsDto | null;
			settings?: ChatSessionSettings | null;
		}
	);
	let { data }: { data: any } = $props();

	let sessionId = $derived($page.params.sessionId);
	// svelte-ignore state_referenced_locally
	let providerInfo = $state<
		Array<{ id: string; models: Array<{ id: string; contextWindow: number }> }>
	>(pageData.providers ?? []);
	// svelte-ignore state_referenced_locally
	let sessionSettings = $state<ChatSessionSettings | null>(
		data.settings ?? pageData.settings ?? null
	);
	// svelte-ignore state_referenced_locally
	let appDefaults: AppDefaultsDto | AppSettings | null = $state(pageData.defaults ?? null);
	let pendingHeadroomEnabled = $state(true);
	let pendingThinkingLevel = $state('medium');
	$effect(() => {
		pendingHeadroomEnabled = appDefaults?.defaultHeadroomEnabled ?? true;
		pendingThinkingLevel = appDefaults?.defaultThinkingLevel ?? 'medium';
	});
	// svelte-ignore state_referenced_locally
	// Initialize the shared store during SSR/hydration from server-loaded data
	setEnabledProviders(activeProviderIds(pageData.configured ?? []));
	// svelte-ignore state_referenced_locally
	let enabledProviders = $state<Set<string>>(getEnabledProviders());
	let pendingModel = $state<{ provider: string; model: string } | null>(null);

	async function updateSettings(fields: Partial<ChatSessionSettings>) {
		if (sessionId && sessionSettings) {
			sessionSettings = await remult.repo(ChatSessionSettings).save({
				...sessionSettings,
				...fields
			});
		} else if (fields.headroomEnabled !== undefined) {
			pendingHeadroomEnabled = fields.headroomEnabled;
		}
	}

	function onThinkingSelect(value: string) {
		if (sessionId && sessionSettings) {
			updateSettings({ thinkingLevel: value });
		} else {
			pendingThinkingLevel = value;
		}
	}

	// Keep states synchronized with layout load data updates
	$effect(() => {
		providerInfo = pageData.providers ?? [];
		sessionSettings = data.settings ?? pageData.settings ?? null;
		appDefaults = pageData.defaults ?? null;
		setEnabledProviders(activeProviderIds(pageData.configured ?? []));
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
		if (!sessionId) return;
		return remult
			.repo(ChatSessionSettings)
			.liveQuery({ where: { id: sessionId } })
			.subscribe({
				next: (info) => {
					sessionSettings = info.items[0] ?? null;
				},
				error: (err) => {
					toast.error(err instanceof Error ? err.message : String(err), {
						description: 'Session settings live sync failed.',
						duration: 8000
					});
				}
			});
	});
	$effect(() => {
		return remult
			.repo(AppSettings)
			.liveQuery({ where: { id: '_defaults' } })
			.subscribe({
				next: (info) => {
					appDefaults = info.items[0] ?? null;
				},
				error: (err) => {
					toast.error(err instanceof Error ? err.message : String(err), {
						description: 'Default settings live sync failed.',
						duration: 8000
					});
				}
			});
	});
	async function handleSend(text: string) {
		const wasNull = !chat.sessionId;
		const model = pendingModel;

		if (wasNull && model) {
			const sid = crypto.randomUUID();
			await remult.repo(ChatSessionSettings).insert({
				id: sid,
				modelProvider: model.provider,
				modelId: model.model,
				contextWindow: selectedModel?.contextWindow ?? 0,
				thinkingLevel: pendingThinkingLevel,
				headroomEnabled: pendingHeadroomEnabled,
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
	}
</script>

<div class="flex h-full flex-col">
	<SessionStatsWidget
		messages={chat.messages}
		activeStreams={chat.activeStreams}
		{sessionId}
		headroomEnabled={sessionSettings?.headroomEnabled ?? pendingHeadroomEnabled}
		contextWindow={selectedModel?.contextWindow ?? 1_000_000}
	/>
	<ChatMessageList {chat} />

	<ChatInputBar
		{chat}
		{sessionId}
		{sessionSettings}
		messages={chat.messages}
		{providerInfo}
		{enabledProviders}
		{pendingModel}
		{pendingThinkingLevel}
		{pendingHeadroomEnabled}
		{appDefaults}
		onSend={handleSend}
		{onModelSelect}
		{onThinkingSelect}
		{updateSettings}
	/>
</div>
