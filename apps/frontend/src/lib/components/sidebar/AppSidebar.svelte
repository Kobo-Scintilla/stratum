<script lang="ts">
	import { useNavState } from '$lib/stores/nav-state.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { fade } from 'svelte/transition';
	import type { ComponentProps } from 'svelte';
	import SidebarNav from './SidebarNav.svelte';
	import SidebarSessionList from './SidebarSessionList.svelte';
	import SidebarProvidersList from './SidebarProvidersList.svelte';
	import SidebarSettingsPanel from './SidebarSettingsPanel.svelte';

	let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
	const nav = useNavState();
</script>

<Sidebar.Root
	bind:ref
	collapsible="icon"
	variant="floating"
	class="glass-sidebar overflow-hidden *:data-[sidebar=sidebar]:flex-row"
	{...restProps}
>
	<SidebarNav />

	<Sidebar.Root collapsible="none" class="[position:relative] hidden flex-1 md:flex">
		{#if nav.current === 'sessions'}
			<div in:fade={{ duration: 150 }} out:fade={{ duration: 100 }} class="absolute inset-0 p-2">
				<SidebarSessionList />
			</div>
		{/if}
		{#if nav.current === 'providers'}
			<div in:fade={{ duration: 150 }} out:fade={{ duration: 100 }} class="absolute inset-0 p-2">
				<SidebarProvidersList />
			</div>
		{/if}
		{#if nav.current === 'settings'}
			<div in:fade={{ duration: 150 }} out:fade={{ duration: 100 }} class="absolute inset-0 p-2">
				<SidebarSettingsPanel />
			</div>
		{/if}
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
