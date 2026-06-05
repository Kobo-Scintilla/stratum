<script lang="ts">
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import { useNavState } from '$lib/stores/nav-state.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import SidebarNav from './sidebar-nav.svelte';
	import SidebarSessionList from './sidebar-session-list.svelte';

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
		<SidebarSessionList />
	</Sidebar.Root>
</Sidebar.Root>
