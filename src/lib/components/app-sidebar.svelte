<script lang="ts">
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import { navItems, useNavState } from '$lib/stores/nav-state.svelte.js';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';

	let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
	const sidebar = useSidebar();
	const nav = useNavState();

	// Placeholder session list
	const sessionData = Array.from({ length: 8 }, (_, i) => ({
		id: `sess-${i + 1}`,
		label: `Session ${i + 1}`,
		time: `${Math.floor(Math.random() * 30) + 1}m ago`,
		preview: `Last message from session ${i + 1}...`,
		initial: String.fromCharCode(65 + i),
	}));
</script>

<Sidebar.Root
	bind:ref
	collapsible="icon"
	class="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
	{...restProps}
>
	<!-- ─── Left: Icon strip ─── -->
	<Sidebar.Root collapsible="none" class="w-[calc(var(--sidebar-width-icon)+1px)]! border-e">
		<Sidebar.Header>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton size="lg" class="md:h-8 md:p-0">
						{#snippet child({ props })}
							<a href="##" {...props}>
								<div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
									<LayoutDashboard class="size-4" />
								</div>
								<div class="grid flex-1 text-start text-sm leading-tight">
									<span class="truncate font-medium">Cyber</span>
									<span class="truncate text-xs">dashboard</span>
								</div>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Header>

		<Sidebar.Content>
			<Sidebar.Group>
				<Sidebar.GroupContent class="px-1.5 md:px-0">
					<Sidebar.Menu>
						{#each navItems as item (item.id)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									tooltipContent={item.title}
									isActive={nav.current === item.id}
									onclick={() => {
										nav.toggle(item.id);
										sidebar.setOpen(true);
									}}
								>
									<item.icon class="size-5" />
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		</Sidebar.Content>

		<Sidebar.Footer />
	</Sidebar.Root>

	<!-- ─── Right: Content panel ─── -->
	<Sidebar.Root collapsible="none" class="hidden flex-1 md:flex">
		{#if nav.current}

			<!-- Tab open -->
			<Sidebar.Header class="gap-3.5 border-b p-4">
				<div class="flex w-full items-center gap-3">
					<div
						class="flex size-7 shrink-0 items-center justify-center"
						style="background: oklch(0.65 0.12 185 / 0.15);"
					>
						<MessagesSquare class="size-4" style="color: oklch(0.65 0.12 185)" />
					</div>
					<span class="text-sm font-medium">Sessions</span>
				</div>
				<Sidebar.Input placeholder="Search sessions..." />
			</Sidebar.Header>
			<Sidebar.Content>
				<Sidebar.Group class="px-0">
					<Sidebar.GroupContent>
						{#each sessionData as sess (sess.id)}
							<button
								class="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-all duration-150 hover:brightness-110 last:border-b-0"
								style="border-color: oklch(0.5 0.08 185 / 0.12); background: transparent;"
								onmouseenter={(e) => {
									(e.currentTarget as HTMLElement).style.background = 'oklch(0.17 0.015 170)';
								}}
								onmouseleave={(e) => {
									(e.currentTarget as HTMLElement).style.background = 'transparent';
								}}
							>
								<div
									class="mt-0.5 flex size-6 shrink-0 items-center justify-center text-[10px] font-medium"
									style="background: oklch(0.65 0.12 185 / 0.12); color: oklch(0.65 0.12 185)"
								>
									{sess.initial}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="truncate text-sm font-medium">{sess.label}</span>
										<span class="shrink-0 text-[10px]" style="color: oklch(0.5 0.03 170)">
											{sess.time}
										</span>
									</div>
									<p class="mt-0.5 truncate text-xs" style="color: oklch(0.5 0.03 170)">
										{sess.preview}
									</p>
								</div>
							</button>
						{/each}
					</Sidebar.GroupContent>
				</Sidebar.Group>
			</Sidebar.Content>

		{:else}

			<!-- Default / empty state -->
			<Sidebar.Header class="gap-3.5 border-b p-4">
				<div class="flex w-full items-center gap-3">
					<div
						class="flex size-7 shrink-0 items-center justify-center"
						style="background: oklch(0.5 0.03 170 / 0.2);"
					>
						<LayoutDashboard class="size-4" style="color: oklch(0.5 0.03 170)" />
					</div>
					<span class="text-sm font-medium" style="color: oklch(0.5 0.03 170)">
						Overview
					</span>
				</div>
			</Sidebar.Header>
			<Sidebar.Content>
				<div class="flex flex-col items-center justify-center px-6 py-16 text-center">
					<div
						class="mb-4 flex size-12 items-center justify-center"
						style="background: oklch(0.65 0.12 185 / 0.08);"
					>
						<MessagesSquare class="size-5" style="color: oklch(0.65 0.12 185 / 0.4)" />
					</div>
					<p class="text-sm font-medium">No session selected</p>
					<p class="mt-1 text-xs" style="color: oklch(0.5 0.03 170)">
						Click the sessions icon to browse
					</p>
				</div>
			</Sidebar.Content>
		{/if}
	</Sidebar.Root>
</Sidebar.Root>
