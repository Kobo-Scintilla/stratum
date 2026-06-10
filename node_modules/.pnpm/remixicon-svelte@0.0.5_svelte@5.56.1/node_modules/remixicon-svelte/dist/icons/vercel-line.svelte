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
	class="remixicon ri-vercel-line {className}"
	{...restProps}
>
	<path
		d="M23 21.6479L12 2.35205L1 21.6479H23ZM19.5577 19.6479H4.4423L12 6.39042L19.5577 19.6479Z"
	/>
</svg>
