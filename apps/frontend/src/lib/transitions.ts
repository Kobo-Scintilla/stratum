/**
 * transitions.ts — Scintilla animation registry
 *
 * All transitions live here. Import named functions and use as Svelte directives:
 *
 *   import { tCardIn, tCardOut, tFade, tFadeQuick, stagger } from '$lib/transitions'
 *   <div in:tCardIn out:tCardOut>…</div>
 *   <div in:tCardIn={{ delay: stagger(i) }}>…</div>
 *
 * Every function respects prefers-reduced-motion (duration → 0).
 * Params are optional overrides on top of preset defaults.
 */

import { backOut, cubicInOut, cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import { fade, fly, scale, slide } from 'svelte/transition';

// ─── Reduced motion ───────────────────────────────────────────────────────────

/** Zero duration when user prefers reduced motion, else return ms unchanged. */
function d(ms: number): number {
	if (typeof window === 'undefined') return ms;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlyParams {
	y?: number;
	x?: number;
	duration?: number;
	delay?: number;
}
interface FadeParams {
	duration?: number;
	delay?: number;
}
interface SlideParams {
	duration?: number;
	delay?: number;
	axis?: 'x' | 'y';
}
interface ScaleParams {
	duration?: number;
	delay?: number;
	start?: number;
}

// ─── Page-level ───────────────────────────────────────────────────────────────

/** Route container entrance — y:16, 300ms cubicOut */
export function tPageIn(
	node: Element,
	params: FlyParams = {}
): TransitionConfig {
	return fly(node, {
		y: params.y ?? 16,
		x: params.x,
		duration: d(params.duration ?? 300),
		delay: params.delay ?? 0,
		easing: cubicOut
	});
}

/** Route container exit — y:-8, 200ms cubicOut */
export function tPageOut(
	node: Element,
	params: FlyParams = {}
): TransitionConfig {
	return fly(node, {
		y: params.y ?? -8,
		x: params.x,
		duration: d(params.duration ?? 200),
		delay: params.delay ?? 0,
		easing: cubicOut
	});
}

// ─── Fades ────────────────────────────────────────────────────────────────────

/** Standard fade — 200ms. Overlays, error/empty states, skeletons. */
export function tFade(
	node: Element,
	params: FadeParams = {}
): TransitionConfig {
	return fade(node, {
		duration: d(params.duration ?? 200),
		delay: params.delay ?? 0
	});
}

/** Quick fade — 120ms. Tooltips, badges, tiny state swaps. */
export function tFadeQuick(
	node: Element,
	params: FadeParams = {}
): TransitionConfig {
	return fade(node, {
		duration: d(params.duration ?? 120),
		delay: params.delay ?? 0
	});
}

// ─── Cards / list items ───────────────────────────────────────────────────────

/** Card entrance — y:10, 250ms cubicOut. Provider cards, history rows, pending requests. */
export function tCardIn(
	node: Element,
	params: FlyParams = {}
): TransitionConfig {
	return fly(node, {
		y: params.y ?? 10,
		x: params.x,
		duration: d(params.duration ?? 250),
		delay: params.delay ?? 0,
		easing: cubicOut
	});
}

/** Card exit — y:-10, 180ms cubicOut. Optimistic removals (accept/reject). */
export function tCardOut(
	node: Element,
	params: FlyParams = {}
): TransitionConfig {
	return fly(node, {
		y: params.y ?? -10,
		x: params.x,
		duration: d(params.duration ?? 180),
		delay: params.delay ?? 0,
		easing: cubicOut
	});
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

/**
 * Incoming message bubble — y:12, 240ms cubicOut.
 * Use ONLY for messages from other users (not own sent messages).
 * Gate with: `in:tMessageIn={{ duration: animatedIncomingIds.has(msg.id) ? 240 : 0 }}`
 */
export function tMessageIn(
	node: Element,
	params: FlyParams = {}
): TransitionConfig {
	return fly(node, {
		y: params.y ?? 12,
		x: params.x,
		duration: d(params.duration ?? 240),
		delay: params.delay ?? 0,
		easing: cubicOut
	});
}

// ─── Panels / drawers ─────────────────────────────────────────────────────────

/** Panel slide in/out — y axis, 200ms cubicOut. Collapsible sections, expand rows. */
export function tSlide(
	node: Element,
	params: SlideParams = {}
): TransitionConfig {
	return slide(node, {
		duration: d(params.duration ?? 200),
		delay: params.delay ?? 0,
		axis: params.axis ?? 'y',
		easing: cubicOut
	});
}

/** Input / toolbar area appear/disappear — 180ms cubicInOut. Bottom bars, chat input. */
export function tInputArea(
	node: Element,
	params: SlideParams = {}
): TransitionConfig {
	return slide(node, {
		duration: d(params.duration ?? 180),
		delay: params.delay ?? 0,
		axis: params.axis ?? 'y',
		easing: cubicInOut
	});
}

// ─── Modals / overlays ────────────────────────────────────────────────────────

/** Modal content scale — 0.95→1, 220ms cubicOut. Dialog inner content. */
export function tModalIn(
	node: Element,
	params: ScaleParams = {}
): TransitionConfig {
	return scale(node, {
		duration: d(params.duration ?? 220),
		delay: params.delay ?? 0,
		start: params.start ?? 0.95,
		easing: cubicOut
	});
}

// ─── Notifications ────────────────────────────────────────────────────────────

/** Badge pop — scale 0.4→1 with backOut, 200ms. Count badges, notification dots. */
export function tBadgePop(
	node: Element,
	params: ScaleParams = {}
): TransitionConfig {
	return scale(node, {
		duration: d(params.duration ?? 200),
		delay: params.delay ?? 0,
		start: params.start ?? 0.4,
		easing: backOut
	});
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

/** Tab panel swap — x:8, 200ms cubicOut. Pass x:-8 for reverse direction. */
export function tTabIn(
	node: Element,
	params: FlyParams = {}
): TransitionConfig {
	return fly(node, {
		x: params.x ?? 8,
		y: params.y ?? 0,
		duration: d(params.duration ?? 200),
		delay: params.delay ?? 0,
		easing: cubicOut
	});
}

// ─── Stagger helper ───────────────────────────────────────────────────────────

/**
 * Delay (ms) for index i in a staggered list. Caps at maxDelay so long lists stay snappy.
 *
 * Usage: `in:tCardIn={{ delay: stagger(i) }}`
 */
export function stagger(i: number, step = 40, maxDelay = 200): number {
	if (
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	)
		return 0;
	return Math.min(i * step, maxDelay);
}

// ─── CSS animation tokens ─────────────────────────────────────────────────────
// Use only when a Svelte transition cannot be used (e.g. continuous loops).

export const cssAnim = {
	/** Skeleton shimmer — Tailwind `animate-pulse` */
	skeleton: 'animate-pulse',
	/** Continuous spinner */
	spin: 'animate-spin',
	/** Notification ping */
	ping: 'animate-ping'
} as const;
