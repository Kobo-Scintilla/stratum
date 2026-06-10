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
	class="remixicon ri-number-1 {className}"
	{...restProps}
>
	<path d="M14 1.5V22H12V3.704L7.5 4.91V2.839L12.5 1.5H14Z" />
</svg>
