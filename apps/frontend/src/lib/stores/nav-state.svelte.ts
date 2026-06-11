import { persistedState } from 'svelte-persisted-state';
import { getContext, setContext } from 'svelte';
import { browser } from '$app/environment';

/* ─── Types ─── */

export type TabId = 'sessions' | 'providers' | 'settings';

export type NavItem = {
	id: TabId;
	title: string;
	icon: IconSvgElement;
};

/* ─── Nav items ─── */

import { Folder01Icon, Settings02FreeIcons, ApiIcon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/svelte';

export const navTopItems: NavItem[] = [
	{ id: 'sessions', title: 'Sessions', icon: Folder01Icon },
	{ id: 'providers', title: 'Providers', icon: ApiIcon }
];

export const navBottomItems: NavItem[] = [
	{ id: 'settings', title: 'Settings', icon: Settings02FreeIcons }
];

/* ─── Per-request nav state via context ─── */

const KEY = 'nav-active-tab';
const CONTEXT_KEY = Symbol('nav-state');

function writeCookie(value: unknown) {
	if (!browser) return;
	document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

/**
 * Create nav state inside root layout.
 * `ssrValue` comes from +layout.server.ts cookie read — prevents hydration flash.
 */
export function createNavState(ssrValueOrFn: string | null | (() => string | null)) {
	const ssrValue = typeof ssrValueOrFn === 'function' ? ssrValueOrFn() : ssrValueOrFn;
	const state = persistedState<TabId | null>(KEY, ssrValue as TabId | null, {
		storage: 'local',
		syncTabs: true
	});

	const nav = {
		get current() {
			return state.current;
		},
		set current(v: TabId | null) {
			state.current = v;
			writeCookie(v);
		},
		toggle(id: TabId) {
			nav.current = nav.current === id ? null : id;
		},
		reset() {
			state.reset();
			writeCookie(null);
		}
	};

	setContext(CONTEXT_KEY, nav);
	return nav;
}

export function useNavState() {
	return getContext<ReturnType<typeof createNavState>>(CONTEXT_KEY);
}
