<script lang="ts">
	import { navTopItems, navBottomItems, useDashboardState } from '$lib/stores/dashboard-state.svelte.js';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import Icon from '../Icon.svelte';
	import { authClient } from '$lib/auth-client.js';
	import { goto } from '$app/navigation';
	let { sessionData = null }: { sessionData?: any } = $props();

	const sidebar = useSidebar();
	const dashboard = useDashboardState();

	function onNavClick(id: string) {
		const wasActive = dashboard.activeTab === id;
		dashboard.toggleTab(id as any);
		if (wasActive) {
			sidebar.toggle();
		}
	}
</script>

<Sidebar.Root collapsible="none" class="w-[calc(var(--sidebar-width-icon)+1px)]! border-e">
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupContent class="px-1.5 md:px-0">
				<Sidebar.Menu>
					{#each navTopItems as item (item.id)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								tooltipContent={item.title}
								isActive={dashboard.activeTab === item.id}
								class="px-2.5 md:px-2"
								onclick={() => onNavClick(item.id)}
							>
								<Icon icon={item.icon} class="size-5" />
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<div class="flex-1"></div>

		<Sidebar.Group>
			<Sidebar.GroupContent class="border-t border-sidebar-border/20 px-1.5 pt-2 md:px-0">
				<Sidebar.Menu>
					{#each navBottomItems as item (item.id)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								tooltipContent={item.title}
								isActive={dashboard.activeTab === item.id}
								class="px-2.5 md:px-2"
								onclick={() => onNavClick(item.id)}
							>
								<Icon icon={item.icon} class="size-5" />
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<Sidebar.Group class="!p-0">
			<Sidebar.GroupContent class="px-1.5 md:px-0">
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						{#if sessionData}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger class="mx-auto flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary transition-colors hover:bg-primary/30">
									{sessionData.user.name?.charAt(0)?.toUpperCase() || '?'}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="start" side="right" class="min-w-[160px]">
									<div class="border-b border-border/10 px-3 py-2">
										<p class="text-xs font-medium text-foreground">{sessionData.user.name}</p>
										<p class="text-[10px] text-muted-foreground">{sessionData.user.email}</p>
									</div>
									<DropdownMenu.Item onclick={async () => { await authClient.signOut(); goto('/login'); }} class="cursor-pointer text-red-400 hover:text-red-300">
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
										Sign out
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{/if}
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
</Sidebar.Root>
