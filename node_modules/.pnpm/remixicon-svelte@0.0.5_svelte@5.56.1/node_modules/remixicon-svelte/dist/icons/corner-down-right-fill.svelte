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
	class="remixicon ri-corner-down-right-fill {className}"
	{...restProps}
>
	<path
		d="M4.99989 13.9999L4.99976 5.00003L6.99976 5L6.99986 11.9999L14.5859 12V6.58581L21.0001 13L14.5859 19.4142L14.5859 14L4.99989 13.9999Z"
	/>
</svg>
