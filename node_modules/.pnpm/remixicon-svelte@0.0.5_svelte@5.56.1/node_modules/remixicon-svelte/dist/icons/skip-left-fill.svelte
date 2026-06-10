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
	class="remixicon ri-skip-left-fill {className}"
	{...restProps}
>
	<path d="M7 18V6H9V18H7ZM11 12 17 6V18L11 12Z" />
</svg>
