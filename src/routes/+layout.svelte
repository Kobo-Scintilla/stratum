<script lang="ts">
	import './layout.css';
	import { remult, Remult } from 'remult';
	import { createSubscriber } from 'svelte/reactivity';
	import { createNavState } from '$lib/stores/nav-state.svelte.js';

	let { children, data } = $props();

	// SSR-safe nav state — initialised from cookie (data.activeTab)
	// Falls back to localStorage on client for repeat visits
	createNavState(() => data.activeTab);

	// ── Remult Svelte 5 reactivity ─────────────────────────────────
	{
		let update = () => {};
		let s = createSubscriber((u) => {
			update = u;
		});
		remult.subscribeAuth({ reportObserved: () => s(), reportChanged: () => update() });

		Remult.entityRefInit = (x) => {
			let update2 = () => {};
			let s2 = createSubscriber((u) => {
				update2 = u;
			});
			x.subscribe({ reportObserved: () => s2(), reportChanged: () => update2() });
		};
	}
</script>

{@render children()}
