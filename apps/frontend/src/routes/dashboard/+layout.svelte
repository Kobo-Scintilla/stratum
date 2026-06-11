<script lang="ts">
	import AppSidebar from '$lib/components/sidebar/AppSidebar.svelte';
	import { useNavState } from '$lib/stores/nav-state.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	let { children } = $props();

	const nav = useNavState();
	let sidebarOpen = $state(nav.current !== null);

	$effect(() => {
		sidebarOpen = nav.current !== null;
	});
</script>

<Sidebar.Provider style="--sidebar-width: 350px;" bind:open={sidebarOpen}>
	<AppSidebar />
	<Sidebar.Inset class="bg-transparent!">
		{@render children?.()}
	</Sidebar.Inset>
</Sidebar.Provider>
