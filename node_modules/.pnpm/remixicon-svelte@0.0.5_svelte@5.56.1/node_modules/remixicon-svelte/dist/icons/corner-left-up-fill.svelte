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
	class="remixicon ri-corner-left-up-fill {className}"
	{...restProps}
>
	<path
		d="M10.0001 19.0001L19 19.0003L19 17.0003L12.0001 17.0002L12 9.41409H17.4142L11 2.99988L4.58578 9.41409L10 9.41409L10.0001 19.0001Z"
	/>
</svg>
