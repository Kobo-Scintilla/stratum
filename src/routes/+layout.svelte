<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import { createNavState } from "$lib/stores/nav-state.svelte.js";

	let { children, data } = $props();

	// SSR-safe nav state — initialised from cookie (data.activeTab)
	// Falls back to localStorage on client for repeat visits
	createNavState(data.activeTab);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
