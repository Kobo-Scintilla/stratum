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
	class="remixicon ri-service-bell-fill {className}"
	{...restProps}
>
	<path
		d="M15 3V5H13V6.04938C18.0533 6.5511 22 10.8147 22 16H2C2 10.8147 5.94668 6.5511 11 6.04938V5H9V3H15ZM23 20V18H1V20H23Z"
	/>
</svg>
