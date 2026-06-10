<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	let {
		fill = 'currentColor',
		class: className,
		...restProps
	}: SVGAttributes<SVGSVGElement> = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	{fill}
	class="remixicon ri-bar-chart-horizontal-line {className}"
	{...restProps}
>
	<path d="M12 3V5H3V3H12ZM16 19V21H3V19H16ZM22 11V13H3V11H22Z" />
</svg>
