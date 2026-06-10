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
	class="remixicon ri-menu-line {className}"
	{...restProps}
>
	<path d="M3 4H21V6H3V4ZM3 11H21V13H3V11ZM3 18H21V20H3V18Z" />
</svg>
