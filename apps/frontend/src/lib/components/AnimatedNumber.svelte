<script lang="ts">
	let { value, duration = 800 }: { value: number; duration?: number } = $props();

	let display = $state(0);
	let initialized = false;

	$effect(() => {
		if (!initialized) {
			display = value;
			initialized = true;
			return;
		}
		const target = value;
		const current = display;
		if (target === current) return;

		const diff = target - current;
		const startTime = performance.now();
		let raf: number;

		function animate(now: number) {
			const elapsed = now - startTime;
			const t = Math.min(elapsed / duration, 1);
			// Ease-out cubic
			const eased = 1 - Math.pow(1 - t, 3);
			display = Math.round(current + diff * eased);
			if (t < 1) {
				raf = requestAnimationFrame(animate);
			}
		}

		raf = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(raf);
	});

	function fmtTokens(n: number): string {
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
		if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
		return String(n);
	}

	let formatted = $derived(fmtTokens(display));
</script>

{formatted}
