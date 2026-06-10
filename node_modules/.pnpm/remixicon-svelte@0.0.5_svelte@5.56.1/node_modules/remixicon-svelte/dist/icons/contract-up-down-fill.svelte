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
	class="remixicon ri-contract-up-down-fill {className}"
	{...restProps}
>
	<path d="M18 5 12 11 6 5H18ZM18 19 12 13 6 19H18Z" />
</svg>
