<script lang="ts">
	import AppSidebar from '$lib/components/AppSidebar.svelte';

	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	let { children } = $props();
</script>

<Sidebar.Provider style="--sidebar-width: 350px;">
	<AppSidebar />
	<Sidebar.Inset>
		{@render children?.()}
	</Sidebar.Inset>
</Sidebar.Provider>
