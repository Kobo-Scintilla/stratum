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
	class="remixicon ri-skip-up-fill {className}"
	{...restProps}
>
	<path d="M6 7 18 7V9L6 9 6 7ZM12 11 6 17H18L12 11Z" />
</svg>
