<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		loading = true,
		children,
		name,
		fallback,
		ref = $bindable(null),
		...restProps
	}: {
		class?: string;
		loading?: boolean;
		children?: import('svelte').Snippet;
		name?: string;
		fallback?: import('svelte').Snippet;
		ref?: any;
		[key: string]: any;
	} = $props();
</script>

{#if loading}
	<div
		bind:this={ref}
		class={cn('flex w-full items-center justify-center p-8', className)}
		{...restProps}
	>
		<svg
			class="size-6 animate-spin text-primary"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="3"
			aria-hidden="true"
		>
			<circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" />
			<path
				class="opacity-80"
				d="M12 2a10 10 0 0 1 10 10"
				stroke="currentColor"
				stroke-linecap="round"
			/>
		</svg>
	</div>
{:else}
	{@render children?.()}
{/if}
