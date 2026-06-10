<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { createQuery } from '$lib/stores/create-query.svelte.js';
	import { remult } from 'remult';
	import Button from '../ui/button/button.svelte';
	import { AgentService } from '@opaius/shared/controllers/agent-service.js';
	import {
		Loading02FreeIcons,
		MessageMultiple02FreeIcons,
		PlusSignIcon
	} from '@hugeicons/core-free-icons';
	import Icon from '../Icon.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	import { getChatSession } from '$lib/stores/chat-session.svelte.js';

	interface Session {
		sessionId: string;
		lastMessage: string;
		createdAt: Date | string;
		messageCount: number;
	}

	const sessions = createQuery<Session[]>(
		() => remult.call(AgentService.listSessions, undefined) as Promise<Session[]>,
		$page.data.sessions ?? []
	);
	const chat = getChatSession();

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

	const sessionsWithTime = $derived(
		sessions.data.map((s) => ({
			sessionId: s.sessionId,
			preview: s.lastMessage,
			createdAt: typeof s.createdAt === 'string' ? s.createdAt : s.createdAt.toISOString(),
			messageCount: s.messageCount,
			time: timeAgo(typeof s.createdAt === 'string' ? s.createdAt : s.createdAt.toISOString(), Date.now())
		}))
	);
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
	<Sidebar.Input placeholder="Search sessions..." />
</Sidebar.Header>

<Sidebar.Content>
	<Sidebar.Group class="px-0">
		<Sidebar.GroupContent>
			{#if sessions.loading && sessions.data.length === 0}
				<Icon icon={Loading02FreeIcons} class="size-4 text-primary" />
			{:else}
				{#each sessionsWithTime as item (item.sessionId)}
					<a
						href="/dashboard/{item.sessionId}"
						class="session-item flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-all duration-150 last:border-b-0 hover:brightness-110"
						class:active-session={$page.params.sessionId === item.sessionId}
						style="border-color: oklch(0.5 0.08 185 / 0.12);"
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="truncate text-sm font-medium">{item.preview}</span>
								<span class="shrink-0 text-[10px]" style="color: oklch(0.5 0.03 170)">
									{item.time}
								</span>
							</div>
							<p class="mt-0.5 truncate text-xs" style="color: oklch(0.5 0.03 170)">
								{item.preview}
							</p>
						</div>
					</a>
				{/each}
			{/if}
		</Sidebar.GroupContent>
	</Sidebar.Group>
</Sidebar.Content>

<style>
	.session-item {
		background: transparent;
	}
	.session-item:hover,
	.active-session {
		background: oklch(0.17 0.015 170) !important;
	}
</style>
