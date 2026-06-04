import { persistedState } from "svelte-persisted-state";
import { getContext, setContext } from "svelte";
import { browser } from "$app/environment";
import type { Component } from "svelte";

/* ─── Types ─── */

export type TabId = "sessions";

export type NavItem = {
	id: TabId;
	title: string;
	icon: Component;
};

/* ─── Nav items ─── */

import MessagesSquare from "@lucide/svelte/icons/messages-square";

export const navItems: NavItem[] = [
	{ id: "sessions", title: "Sessions", icon: MessagesSquare },
];

/* ─── Per-request nav state via context ─── */

const KEY = "nav-active-tab";
const CONTEXT_KEY = Symbol("nav-state");

function writeCookie(value: unknown) {
	if (!browser) return;
	document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

/**
 * Create nav state inside root layout.
 * `ssrValue` comes from +layout.server.ts cookie read — prevents hydration flash.
 */
export function createNavState(ssrValue: string | null) {
	const state = persistedState<TabId | null>(KEY, ssrValue as TabId | null, {
		storage: "local",
		syncTabs: true,
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
		},
	};

	setContext(CONTEXT_KEY, nav);
	return nav;
}

export function useNavState() {
	return getContext<ReturnType<typeof createNavState>>(CONTEXT_KEY);
}
