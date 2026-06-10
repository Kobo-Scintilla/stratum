<script lang="ts">
	import { useNavState } from '$lib/stores/nav-state.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { fade } from 'svelte/transition';
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

	<Sidebar.Root collapsible="none" class="hidden flex-1 md:flex [position:relative]">
		{#if nav.current === 'sessions'}
			<div in:fade={{ duration: 150 }} out:fade={{ duration: 100 }} class="absolute inset-0">
				<SidebarSessionList />
			</div>
		{/if}
		{#if nav.current === 'providers'}
			<div in:fade={{ duration: 150 }} out:fade={{ duration: 100 }} class="absolute inset-0">
				<SidebarProvidersList />
			</div>
		{/if}
	</Sidebar.Root>
</Sidebar.Root>
