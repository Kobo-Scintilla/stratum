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
	class="remixicon ri-signal-cellular-1-line {className}"
	{...restProps}
>
	<path d="M2 13H8V21H2V13ZM16 19H22V21H16V19ZM9 19H15V21H9V19ZM4 15V19H6V15H4Z" />
</svg>
