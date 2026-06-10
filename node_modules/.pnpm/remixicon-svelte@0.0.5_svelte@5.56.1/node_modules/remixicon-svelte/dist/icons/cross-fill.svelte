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
	class="remixicon ri-cross-fill {className}"
	{...restProps}
>
	<path d="M14 2H10V8H4V12H10V22H14V12H20V8H14V2Z" />
</svg>
