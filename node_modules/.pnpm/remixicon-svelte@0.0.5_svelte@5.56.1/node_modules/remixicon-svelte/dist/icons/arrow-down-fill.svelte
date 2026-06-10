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
	class="remixicon ri-arrow-down-fill {className}"
	{...restProps}
>
	<path d="M13 12H20L12 20L4 12H11V4H13V12Z" />
</svg>
