<script lang="ts">
	import './layout.css';
import { Toaster } from '$lib/components/ui/sonner/index.js';
import { browser } from '$app/environment';
import { remult } from "remult";
import { initRemultSvelteReactivity } from '$lib/remult-init.js';
import { tPageIn, tPageOut } from '$lib/transitions.js';

	let { children } = $props();

	// ── Remult Svelte 5 reactivity (browser only) ───────────────────
	if (browser) {
		initRemultSvelteReactivity();
		remult.apiClient.url = 'http://localhost:3001/api';
	}
</script>

<Toaster />

<div in:tPageIn out:tPageOut>
	{@render children()}
</div>
