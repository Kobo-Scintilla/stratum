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
	class="remixicon ri-download-fill {className}"
	{...restProps}
>
	<path d="M3 19H21V21H3V19ZM13 9H20L12 17L4 9H11V1H13V9Z" />
</svg>
