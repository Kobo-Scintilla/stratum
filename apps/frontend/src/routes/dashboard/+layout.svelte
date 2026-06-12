<script lang="ts">
	import AppSidebar from '$lib/components/sidebar/AppSidebar.svelte';
	import { createDashboardState } from '$lib/stores/dashboard-state.svelte.js';
	import { headroomInstallStore } from '$lib/stores/headroom-install.svelte.js';
	import MobileSidebarSheet from '$lib/components/sidebar/MobileSidebarSheet.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	let { children, data } = $props();

	// svelte-ignore state_referenced_locally
	if (data.headroomFeatures) {
		// svelte-ignore state_referenced_locally
		headroomInstallStore.initialize(data.headroomFeatures);
	}

	$effect.pre(() => {
		if (data.headroomFeatures) {
			headroomInstallStore.initialize(data.headroomFeatures);
		}
	});

	// svelte-ignore state_referenced_locally
	const dashboard = createDashboardState({
		activeTab: data.activeTab,
		sessions: data.sessions,
		providers: data.providers,
		configured: data.configured,
		defaults: data.defaults
	});

	// Synchronize router data updates into the dashboard store
	$effect(() => {
		dashboard.sessions = data.sessions;
		dashboard.providers = data.providers;
		dashboard.configured = data.configured;
		dashboard.defaults = data.defaults;
	});

	let sidebarOpen = $state(dashboard.activeTab !== null);

	$effect(() => {
		sidebarOpen = dashboard.activeTab !== null;
	});
</script>

<Sidebar.Provider style="--sidebar-width: 350px;" bind:open={sidebarOpen}>
	<AppSidebar />
	<MobileSidebarSheet />
	<Sidebar.Inset class="bg-transparent!">
		{@render children?.()}
	</Sidebar.Inset>
</Sidebar.Provider>
