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
	class="remixicon ri-notification-snooze-fill {className}"
	{...restProps}
>
	<path
		d="M22 17H20V10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10V17H2V19H22V17ZM15 23V21H9V23H15ZM9 9V7H15V9.41421L11.4142 13H15V15H9V12.5858L12.5858 9H9Z"
	/>
</svg>
