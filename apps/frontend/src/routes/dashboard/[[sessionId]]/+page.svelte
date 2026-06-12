<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { getChatSession, type ChatSession } from '$lib/stores/chat-session.svelte.js';
	import { useDashboardState } from '$lib/stores/dashboard-state.svelte.js';
	import { remult } from 'remult';
	import { safeRandomUUID } from '$lib/utils/uuid.js';
	import { AppSettings } from '@stratum/shared/entities/app-settings.js';
	import { ChatSessionSettings } from '@stratum/shared/entities/chat-session-settings.js';
	import { createLiveQuery } from '$lib/stores/live-query.svelte.js';
	import ChatInputBar from '$lib/components/chat/ChatInputBar.svelte';
	import ChatMessageList from '$lib/components/chat/ChatMessageList.svelte';
	import ToolCall from '$lib/components/chat/ToolCall.svelte';
	import SessionStatsWidget from '$lib/components/chat/SessionStatsWidget.svelte';

	// ── SSR load data DTOs ──
	interface ProviderInfoDto {
		id: string;
		models: Array<{ id: string; contextWindow: number }>;
	}
	interface AppDefaultsDto {
		modelProvider: string;
		modelId: string;
		thinkingLevel: string;
		defaultThinkingLevel?: string;
		defaultHeadroomEnabled?: boolean;
	}

	const pageData = $derived(
		page.data as typeof data & {
			defaults?: AppDefaultsDto | null;
			settings?: ChatSessionSettings | null;
		}
	);
	let { data }: { data: any } = $props();

	const dashboard = useDashboardState();
	let sessionId = $derived(page.params.sessionId);

	const providerInfo = $derived(dashboard.providers);
	const enabledProviders = $derived(dashboard.enabledProviders);

	// svelte-ignore state_referenced_locally
	let sessionSettings = $state<ChatSessionSettings | null>(
		data.settings ?? pageData.settings ?? null
	);
	const appDefaults = $derived(dashboard.defaults);
	let pendingHeadroomEnabled = $state(true);
	let pendingThinkingLevel = $state('medium');

	$effect(() => {
		pendingHeadroomEnabled = appDefaults?.defaultHeadroomEnabled ?? true;
		pendingThinkingLevel = appDefaults?.defaultThinkingLevel ?? 'medium';
	});

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
		sessionSettings = data.settings ?? pageData.settings ?? null;
	});

	// Clear model selection if its provider gets disabled
	$effect(() => {
		if (
			sessionSettings?.modelProvider &&
			sessionSettings.modelId &&
			!enabledProviders.has(sessionSettings.modelProvider)
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

	// svelte-ignore state_referenced_locally
	const sessionSettingsQuery = createLiveQuery<ChatSessionSettings, ChatSessionSettings | null>(
		() =>
			sessionId
				? { repo: remult.repo(ChatSessionSettings), options: { where: { id: sessionId } } }
				: null,
		{
			initial: data.settings ?? pageData.settings ?? null,
			reducer: (info) => info.items[0] ?? null
		}
	);

	$effect(() => {
		sessionSettings = sessionSettingsQuery.data;
	});

	$effect(() => {
		if (sessionSettingsQuery.error) {
			toast.error(sessionSettingsQuery.error, {
				description: 'Session settings live sync failed.',
				duration: 8000
			});
		}
	});

	const appDefaultsQuery = createLiveQuery<AppSettings, AppSettings | null>(
		() => ({ repo: remult.repo(AppSettings), options: { where: { id: '_defaults' } } }),
		{
			initial: dashboard.defaults,
			reducer: (info) => info.items[0] ?? null
		}
	);

	$effect(() => {
		dashboard.defaults = appDefaultsQuery.data;
	});

	$effect(() => {
		if (appDefaultsQuery.error) {
			toast.error(appDefaultsQuery.error, {
				description: 'Default settings live sync failed.',
				duration: 8000
			});
		}
	});
	async function handleSend(text: string) {
		const wasNull = !chat.sessionId;
		const model = pendingModel;

		if (wasNull && model) {
			const sid = safeRandomUUID();
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
					.flatMap((p: any) => p.models.map((m: any) => ({ provider: p.id, ...m })))
					.find((m: any) => m.provider === effectiveModel.provider && m.id === effectiveModel.model)
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

<div class="flex h-full min-h-0 flex-col">
	<SessionStatsWidget
		messages={chat.messages}
		activeStreams={chat.activeStreams}
		{sessionId}
		headroomEnabled={sessionSettings?.headroomEnabled ?? pendingHeadroomEnabled}
		contextWindow={sessionSettings?.contextWindow && sessionSettings.contextWindow > 0
			? sessionSettings.contextWindow
			: (selectedModel?.contextWindow ?? 1_000_000)}
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
