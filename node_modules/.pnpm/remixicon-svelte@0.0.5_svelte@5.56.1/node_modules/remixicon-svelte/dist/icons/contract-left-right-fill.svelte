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
	class="remixicon ri-contract-left-right-fill {className}"
	{...restProps}
>
	<path d="M5 18 11 12 5 6V18ZM19 6 13 12 19 18V6Z" />
</svg>
