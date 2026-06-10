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
	class="remixicon ri-vip-crown-fill {className}"
	{...restProps}
>
	<path
		d="M2.00488 19H22.0049V21H2.00488V19ZM2.00488 5L7.00488 8L12.0049 2L17.0049 8L22.0049 5V17H2.00488V5Z"
	/>
</svg>
