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
	class="remixicon ri-brackets-fill {className}"
	{...restProps}
>
	<path d="M9 3V5H6V19H9V21H4V3H9ZM15 3H20V21H15V19H18V5H15V3Z" />
</svg>
