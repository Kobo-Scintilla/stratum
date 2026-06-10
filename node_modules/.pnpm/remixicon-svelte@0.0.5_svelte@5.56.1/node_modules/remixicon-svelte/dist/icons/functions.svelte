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
	class="remixicon ri-functions {className}"
	{...restProps}
>
	<path d="M5 18L12.6796 12L5 6V4H19V6H8.26348L16 12L8.26348 18H19V20H5V18Z" />
</svg>
