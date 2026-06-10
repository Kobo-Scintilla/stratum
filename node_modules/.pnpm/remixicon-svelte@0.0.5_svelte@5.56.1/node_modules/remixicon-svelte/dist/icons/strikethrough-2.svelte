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
	class="remixicon ri-strikethrough-2 {className}"
	{...restProps}
>
	<path d="M13 9H11V6H5V4H19V6H13V9ZM13 15V20H11V15H13ZM3 11H21V13H3V11Z" />
</svg>
