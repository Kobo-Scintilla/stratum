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
	class="remixicon ri-filter-fill {className}"
	{...restProps}
>
	<path d="M21 4V6H20L14 15V22H10V15L4 6H3V4H21Z" />
</svg>
