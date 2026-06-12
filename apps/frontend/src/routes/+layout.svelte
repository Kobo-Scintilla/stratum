<script lang="ts">
	import './layout.css';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { remult, Remult } from 'remult';
	import { createSubscriber } from 'svelte/reactivity';
	import { browser } from '$app/environment';
	let { children } = $props();

	// ── Remult Svelte 5 reactivity ─────────────────────────────────
	if (browser) {
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

		// Point Remult client to gateway (matches hooks.server.ts for client side)
		remult.apiClient.url = 'http://localhost:3001/api';
	}
</script>

<Toaster />

{@render children()}
