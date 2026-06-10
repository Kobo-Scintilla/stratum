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
	class="remixicon ri-square-root {className}"
	{...restProps}
>
	<path d="M15.382 4H22V6H16.618L9 21.2361L5.38197 14H2V12H6.61803L9 16.7639L15.382 4Z" />
</svg>
