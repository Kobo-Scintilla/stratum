<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { createQuery } from '$lib/stores/create-query.svelte.js';
	import { remult } from 'remult';
	import Button from '../ui/button/button.svelte';
	import { AgentService } from '@opaius/shared/controllers/agent-service.js';
	import { ChatSessionSettings } from '@opaius/shared/entities/chat-session-settings.js';
	import {
		Loading02FreeIcons,
		MessageMultiple02FreeIcons,
		PlusSignIcon
	} from '@hugeicons/core-free-icons';
	import Icon from '../Icon.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { getChatSession } from '$lib/stores/chat-session.svelte.js';

	interface Session {
		sessionId: string;
		lastMessage: string;
		title?: string;
		pinned?: boolean;
		createdAt: Date | string;
		messageCount: number;
	}

	const sessions = createQuery<Session[]>(
		() => remult.call(AgentService.listSessions, undefined) as Promise<Session[]>,
		$page.data.sessions ?? []
	);
	const chat = getChatSession();
	let liveSessionSettings = $state(new Map<string, ChatSessionSettings>());

	$effect(() => {
		return remult
			.repo(ChatSessionSettings)
			.liveQuery({})
			.subscribe({
				next: (info) => {
					const settings = new Map<string, ChatSessionSettings>();
					for (const setting of info.items) {
						settings.set(setting.id, setting);
					}
					liveSessionSettings = settings;
				}
			});
	});

	$effect(() => {
		chat.sessionId;
		chat.isSending;
		sessions.refresh();
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
		sessions.refresh();
	}

	async function deleteSession(id: string) {
		if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
			await remult.call(AgentService.deleteSession, undefined, id);
			sessions.refresh();
			if ($page.params.sessionId === id) {
				goto('/dashboard');
			}
		}
	}

	async function togglePin(id: string) {
		await remult.call(AgentService.togglePinSession, undefined, id);
		sessions.refresh();
	}

	const sessionsWithTime = $derived(
		sessions.data.map((s) => {
			const live = liveSessionSettings.get(s.sessionId);
			const createdAt = typeof s.createdAt === 'string' ? s.createdAt : s.createdAt.toISOString();
			return {
				sessionId: s.sessionId,
				preview: s.lastMessage,
				title: live?.title || s.title || s.lastMessage,
				pinned: live?.pinned ?? s.pinned ?? false,
				createdAt,
				messageCount: s.messageCount,
				time: timeAgo(createdAt, Date.now())
			};
		})
	);

	const filteredSessions = $derived.by(() => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return sessionsWithTime;
		return sessionsWithTime.filter(
			(s) => s.title.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q)
		);
	});
</script>

<Sidebar.Header class="gap-3.5 border-b px-4 py-3">
	<div class="flex w-full items-center gap-3">
		<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20">
			<Icon icon={MessageMultiple02FreeIcons} class="size-4 text-primary" />
		</div>
		<span class="text-sm font-medium">Chat</span>
		<Button size="icon-xs" class="ml-auto" onclick={() => goto('/dashboard')}
			><Icon icon={PlusSignIcon} /></Button
		>
	</div>
	<Sidebar.Input placeholder="Search sessions..." bind:value={searchQuery} />
</Sidebar.Header>

<Sidebar.Content>
	<Sidebar.Group class="px-0">
		<Sidebar.GroupContent>
			{#if sessions.loading && sessions.data.length === 0}
				<div class="flex items-center justify-center p-4">
					<Icon icon={Loading02FreeIcons} class="size-4 animate-spin text-primary" />
				</div>
			{:else}
				{#each filteredSessions as item (item.sessionId)}
					<div
						class="session-item-container group relative flex w-full items-center border-b last:border-b-0 hover:brightness-110"
						class:active-session={$page.params.sessionId === item.sessionId}
						style="border-color: var(--sidebar-border);"
					>
						<!-- Main link (click to navigate) -->
						<a
							href="/dashboard/{item.sessionId}"
							class="session-item min-w-0 flex-1 px-4 py-3 text-left transition-all duration-150 active:brightness-95"
						>
							<div class="min-w-0 flex-1 pr-6">
								<div class="flex items-center gap-1.5">
									<!-- Pinned status badge -->
									{#if item.pinned}
										<svg
											class="size-3 shrink-0 rotate-45 text-primary"
											viewBox="0 0 24 24"
											fill="currentColor"
										>
											<path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
										</svg>
									{/if}

									{#if renamingSessionId === item.sessionId}
										<!-- svelte-ignore a11y_autofocus -->
										<input
											type="text"
											bind:value={renamingTitle}
											onkeydown={(e) => {
												if (e.key === 'Enter') saveRename(item.sessionId);
												if (e.key === 'Escape') renamingSessionId = null;
											}}
											onblur={() => saveRename(item.sessionId)}
											onclick={(e) => e.stopPropagation()}
											class="w-full rounded border border-primary/45 bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
											use:focus
										/>
									{:else}
										<span class="truncate text-sm font-medium">{item.title}</span>
									{/if}

									<span class="ml-auto shrink-0 text-[10px] text-sidebar-foreground/60">
										{item.time}
									</span>
								</div>
								<p class="mt-0.5 truncate text-xs text-sidebar-foreground/45">
									{item.preview}
								</p>
							</div>
						</a>

						<!-- Options Button (visible on hover) -->
						<div
							class="absolute top-1/2 right-2 z-10 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
						>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger
									class="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted-foreground/10 hover:text-foreground focus-visible:outline-none"
								>
									<svg
										class="size-4"
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
								<DropdownMenu.Content align="end" class="w-36 p-1">
									<!-- Pin / Unpin option -->
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

									<!-- Rename option -->
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

									<!-- Delete option -->
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
			{/if}
		</Sidebar.GroupContent>
	</Sidebar.Group>
</Sidebar.Content>

<style>
	.session-item-container {
		background: transparent;
	}
	.session-item-container:hover,
	.session-item-container:focus-within,
	.active-session {
		background: var(--sidebar-accent) !important;
	}
	.session-item {
		background: transparent;
	}
</style>
