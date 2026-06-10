<script lang="ts">
	import type { IconSvgElement } from '@hugeicons/svelte';
	import type { SVGAttributes } from 'svelte/elements';

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

	let {
		icon,
		altIcon,
		size = '1em',
		strokeWidth = 2,
		absoluteStrokeWidth = false,
		color = 'currentColor',
		showAlt = false,
		class: className = '',
		className: legacyClassName = '',
		...restProps
	}: Props = $props();

	// merge class and className for backward compatibility
	const finalClassName = $derived(className || legacyClassName);

	// Get active icon tuple array
	const activeIcon = $derived(showAlt && altIcon ? altIcon : icon);

	// Calculate stroke width if explicitly set
	const calculatedStrokeWidth = $derived(
		strokeWidth !== undefined
			? absoluteStrokeWidth
				? strokeWidth * (24 / Number(size))
				: strokeWidth
			: undefined
	);

	const camelToKebab = (str: string) => {
		return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
	};

	const processedElements = $derived(
		(activeIcon || []).map(([tag, attrs]) => {
			const kebabAttrs: Record<string, any> = {};
			for (const [key, val] of Object.entries(attrs)) {
				kebabAttrs[camelToKebab(key)] = val;
			}
			if (calculatedStrokeWidth !== undefined) {
				kebabAttrs['stroke-width'] = calculatedStrokeWidth;
				kebabAttrs['stroke'] = 'currentColor';
			}
			return { tag, attrs: kebabAttrs };
		})
	);
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	{color}
	class={finalClassName}
	{...restProps}
>
	{#each processedElements as { tag, attrs }}
		<svelte:element this={tag} {...attrs} />
	{/each}
</svg>
