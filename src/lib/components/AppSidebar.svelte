<script lang="ts">
	import { useNavState } from '$lib/stores/nav-state.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import SidebarNav from './SidebarNav.svelte';
	import SidebarSessionList from './SidebarSessionList.svelte';
	import SidebarProvidersList from './SidebarProvidersList.svelte';

	let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
	const nav = useNavState();
</script>

<Sidebar.Root
	bind:ref
	collapsible="icon"
	class="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
	{...restProps}
>
	<SidebarNav />

	<!-- ─── Right: Content panel ─── -->
	<Sidebar.Root collapsible="none" class="hidden flex-1 md:flex">
		{#if nav.current === 'sessions'}
			<SidebarSessionList />
		{:else if nav.current === 'providers'}
			<SidebarProvidersList />
		{/if}
	</Sidebar.Root>
</Sidebar.Root>
