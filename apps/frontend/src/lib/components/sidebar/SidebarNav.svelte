<script lang="ts">
	import {
		navTopItems,
		navBottomItems,
		useDashboardState
	} from '$lib/stores/dashboard-state.svelte.js';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Icon from '../Icon.svelte';

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
	</Sidebar.Content>
</Sidebar.Root>
