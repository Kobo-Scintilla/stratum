<script lang="ts">
	import { useDashboardState } from '$lib/stores/dashboard-state.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import SidebarNav from './SidebarNav.svelte';
	import SidebarSessionList from './SidebarSessionList.svelte';
	import SidebarProvidersList from './SidebarProvidersList.svelte';
	import SidebarSettingsPanel from './SidebarSettingsPanel.svelte';

	let { ref = $bindable(null), sessionData = null, ...restProps }: ComponentProps<typeof Sidebar.Root> & { sessionData?: any } = $props();
	const dashboard = useDashboardState();
</script>

<Sidebar.Root
	bind:ref
	collapsible="icon"
	variant="floating"
	class="glass-sidebar overflow-hidden *:data-[sidebar=sidebar]:flex-row max-md:hidden"
	{...restProps}
>
	<SidebarNav sessionData={sessionData} />

	<Sidebar.Root collapsible="none" class="[position:relative] flex flex-1 overflow-hidden md:flex">
		<!-- Mobile: show only active panel in-flow (no absolute positioning) -->
		<div class="flex flex-1 flex-col overflow-hidden md:hidden">
			{#if dashboard.activeTab === 'sessions'}
				<SidebarSessionList />
			{:else if dashboard.activeTab === 'providers'}
				<SidebarProvidersList />
			{:else if dashboard.activeTab === 'settings'}
				<SidebarSettingsPanel />
			{/if}
		</div>

		<!-- Desktop: absolute positioned with opacity transitions -->
		<div class="relative hidden flex-1 md:flex">
			<div
				class="absolute inset-0 flex flex-col overflow-hidden p-2 transition-opacity duration-150"
				class:opacity-100={dashboard.activeTab === 'sessions'}
				class:opacity-0={dashboard.activeTab !== 'sessions'}
				class:pointer-events-none={dashboard.activeTab !== 'sessions'}
			>
				<SidebarSessionList />
			</div>
			<div
				class="absolute inset-0 flex flex-col overflow-hidden p-2 transition-opacity duration-150"
				class:opacity-100={dashboard.activeTab === 'providers'}
				class:opacity-0={dashboard.activeTab !== 'providers'}
				class:pointer-events-none={dashboard.activeTab !== 'providers'}
			>
				<SidebarProvidersList />
			</div>
			<div
				class="absolute inset-0 flex flex-col overflow-hidden p-2 transition-opacity duration-150"
				class:opacity-100={dashboard.activeTab === 'settings'}
				class:opacity-0={dashboard.activeTab !== 'settings'}
				class:pointer-events-none={dashboard.activeTab !== 'settings'}
			>
				<SidebarSettingsPanel />
			</div>
		</div>
	</Sidebar.Root>
</Sidebar.Root>

<style>
	/* Sidebar inner (icon strip + content) gets glass backdrop */
	:global([data-slot='sidebar-inner']) {
		backdrop-filter: blur(40px);
		-webkit-backdrop-filter: blur(40px);
	}

	/* Float the sidebar container away from left edge.
	   Only the outer sidebar has glass-sidebar in its class list. */
	:global(.glass-sidebar[data-slot='sidebar-container']) {
		left: 12px !important;
	}

	/* Gap between sidebar and content */
	:global([data-slot='sidebar']:has(.glass-sidebar) [data-slot='sidebar-gap']) {
		margin-inline-end: 16px !important;
		margin-inline-start: 4px !important;
	}
</style>
