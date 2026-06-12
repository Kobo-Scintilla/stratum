<script lang="ts">
	import { Popover as PopoverPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		align = 'center',
		portalProps,
		preventScroll = false,
		trapFocus = false,
		strategy = 'fixed',
		...restProps
	}: PopoverPrimitive.ContentProps & {
		portalProps?: PopoverPrimitive.PortalProps;
	} = $props();
</script>

<PopoverPrimitive.Portal {...portalProps}>
	<PopoverPrimitive.Content
		bind:ref
		data-slot="popover-content"
		{sideOffset}
		{align}
		{preventScroll}
		{trapFocus}
		{strategy}
		onOpenAutoFocus={(e) => {
			e.preventDefault();
			if (e.currentTarget instanceof HTMLElement) {
				e.currentTarget.focus({ preventScroll: true });
			}
		}}
		class={cn(
			'z-50 flex w-72 origin-(--transform-origin) flex-col gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
			className
		)}
		{...restProps}
	/>
</PopoverPrimitive.Portal>
