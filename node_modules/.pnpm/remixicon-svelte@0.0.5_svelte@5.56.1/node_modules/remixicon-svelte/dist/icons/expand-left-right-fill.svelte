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
	class="remixicon ri-expand-left-right-fill {className}"
	{...restProps}
>
	<path d="M9 6 3 12 9 18V6ZM15 18 21 12 15 6V18Z" />
</svg>
