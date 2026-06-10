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
	class="remixicon ri-space {className}"
	{...restProps}
>
	<path d="M4 9V13H20V9H22V14C22 14.5523 21.5523 15 21 15H3C2.44772 15 2 14.5523 2 14V9H4Z" />
</svg>
