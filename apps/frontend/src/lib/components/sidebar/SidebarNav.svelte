<script lang="ts">
	import { navItems, useNavState } from '$lib/stores/nav-state.svelte.js';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Icon from '../Icon.svelte';

	const sidebar = useSidebar();
	const nav = useNavState();
</script>

<Sidebar.Root collapsible="none" class="w-[calc(var(--sidebar-width-icon)+1px)]! border-e">
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupContent class="px-1.5 md:px-0">
				<Sidebar.Menu>
					{#each navItems as item (item.id)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								tooltipContent={item.title}
								isActive={nav.current === item.id}
								class="px-2.5 md:px-2"
								onclick={() => {
									const wasActive = nav.current === item.id;
									nav.toggle(item.id);
									if (wasActive) {
										sidebar.setOpen(false);
									} else {
										sidebar.setOpen(true);
									}
								}}
							>
								<Icon icon={item.icon} class="size-5" />
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer />
</Sidebar.Root>
