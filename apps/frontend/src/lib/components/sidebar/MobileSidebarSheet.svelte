<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { cn } from '$lib/utils.js';
	import {
		useDashboardState,
		navTopItems,
		navBottomItems
	} from '$lib/stores/dashboard-state.svelte.js';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import RiMenuLine from 'remixicon-svelte/icons/menu-line';
	import Icon from '../Icon.svelte';
	import SidebarSessionList from './SidebarSessionList.svelte';
	import SidebarProvidersList from './SidebarProvidersList.svelte';
	import SidebarSettingsPanel from './SidebarSettingsPanel.svelte';

	const sidebar = useSidebar();
	const dashboard = useDashboardState();
	const allNavItems = [...navTopItems, ...navBottomItems];

	function onNavClick(id: string) {
		dashboard.toggleTab(id as any);
		sidebar.setOpenMobile(false);
	}
</script>

<!-- Trigger: fixed floating button, visible only below md -->
<button
	class="fixed bottom-4 left-4 z-50 flex size-10 items-center justify-center rounded-lg border border-sidebar-border/20 bg-sidebar-accent/20 text-sidebar-foreground backdrop-blur-xl transition-colors hover:bg-sidebar-accent/40 md:hidden"
	onclick={() => sidebar.setOpenMobile(true)}
>
	<RiMenuLine class="size-5" />
	<span class="sr-only">Open sidebar</span>
</button>

<!-- Mobile sheet with nav tabs + active panel -->
<Sheet.Root bind:open={() => sidebar.openMobile, (v) => sidebar.setOpenMobile(v)}>
	<Sheet.Content side="left" showCloseButton={false} class="w-[88vw] p-0 sm:max-w-sm">
		<div class="flex h-full flex-col">
			<!-- Tab navigation row -->
			<div class="flex items-center gap-1 border-b border-sidebar-border/20 p-3">
				{#each allNavItems as item (item.id)}
					<button
						class={cn(
							'flex flex-1 flex-col items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
							dashboard.activeTab === item.id && 'bg-sidebar-accent text-sidebar-accent-foreground',
							dashboard.activeTab !== item.id && 'text-sidebar-foreground/60'
						)}
						onclick={() => onNavClick(item.id)}
					>
						<Icon icon={item.icon} class="size-5" />
						{item.title}
					</button>
				{/each}
			</div>
			<!-- Active panel -->
			<div class="flex-1 overflow-hidden">
				{#if dashboard.activeTab === 'sessions'}
					<SidebarSessionList />
				{:else if dashboard.activeTab === 'providers'}
					<SidebarProvidersList />
				{:else if dashboard.activeTab === 'settings'}
					<SidebarSettingsPanel />
				{/if}
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
