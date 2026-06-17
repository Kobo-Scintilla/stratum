<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useDashboardState } from '$lib/stores/dashboard-state.svelte.js';
	import { remult } from 'remult';
	import Button from '../ui/button/button.svelte';
	import { AgentService } from '@stratum/shared/controllers/agent-service.js';
	import { ChatSessionSettings } from '@stratum/shared/entities/chat-session-settings.js';
	import { ChatMessage } from '@stratum/shared/entities/chat-message.js';
	import { MessageMultiple02FreeIcons, PlusSignIcon } from '@hugeicons/core-free-icons';
	import Icon from '../Icon.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { getChatSession } from '$lib/stores/chat-session.svelte.js';
	import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { createLiveQuery } from '$lib/stores/live-query.svelte.js';
	import { browser } from '$app/environment';
import { optimistic } from '$lib/optimistic.svelte.js';

	interface Session {
		sessionId: string;
		lastMessage: string;
		title?: string;
		pinned?: boolean;
		createdAt: Date | string;
		messageCount: number;
	}

	const dashboard = useDashboardState();
	const chat = getChatSession();
	const liveSessionSettingsQuery = createLiveQuery<
		ChatSessionSettings,
		Map<string, ChatSessionSettings>
	>(() => ({ repo: remult.repo(ChatSessionSettings) }), {
		initial: new Map<string, ChatSessionSettings>(),
		reducer: (info) => {
			const settings = new Map<string, ChatSessionSettings>();
			for (const setting of info.items) {
				settings.set(setting.id, setting);
			}
			return settings;
		}
	});
	const liveSessionSettings = $derived(liveSessionSettingsQuery.data);

	const lastMessageQuery = createLiveQuery<ChatMessage>(() =>
		dashboard.activeTab === 'sessions'
			? {
					repo: remult.repo(ChatMessage),
					options: { limit: 1, orderBy: { createdAt: 'desc' as const } }
				}
			: null
	);

	$effect(() => {
		const _ = lastMessageQuery.data;
		if (browser && !lastMessageQuery.loading) {
			dashboard.refreshSessions();
		}
	});

	function timeAgo(iso: string, now: number): string {
		const diff = now - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		return `${days}d ago`;
	}

	let searchQuery = $state('');
	let renamingSessionId = $state<string | null>(null);
	let renamingTitle = $state('');

	function startRename(id: string, currentTitle: string) {
		renamingSessionId = id;
		renamingTitle = currentTitle;
	}

	function focus(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	async function saveRename(id: string) {
		const newTitle = renamingTitle.trim();
		renamingSessionId = null;
		if (!newTitle) return;

		await remult.call(AgentService.renameSession, undefined, id, newTitle);
		dashboard.refreshSessions();
	}

	async function deleteSession(id: string) {
		if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
			await remult.call(AgentService.deleteSession, undefined, id);
			dashboard.refreshSessions();
			if (page.params.sessionId === id) {
				goto('/dashboard');
			}
		}
	}

	async function togglePin(id: string) {
		const session = dashboard.sessions.find(s => s.sessionId === id);
		if (!session) return;
		const prevPinned = session.pinned;
		session.pinned = !prevPinned;
		await optimistic(
			() => remult.call(AgentService.togglePinSession, undefined, id),
			() => { session.pinned = prevPinned; }
		);
		dashboard.refreshSessions();
	}

	const sessionsWithTime = () =>
		dashboard.sessions.map((s) => {
			const live = liveSessionSettings.get(s.sessionId);
			const createdAt = typeof s.createdAt === 'string' ? s.createdAt : s.createdAt.toISOString();
			return {
				sessionId: s.sessionId,
				preview: s.lastMessage,
				title: live?.title || s.title || s.lastMessage,
				pinned: live?.pinned ?? s.pinned ?? false,
				visibility: s.visibility || 'private',
				ownerId: s.ownerId || '',
				createdAt,
				messageCount: s.messageCount,
				time: timeAgo(createdAt, Date.now())
			};
		});

	const filteredSessions = () => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return sessionsWithTime();
		return sessionsWithTime().filter(
			(s) => s.title.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q)
		);
	};
</script>

<div class="flex h-full flex-col overflow-hidden">
	<Sidebar.Header
		class="shrink-0 gap-3.5 border-b bg-sidebar-accent/5 px-4 py-3 max-md:px-3 max-md:py-2.5"
	>
		<div class="flex w-full items-center gap-3">
			<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20">
				<Icon icon={MessageMultiple02FreeIcons} class="size-4 text-primary" />
			</div>
			<div class="flex flex-col">
				<span class="text-sm font-semibold text-sidebar-foreground">Chat History</span>
				<span class="mt-0.5 text-[10px] leading-none text-sidebar-foreground/50"
					>Manage session logs</span
				>
			</div>
			<Button size="icon-xs" class="ml-auto shrink-0 rounded-lg" onclick={() => goto('/dashboard')}
				><Icon icon={PlusSignIcon} /></Button
			>
		</div>
		<div class="relative w-full">
			<Sidebar.Input
				placeholder="Search sessions..."
				bind:value={searchQuery}
				class="w-full border-border/40 bg-sidebar-accent/10 pl-8 text-xs focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
			/>
			<div
				class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sidebar-foreground/40"
			>
				<svg
					class="size-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
				</svg>
			</div>
		</div>
	</Sidebar.Header>

	<Sidebar.Content class="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
		<ScrollArea.Root class="h-full w-full flex-1">
			<div class="space-y-0.5 py-2 max-md:py-1">
				<Skeleton
					name="sessions-list"
					loading={dashboard.sessionsLoading && dashboard.sessions.length === 0}
				>
					{#snippet fallback()}
						<div class="animate-pulse space-y-3 p-3">
							{#each Array(6) as _, i}
								<div
									class="flex items-center gap-3 border-b border-border/5 py-2.5 last:border-b-0"
								>
									<div class="size-8 shrink-0 rounded-lg bg-sidebar-foreground/10"></div>
									<div class="min-w-0 flex-1 space-y-2">
										<div class="h-3 w-2/3 rounded bg-sidebar-foreground/15"></div>
										<div class="h-2 w-1/2 rounded bg-sidebar-foreground/10"></div>
									</div>
								</div>
							{/each}
						</div>
					{/snippet}

					{#each filteredSessions() as item (item.sessionId)}
						<div
							class="session-item-container group relative flex w-full items-center border-l-2 border-transparent transition-all duration-200 max-md:border-l-[3px]"
							class:active-session={page.params.sessionId === item.sessionId}
						>
							<a
								href="/dashboard/{item.sessionId}"
								class="session-item min-w-0 flex-1 px-4 py-3 text-left transition-all duration-150 max-md:px-3 max-md:py-2"
							>
								<div class="min-w-0 flex-1 pr-6">
									<div class="flex items-center gap-1.5">
										{#if item.pinned}
											<svg
												class="size-3 shrink-0 rotate-45 text-primary"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
											</svg>
										{/if}
									<button
										onclick={async (e) => {
											e.stopPropagation();
											const prevVis = item.visibility;
											item.visibility = item.visibility === 'shared' ? 'private' : 'shared';
											await optimistic(
												() => remult.call(AgentService.toggleSessionVisibility, undefined, item.sessionId),
												() => { item.visibility = prevVis; }
											);
											dashboard.refreshSessions();
										}}
										class="ml-1 flex size-4 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground"
										title={item.visibility === 'shared' ? 'Shared - click to make private' : 'Private - click to share'}
									>
										{#if item.visibility === 'shared'}
											<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
										{:else}
											<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
										{/if}
									</button>

										{#if renamingSessionId === item.sessionId}
											<input
												type="text"
												bind:value={renamingTitle}
												onkeydown={(e) => {
													if (e.key === 'Enter') saveRename(item.sessionId);
													if (e.key === 'Escape') renamingSessionId = null;
												}}
												onblur={() => saveRename(item.sessionId)}
												onclick={(e) => e.stopPropagation()}
												class="w-full rounded border border-primary/45 bg-background px-1.5 py-0.5 text-xs text-foreground focus:ring-1 focus:ring-primary/40 focus:outline-none"
												use:focus
											/>
										{:else}
											<span
												class="truncate text-xs leading-normal font-semibold text-sidebar-foreground/85 transition-colors group-hover:text-sidebar-foreground"
												class:text-primary={page.params.sessionId === item.sessionId}
												>{item.title}</span
											>
										{/if}

										<span class="ml-auto shrink-0 text-[9px] text-sidebar-foreground/45">
											{item.time}
										</span>
									</div>
									<p
										class="mt-0.5 truncate text-[10px] text-sidebar-foreground/45 transition-colors group-hover:text-sidebar-foreground/60"
									>
										{item.preview || 'No messages yet'}
									</p>
								</div>
							</a>

							<div
								class="absolute top-1/2 right-3 z-10 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100"
							>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger
										class="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-foreground focus-visible:outline-none"
									>
										<svg
											class="size-3.5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<circle cx="12" cy="12" r="1" />
											<circle cx="19" cy="12" r="1" />
											<circle cx="5" cy="12" r="1" />
										</svg>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content
										align="end"
										class="w-36 border-border/40 p-1 shadow-lg"
										onOpenAutoFocus={(e) => e.preventDefault()}
										onCloseAutoFocus={(e) => e.preventDefault()}
									>
										<DropdownMenu.Item
											onclick={() => togglePin(item.sessionId)}
											class="flex cursor-pointer items-center gap-2 text-xs"
										>
											<svg
												class="size-3.5 {item.pinned ? 'fill-primary text-primary' : ''}"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
											>
												<path d="M12 2v8M5 10h14M19 10l-2 8H7l-2-8M12 18v4" />
											</svg>
											<span>{item.pinned ? 'Unpin' : 'Pin'}</span>
										</DropdownMenu.Item>

										<DropdownMenu.Item
											onclick={() => startRename(item.sessionId, item.title)}
											class="flex cursor-pointer items-center gap-2 text-xs"
										>
											<svg
												class="size-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
											>
												<path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
											</svg>
											<span>Rename</span>
										</DropdownMenu.Item>

										<DropdownMenu.Separator />

										<DropdownMenu.Item
											onclick={() => deleteSession(item.sessionId)}
											class="flex cursor-pointer items-center gap-2 text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
										>
											<svg
												class="size-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
											>
												<path
													d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"
												/>
											</svg>
											<span>Delete</span>
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</div>
						</div>
					{/each}
				</Skeleton>
			</div>
		</ScrollArea.Root>
	</Sidebar.Content>
</div>

<style>
	.session-item-container {
		background: transparent;
	}
	.session-item-container:hover,
	.session-item-container:focus-within {
		background: var(--sidebar-accent) !important;
	}
	.active-session {
		background: var(--sidebar-accent) !important;
		border-left-color: hsl(var(--primary)) !important;
	}
	.session-item {
		background: transparent;
	}
</style>
