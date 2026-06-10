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
	class="remixicon ri-expand-up-down-fill {className}"
	{...restProps}
>
	<path d="M18 9 12 3 6 9H18ZM18 15 12 21 6 15H18Z" />
</svg>
