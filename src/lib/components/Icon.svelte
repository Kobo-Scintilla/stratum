<script lang="ts">
	import type { IconSvgElement } from '@hugeicons/svelte';

	interface Props extends SVGAttributes<SVGSVGElement> {
		icon: IconSvgElement;
		altIcon?: IconSvgElement;
		size?: string | number;
		strokeWidth?: number;
		absoluteStrokeWidth?: boolean;
		color?: string;
		showAlt?: boolean;
		class?: string;
		/**
		 * @deprecated Use `class` prop instead. This prop will be removed in a future version.
		 */
		className?: string;
	}
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import type { SVGAttributes } from 'svelte/elements';

	let { strokeWidth = 2, ...others }: Props = $props();
</script>

<HugeiconsIcon {strokeWidth} {...others} />
