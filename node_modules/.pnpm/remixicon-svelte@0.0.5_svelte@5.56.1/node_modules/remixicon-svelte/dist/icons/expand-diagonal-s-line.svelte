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
	class="remixicon ri-expand-diagonal-s-line {className}"
	{...restProps}
>
	<path d="M15.5858 7H12V5H19V12H17V8.41421L8.41421 17H12V19H5V12H7V15.5858L15.5858 7Z" />
</svg>
