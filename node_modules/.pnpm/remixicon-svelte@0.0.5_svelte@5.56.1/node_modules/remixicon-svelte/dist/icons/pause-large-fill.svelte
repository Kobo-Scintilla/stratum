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
	class="remixicon ri-pause-large-fill {className}"
	{...restProps}
>
	<path d="M6 3H8V21H6V3ZM16 3H18V21H16V3Z" />
</svg>
