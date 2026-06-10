import { n as bind_props, f as setContext, s as spread_props, i as derived, c as attributes, d as clsx$1, b as stringify, o as store_get, p as unsubscribe_stores, g as getContext, a as attr, k as attr_class, e as ensure_array_like, m as escape_html, q as props_id } from './dev-B7dMAZiC.js';
import { P as on } from './internal2-Dec7UoAU.js';
import { A as AgentService } from './agent-service-ZiiPDM6E.js';
import { M as MediaQuery, e as e7, F as FCr, L as Lhr, d as dcr, T as Tn, X as XA, a as cH, Y as Y1, p as p1 } from './index.min-CZbVwdp3.js';
import { u as useNavState, n as navItems } from './nav-state.svelte-CohoPdO3.js';
import { g as goto } from './client-DW6OeM5N.js';
import { b as boxWith, C as Context, s as simpleBox, c as createBitsAttrs, t as tv, a as cn, p as page, I as Icon, d as Input, B as Button, D as Dialog, e as Dialog$1, f as Dialog_content$1, g as Dialog_close, P as Portal, h as createId, n as noop, i as Dialog_overlay$1, j as attachRef, k as PresenceManager, l as boolToEmptyStrOrUndef, m as getDataOpenClosed, o as mergeProps, q as Close_line, r as Dialog_content, u as boolToStr, w as watch, v as afterTick, x as getDataTransitionAttrs, y as Dialog_header, z as Dialog_footer, A as toggleProviderEnabled, E as Dialog_title$1, F as Dialog_description$1, G as Floating_layer, H as getDataChecked, J as getAriaChecked, K as boolToTrueOrUndef, L as DOMContext, M as srOnlyStyles, N as Dialog_title, O as Dialog_description, Q as Floating_layer_anchor, R as Popper_layer_force_mount, S as Popper_layer, T as DOMTypeahead, U as ARROW_DOWN, V as PAGE_UP, W as HOME, X as ARROW_UP, Y as PAGE_DOWN, Z as next, _ as prev, $ as forward, a0 as backward, a1 as getFloatingContentCSSVars, a2 as boxAutoReset, a3 as getNextMatch, a4 as afterSleep, a5 as boolToStrTrueOrUndef, a6 as Check_line, a7 as Previous, a8 as isIOS, a9 as isElement, aa as isFocusVisible, ab as SafePolygon, ac as useId, ad as FloatingArrowState } from './check-line-BYTlmm3o.js';
import './index-DBqjc0Yf.js';
import './chat-message-CwAUUCQ1.js';
import './IdEntity-Le34BexZ.js';
import './chat-session-settings-C_T3OJ8l.js';
import '@earendil-works/pi-ai';

//#region src/lib/hooks/is-mobile.svelte.ts
var DEFAULT_MOBILE_BREAKPOINT = 768;
var IsMobile = class extends MediaQuery {
	constructor(breakpoint = DEFAULT_MOBILE_BREAKPOINT) {
		super(`max-width: ${breakpoint - 1}px`);
	}
};
//#endregion
//#region src/lib/components/ui/sidebar/constants.ts
var SIDEBAR_COOKIE_NAME = "sidebar_state";
var SIDEBAR_COOKIE_MAX_AGE = 3600 * 24 * 7;
var SIDEBAR_WIDTH = "16rem";
var SIDEBAR_WIDTH_MOBILE = "18rem";
var SIDEBAR_WIDTH_ICON = "3rem";
//#endregion
//#region src/lib/components/ui/sidebar/context.svelte.ts
var SidebarState = class {
	props;
	#open = derived(() => this.props.open());
	get open() {
		return this.#open();
	}
	set open($$value) {
		return this.#open($$value);
	}
	openMobile = false;
	setOpen;
	#isMobile;
	#state = derived(() => this.open ? "expanded" : "collapsed");
	get state() {
		return this.#state();
	}
	set state($$value) {
		return this.#state($$value);
	}
	constructor(props) {
		this.setOpen = props.setOpen;
		this.#isMobile = new IsMobile();
		this.props = props;
	}
	get isMobile() {
		return this.#isMobile.current;
	}
	handleShortcutKeydown = (e) => {
		if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			this.toggle();
		}
	};
	setOpenMobile = (value) => {
		this.openMobile = value;
	};
	toggle = () => {
		return this.#isMobile.current ? this.openMobile = !this.openMobile : this.setOpen(!this.open);
	};
};
var SYMBOL_KEY = "scn-sidebar";
/**
* Instantiates a new `SidebarState` instance and sets it in the context.
*
* @param props The constructor props for the `SidebarState` class.
* @returns  The `SidebarState` instance.
*/
function setSidebar(props) {
	return setContext(Symbol.for(SYMBOL_KEY), new SidebarState(props));
}
/**
* Retrieves the `SidebarState` instance from the context. This is a class instance,
* so you cannot destructure it.
* @returns The `SidebarState` instance.
*/
function useSidebar() {
	return getContext(Symbol.for(SYMBOL_KEY));
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-content.svelte
function Sidebar_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sidebar-content",
			"data-sidebar": "content",
			class: clsx$1(cn("no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-auto [--radius:var(--radius-xl)] group-data-[collapsible=icon]:overflow-hidden", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-footer.svelte
function Sidebar_footer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sidebar-footer",
			"data-sidebar": "footer",
			class: clsx$1(cn("flex flex-col gap-2 p-2", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-group-content.svelte
function Sidebar_group_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sidebar-group-content",
			"data-sidebar": "group-content",
			class: clsx$1(cn("w-full text-sm", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-group.svelte
function Sidebar_group($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sidebar-group",
			"data-sidebar": "group",
			class: clsx$1(cn("relative flex w-full min-w-0 flex-col p-2", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-header.svelte
function Sidebar_header($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sidebar-header",
			"data-sidebar": "header",
			class: clsx$1(cn("flex flex-col gap-2 p-2 [--radius:var(--radius-xl)]", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-input.svelte
function Sidebar_input($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, value = "", class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Input($$renderer, spread_props([
				{
					"data-slot": "sidebar-input",
					"data-sidebar": "input",
					class: cn("h-8 w-full bg-input/50 shadow-none", className)
				},
				restProps,
				{
					get ref() {
						return ref;
					},
					set ref($$value) {
						ref = $$value;
						$$settled = false;
					},
					get value() {
						return value;
					},
					set value($$value) {
						value = $$value;
						$$settled = false;
					}
				}
			]));
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, {
			ref,
			value
		});
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-inset.svelte
function Sidebar_inset($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<main${attributes({
			"data-slot": "sidebar-inset",
			class: clsx$1(cn("relative flex w-full flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></main>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/utilities/hidden-input.svelte
function Hidden_input($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { value = void 0, $$slots, $$events, ...restProps } = $$props;
		const mergedProps = derived(() => mergeProps(restProps, {
			"aria-hidden": "true",
			tabindex: -1,
			style: {
				...srOnlyStyles,
				position: "absolute",
				top: "0",
				left: "0"
			}
		}));
		if (mergedProps().type === "checkbox") {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<input${attributes({
				...mergedProps(),
				value
			}, void 0, void 0, void 0, 4)}/>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<input${attributes({
				value,
				...mergedProps()
			}, void 0, void 0, void 0, 4)}/>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { value });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/collapsible/collapsible.svelte.js
var collapsibleAttrs = createBitsAttrs({
	component: "collapsible",
	parts: [
		"root",
		"content",
		"trigger"
	]
});
var CollapsibleRootContext = new Context("Collapsible.Root");
var CollapsibleRootState = class CollapsibleRootState {
	static create(opts) {
		return CollapsibleRootContext.set(new CollapsibleRootState(opts));
	}
	opts;
	attachment;
	contentNode = null;
	contentPresence;
	contentId = void 0;
	constructor(opts) {
		this.opts = opts;
		this.toggleOpen = this.toggleOpen.bind(this);
		this.attachment = attachRef(this.opts.ref);
		this.contentPresence = new PresenceManager({
			ref: boxWith(() => this.contentNode),
			open: this.opts.open,
			onComplete: () => {
				this.opts.onOpenChangeComplete.current(this.opts.open.current);
			}
		});
	}
	toggleOpen() {
		this.opts.open.current = !this.opts.open.current;
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		"data-state": getDataOpenClosed(this.opts.open.current),
		"data-disabled": boolToEmptyStrOrUndef(this.opts.disabled.current),
		[collapsibleAttrs.root]: "",
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var CollapsibleContentState = class CollapsibleContentState {
	static create(opts) {
		return new CollapsibleContentState(opts, CollapsibleRootContext.get());
	}
	opts;
	root;
	attachment;
	#present = derived(() => {
		if (this.opts.hiddenUntilFound.current) return this.root.opts.open.current;
		return this.opts.forceMount.current || this.root.opts.open.current;
	});
	get present() {
		return this.#present();
	}
	set present($$value) {
		return this.#present($$value);
	}
	#originalStyles;
	#isMountAnimationPrevented = false;
	#width = 0;
	#height = 0;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.#isMountAnimationPrevented = root.opts.open.current;
		this.root.contentId = this.opts.id.current;
		this.attachment = attachRef(this.opts.ref, (v) => this.root.contentNode = v);
		watch.pre(() => this.opts.id.current, (id) => {
			this.root.contentId = id;
		});
		watch.pre([() => this.opts.ref.current, () => this.opts.hiddenUntilFound.current], ([node, hiddenUntilFound]) => {
			if (!node || !hiddenUntilFound) return;
			const handleBeforeMatch = () => {
				if (this.root.opts.open.current) return;
				requestAnimationFrame(() => {
					this.root.opts.open.current = true;
				});
			};
			return on(node, "beforematch", handleBeforeMatch);
		});
		watch([() => this.opts.ref.current, () => this.present], ([node]) => {
			if (!node) return;
			afterTick(() => {
				if (!this.opts.ref.current) return;
				this.#originalStyles = this.#originalStyles || {
					transitionDuration: node.style.transitionDuration,
					animationName: node.style.animationName
				};
				node.style.transitionDuration = "0s";
				node.style.animationName = "none";
				const rect = node.getBoundingClientRect();
				this.#height = rect.height;
				this.#width = rect.width;
				if (!this.#isMountAnimationPrevented) {
					const { animationName, transitionDuration } = this.#originalStyles;
					node.style.transitionDuration = transitionDuration;
					node.style.animationName = animationName;
				}
			});
		});
	}
	get shouldRender() {
		return this.root.contentPresence.shouldRender;
	}
	#snippetProps = derived(() => ({ open: this.root.opts.open.current }));
	get snippetProps() {
		return this.#snippetProps();
	}
	set snippetProps($$value) {
		return this.#snippetProps($$value);
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		style: {
			"--bits-collapsible-content-height": this.#height ? `${this.#height}px` : void 0,
			"--bits-collapsible-content-width": this.#width ? `${this.#width}px` : void 0
		},
		hidden: this.opts.hiddenUntilFound.current && !this.root.opts.open.current ? "until-found" : void 0,
		"data-state": getDataOpenClosed(this.root.opts.open.current),
		...getDataTransitionAttrs(this.root.contentPresence.transitionStatus),
		"data-disabled": boolToEmptyStrOrUndef(this.root.opts.disabled.current),
		[collapsibleAttrs.content]: "",
		...this.opts.hiddenUntilFound.current && !this.shouldRender ? {} : { hidden: this.opts.hiddenUntilFound.current ? !this.shouldRender : this.opts.forceMount.current ? void 0 : !this.shouldRender },
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var CollapsibleTriggerState = class CollapsibleTriggerState {
	static create(opts) {
		return new CollapsibleTriggerState(opts, CollapsibleRootContext.get());
	}
	opts;
	root;
	attachment;
	#isDisabled = derived(() => this.opts.disabled.current || this.root.opts.disabled.current);
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(this.opts.ref);
		this.onclick = this.onclick.bind(this);
		this.onkeydown = this.onkeydown.bind(this);
	}
	onclick(e) {
		if (this.#isDisabled()) return;
		if (e.button !== 0) return e.preventDefault();
		this.root.toggleOpen();
	}
	onkeydown(e) {
		if (this.#isDisabled()) return;
		if (e.key === " " || e.key === "Enter") {
			e.preventDefault();
			this.root.toggleOpen();
		}
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		type: "button",
		disabled: this.#isDisabled(),
		"aria-controls": this.root.contentId,
		"aria-expanded": boolToStr(this.root.opts.open.current),
		"data-state": getDataOpenClosed(this.root.opts.open.current),
		"data-disabled": boolToEmptyStrOrUndef(this.#isDisabled()),
		[collapsibleAttrs.trigger]: "",
		onclick: this.onclick,
		onkeydown: this.onkeydown,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/collapsible/components/collapsible.svelte
function Collapsible$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { children, child, id = createId(uid), ref = null, open = false, disabled = false, onOpenChange = noop, onOpenChangeComplete = noop, $$slots, $$events, ...restProps } = $$props;
		const rootState = CollapsibleRootState.create({
			open: boxWith(() => open, (v) => {
				open = v;
				onOpenChange(v);
			}),
			disabled: boxWith(() => disabled),
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v),
			onOpenChangeComplete: boxWith(() => onOpenChangeComplete)
		});
		const mergedProps = derived(() => mergeProps(restProps, rootState.props));
		if (child) {
			$$renderer.push("<!--[0-->");
			child($$renderer, { props: mergedProps() });
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div${attributes({ ...mergedProps() })}>`);
			children?.($$renderer);
			$$renderer.push(`<!----></div>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, {
			ref,
			open
		});
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/collapsible/components/collapsible-content.svelte
function Collapsible_content$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { child, ref = null, forceMount = false, hiddenUntilFound = false, children, id = createId(uid), $$slots, $$events, ...restProps } = $$props;
		const contentState = CollapsibleContentState.create({
			id: boxWith(() => id),
			forceMount: boxWith(() => forceMount),
			hiddenUntilFound: boxWith(() => hiddenUntilFound),
			ref: boxWith(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps(restProps, contentState.props));
		if (child) {
			$$renderer.push("<!--[0-->");
			child($$renderer, {
				...contentState.snippetProps,
				props: mergedProps()
			});
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div${attributes({ ...mergedProps() })}>`);
			children?.($$renderer);
			$$renderer.push(`<!----></div>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/collapsible/components/collapsible-trigger.svelte
function Collapsible_trigger$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { children, child, ref = null, id = createId(uid), disabled = false, $$slots, $$events, ...restProps } = $$props;
		const triggerState = CollapsibleTriggerState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v),
			disabled: boxWith(() => disabled)
		});
		const mergedProps = derived(() => mergeProps(restProps, triggerState.props));
		if (child) {
			$$renderer.push("<!--[0-->");
			child($$renderer, { props: mergedProps() });
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<button${attributes({ ...mergedProps() })}>`);
			children?.($$renderer);
			$$renderer.push(`<!----></button>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/internal/data-typeahead.svelte.js
var DataTypeahead = class {
	#opts;
	#candidateValues = derived(() => this.#opts.candidateValues());
	#search;
	constructor(opts) {
		this.#opts = opts;
		this.#search = boxAutoReset("", {
			afterMs: 1e3,
			getWindow: this.#opts.getWindow
		});
		this.handleTypeaheadSearch = this.handleTypeaheadSearch.bind(this);
		this.resetTypeahead = this.resetTypeahead.bind(this);
	}
	handleTypeaheadSearch(key) {
		if (!this.#opts.enabled() || !this.#candidateValues().length) return;
		this.#search.current = this.#search.current + key;
		const currentItem = this.#opts.getCurrentItem();
		const currentMatch = this.#candidateValues().find((item) => item === currentItem) ?? "";
		const nextMatch = getNextMatch(this.#candidateValues().map((item) => item ?? ""), this.#search.current, currentMatch);
		const newItem = this.#candidateValues().find((item) => item === nextMatch);
		if (newItem) this.#opts.onMatch(newItem);
		return newItem;
	}
	resetTypeahead() {
		this.#search.current = "";
	}
};
var FIRST_KEYS = [
	ARROW_DOWN,
	PAGE_UP,
	HOME
];
var LAST_KEYS = [
	ARROW_UP,
	PAGE_DOWN,
	"End"
];
var FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
var selectAttrs = createBitsAttrs({
	component: "select",
	parts: [
		"trigger",
		"content",
		"item",
		"viewport",
		"scroll-up-button",
		"scroll-down-button",
		"group",
		"group-label",
		"separator",
		"arrow",
		"input",
		"content-wrapper",
		"item-text",
		"value"
	]
});
var SelectRootContext = new Context("Select.Root | Combobox.Root");
var SelectContentContext = new Context("Select.Content | Combobox.Content");
var SelectBaseRootState = class {
	opts;
	touchedInput = false;
	inputNode = null;
	contentNode = null;
	contentPresence;
	viewportNode = null;
	triggerNode = null;
	valueNode = null;
	valueId = "";
	highlightedNode = null;
	#highlightedValue = derived(() => {
		if (!this.highlightedNode) return null;
		return this.highlightedNode.getAttribute("data-value");
	});
	get highlightedValue() {
		return this.#highlightedValue();
	}
	set highlightedValue($$value) {
		return this.#highlightedValue($$value);
	}
	#highlightedId = derived(() => {
		if (!this.highlightedNode) return void 0;
		return this.highlightedNode.id;
	});
	get highlightedId() {
		return this.#highlightedId();
	}
	set highlightedId($$value) {
		return this.#highlightedId($$value);
	}
	#highlightedLabel = derived(() => {
		if (!this.highlightedNode) return null;
		return this.highlightedNode.getAttribute("data-label");
	});
	get highlightedLabel() {
		return this.#highlightedLabel();
	}
	set highlightedLabel($$value) {
		return this.#highlightedLabel($$value);
	}
	contentIsPositioned = false;
	isUsingKeyboard = false;
	isCombobox = false;
	domContext = new DOMContext(() => null);
	constructor(opts) {
		this.opts = opts;
		this.isCombobox = opts.isCombobox;
		this.contentPresence = new PresenceManager({
			ref: boxWith(() => this.contentNode),
			open: this.opts.open,
			onComplete: () => {
				this.opts.onOpenChangeComplete.current(this.opts.open.current);
			}
		});
	}
	setHighlightedNode(node, initial = false) {
		this.highlightedNode = node;
		if (node && (this.isUsingKeyboard || initial)) this.scrollHighlightedNodeIntoView(node);
	}
	scrollHighlightedNodeIntoView(node) {
		if (!this.viewportNode || !this.contentIsPositioned) return;
		node.scrollIntoView({ block: this.opts.scrollAlignment.current });
	}
	getCandidateNodes() {
		const node = this.contentNode;
		if (!node) return [];
		return Array.from(node.querySelectorAll(`[${this.getBitsAttr("item")}]:not([data-disabled])`));
	}
	setHighlightedToFirstCandidate(initial = false) {
		this.setHighlightedNode(null);
		let nodes = this.getCandidateNodes();
		if (!nodes.length) return;
		if (this.viewportNode) {
			const viewportRect = this.viewportNode.getBoundingClientRect();
			nodes = nodes.filter((node) => {
				if (!this.viewportNode) return false;
				const nodeRect = node.getBoundingClientRect();
				return nodeRect.right <= viewportRect.right && nodeRect.left >= viewportRect.left && nodeRect.bottom <= viewportRect.bottom && nodeRect.top >= viewportRect.top;
			});
		}
		this.setHighlightedNode(nodes[0], initial);
	}
	getNodeByValue(value) {
		return this.getCandidateNodes().find((node) => node.dataset.value === value) ?? null;
	}
	/**
	* Resolves the display label for a value: `items` entry when present, otherwise the
	* mounted item's `data-label` or its text content.
	*/
	getLabelForValue(value) {
		if (value === "") return "";
		const fromItems = this.opts.items.current.find((item) => item.value === value)?.label;
		if (fromItems !== void 0) return fromItems;
		const node = this.getNodeByValue(value);
		if (node) {
			const dataLabel = node.getAttribute("data-label");
			if (dataLabel !== null && dataLabel !== "") return dataLabel;
			return node.textContent?.trim() ?? value;
		}
		return value;
	}
	setOpen(open) {
		this.opts.open.current = open;
	}
	toggleOpen() {
		this.opts.open.current = !this.opts.open.current;
	}
	handleOpen() {
		this.setOpen(true);
	}
	handleClose() {
		this.setHighlightedNode(null);
		this.setOpen(false);
	}
	toggleMenu() {
		this.toggleOpen();
	}
	getBitsAttr = (part) => {
		return selectAttrs.getAttr(part, this.isCombobox ? "combobox" : void 0);
	};
};
var SelectSingleRootState = class extends SelectBaseRootState {
	opts;
	isMulti = false;
	#hasValue = derived(() => this.opts.value.current !== "");
	get hasValue() {
		return this.#hasValue();
	}
	set hasValue($$value) {
		return this.#hasValue($$value);
	}
	#currentLabel = derived(() => {
		if (!this.opts.items.current.length) return "";
		return this.opts.items.current.find((item) => item.value === this.opts.value.current)?.label ?? "";
	});
	get currentLabel() {
		return this.#currentLabel();
	}
	set currentLabel($$value) {
		return this.#currentLabel($$value);
	}
	#candidateLabels = derived(() => {
		if (!this.opts.items.current.length) return [];
		return this.opts.items.current.filter((item) => !item.disabled).map((item) => item.label);
	});
	get candidateLabels() {
		return this.#candidateLabels();
	}
	set candidateLabels($$value) {
		return this.#candidateLabels($$value);
	}
	#dataTypeaheadEnabled = derived(() => {
		if (this.isMulti) return false;
		if (this.opts.items.current.length === 0) return false;
		return true;
	});
	get dataTypeaheadEnabled() {
		return this.#dataTypeaheadEnabled();
	}
	set dataTypeaheadEnabled($$value) {
		return this.#dataTypeaheadEnabled($$value);
	}
	constructor(opts) {
		super(opts);
		this.opts = opts;
		watch(() => this.opts.open.current, () => {
			if (!this.opts.open.current) return;
			this.setInitialHighlightedNode();
		});
	}
	includesItem(itemValue) {
		return this.opts.value.current === itemValue;
	}
	toggleItem(itemValue, itemLabel = itemValue) {
		const newValue = this.includesItem(itemValue) ? "" : itemValue;
		this.opts.value.current = newValue;
		if (newValue !== "") this.opts.inputValue.current = itemLabel;
	}
	setInitialHighlightedNode() {
		afterTick(() => {
			if (this.highlightedNode && this.domContext.getDocument().contains(this.highlightedNode)) return;
			if (this.opts.value.current !== "") {
				const node = this.getNodeByValue(this.opts.value.current);
				if (node) {
					this.setHighlightedNode(node, true);
					return;
				}
			}
			this.setHighlightedToFirstCandidate(true);
		});
	}
};
var SelectMultipleRootState = class extends SelectBaseRootState {
	opts;
	isMulti = true;
	#hasValue = derived(() => this.opts.value.current.length > 0);
	get hasValue() {
		return this.#hasValue();
	}
	set hasValue($$value) {
		return this.#hasValue($$value);
	}
	constructor(opts) {
		super(opts);
		this.opts = opts;
		watch(() => this.opts.open.current, () => {
			if (!this.opts.open.current) return;
			this.setInitialHighlightedNode();
		});
	}
	includesItem(itemValue) {
		return this.opts.value.current.includes(itemValue);
	}
	toggleItem(itemValue, itemLabel = itemValue) {
		if (this.includesItem(itemValue)) this.opts.value.current = this.opts.value.current.filter((v) => v !== itemValue);
		else this.opts.value.current = [...this.opts.value.current, itemValue];
		this.opts.inputValue.current = itemLabel;
	}
	setInitialHighlightedNode() {
		afterTick(() => {
			if (!this.domContext) return;
			if (this.highlightedNode && this.domContext.getDocument().contains(this.highlightedNode)) return;
			if (this.opts.value.current.length && this.opts.value.current[0] !== "") {
				const node = this.getNodeByValue(this.opts.value.current[0]);
				if (node) {
					this.setHighlightedNode(node, true);
					return;
				}
			}
			this.setHighlightedToFirstCandidate(true);
		});
	}
};
var SelectRootState = class {
	static create(props) {
		const { type, ...rest } = props;
		const rootState = type === "single" ? new SelectSingleRootState(rest) : new SelectMultipleRootState(rest);
		return SelectRootContext.set(rootState);
	}
};
var SelectTriggerState = class SelectTriggerState {
	static create(opts) {
		return new SelectTriggerState(opts, SelectRootContext.get());
	}
	opts;
	root;
	attachment;
	#domTypeahead;
	#dataTypeahead;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(opts.ref, (v) => this.root.triggerNode = v);
		this.root.domContext = new DOMContext(opts.ref);
		this.#domTypeahead = new DOMTypeahead({
			getCurrentItem: () => this.root.highlightedNode,
			onMatch: (node) => {
				this.root.setHighlightedNode(node);
			},
			getActiveElement: () => this.root.domContext.getActiveElement(),
			getWindow: () => this.root.domContext.getWindow()
		});
		this.#dataTypeahead = new DataTypeahead({
			getCurrentItem: () => {
				if (this.root.isMulti) return "";
				return this.root.currentLabel;
			},
			onMatch: (label) => {
				if (this.root.isMulti) return;
				if (!this.root.opts.items.current) return;
				const matchedItem = this.root.opts.items.current.find((item) => item.label === label);
				if (!matchedItem) return;
				this.root.opts.value.current = matchedItem.value;
			},
			enabled: () => !this.root.isMulti && this.root.dataTypeaheadEnabled,
			candidateValues: () => this.root.isMulti ? [] : this.root.candidateLabels,
			getWindow: () => this.root.domContext.getWindow()
		});
		this.onkeydown = this.onkeydown.bind(this);
		this.onpointerdown = this.onpointerdown.bind(this);
		this.onpointerup = this.onpointerup.bind(this);
		this.onclick = this.onclick.bind(this);
	}
	#handleOpen() {
		this.root.opts.open.current = true;
		this.#dataTypeahead.resetTypeahead();
		this.#domTypeahead.resetTypeahead();
	}
	#handlePointerOpen(_) {
		this.#handleOpen();
	}
	/**
	* Logic used to handle keyboard selection/deselection.
	*
	* If it returns true, it means the item was selected and whatever is calling
	* this function should return early
	*
	*/
	#handleKeyboardSelection() {
		const isCurrentSelectedValue = this.root.highlightedValue === this.root.opts.value.current;
		if (!this.root.opts.allowDeselect.current && isCurrentSelectedValue && !this.root.isMulti) {
			this.root.handleClose();
			return true;
		}
		if (this.root.highlightedValue !== null) this.root.toggleItem(this.root.highlightedValue, this.root.highlightedLabel ?? void 0);
		if (!this.root.isMulti && !isCurrentSelectedValue) {
			this.root.handleClose();
			return true;
		}
		return false;
	}
	onkeydown(e) {
		this.root.isUsingKeyboard = true;
		if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
		if (!this.root.opts.open.current) {
			if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				this.root.handleOpen();
			} else if (!this.root.isMulti && this.root.dataTypeaheadEnabled) {
				this.#dataTypeahead.handleTypeaheadSearch(e.key);
				return;
			}
			if (this.root.hasValue) return;
			const candidateNodes = this.root.getCandidateNodes();
			if (!candidateNodes.length) return;
			if (e.key === "ArrowDown") {
				const firstCandidate = candidateNodes[0];
				this.root.setHighlightedNode(firstCandidate);
			} else if (e.key === "ArrowUp") {
				const lastCandidate = candidateNodes[candidateNodes.length - 1];
				this.root.setHighlightedNode(lastCandidate);
			}
			return;
		}
		if (e.key === "Tab") {
			this.root.handleClose();
			return;
		}
		if ((e.key === "Enter" || e.key === " " && this.#domTypeahead.search === "") && !e.isComposing) {
			e.preventDefault();
			if (this.#handleKeyboardSelection()) return;
		}
		if (e.key === "ArrowUp" && e.altKey) this.root.handleClose();
		if (FIRST_LAST_KEYS.includes(e.key)) {
			e.preventDefault();
			const candidateNodes = this.root.getCandidateNodes();
			const currHighlightedNode = this.root.highlightedNode;
			const currIndex = currHighlightedNode ? candidateNodes.indexOf(currHighlightedNode) : -1;
			const loop = this.root.opts.loop.current;
			let nextItem;
			if (e.key === "ArrowDown") nextItem = next(candidateNodes, currIndex, loop);
			else if (e.key === "ArrowUp") nextItem = prev(candidateNodes, currIndex, loop);
			else if (e.key === "PageDown") nextItem = forward(candidateNodes, currIndex, 10, loop);
			else if (e.key === "PageUp") nextItem = backward(candidateNodes, currIndex, 10, loop);
			else if (e.key === "Home") nextItem = candidateNodes[0];
			else if (e.key === "End") nextItem = candidateNodes[candidateNodes.length - 1];
			if (!nextItem) return;
			this.root.setHighlightedNode(nextItem);
			return;
		}
		const isModifierKey = e.ctrlKey || e.altKey || e.metaKey;
		const isCharacterKey = e.key.length === 1;
		const isSpaceKey = e.key === " ";
		const candidateNodes = this.root.getCandidateNodes();
		if (e.key === "Tab") return;
		if (!isModifierKey && (isCharacterKey || isSpaceKey)) {
			if (!this.#domTypeahead.handleTypeaheadSearch(e.key, candidateNodes) && isSpaceKey) {
				e.preventDefault();
				this.#handleKeyboardSelection();
			}
			return;
		}
		if (!this.root.highlightedNode) this.root.setHighlightedToFirstCandidate();
	}
	onclick(e) {
		e.currentTarget.focus();
	}
	onpointerdown(e) {
		if (this.root.opts.disabled.current) return;
		if (e.pointerType === "touch") return e.preventDefault();
		const target = e.target;
		if (target?.hasPointerCapture(e.pointerId)) target?.releasePointerCapture(e.pointerId);
		if (e.button === 0 && e.ctrlKey === false) if (this.root.opts.open.current === false) this.#handlePointerOpen(e);
		else this.root.handleClose();
	}
	onpointerup(e) {
		if (this.root.opts.disabled.current) return;
		e.preventDefault();
		if (e.pointerType === "touch") if (this.root.opts.open.current === false) this.#handlePointerOpen(e);
		else this.root.handleClose();
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		disabled: this.root.opts.disabled.current ? true : void 0,
		"aria-haspopup": "listbox",
		"aria-expanded": boolToStr(this.root.opts.open.current),
		"aria-activedescendant": this.root.highlightedId,
		"data-state": getDataOpenClosed(this.root.opts.open.current),
		"data-disabled": boolToEmptyStrOrUndef(this.root.opts.disabled.current),
		"data-placeholder": this.root.hasValue ? void 0 : "",
		[this.root.getBitsAttr("trigger")]: "",
		onpointerdown: this.onpointerdown,
		onkeydown: this.onkeydown,
		onclick: this.onclick,
		onpointerup: this.onpointerup,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectContentState = class SelectContentState {
	static create(opts) {
		return SelectContentContext.set(new SelectContentState(opts, SelectRootContext.get()));
	}
	opts;
	root;
	attachment;
	isPositioned = false;
	domContext;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(opts.ref, (v) => this.root.contentNode = v);
		this.domContext = new DOMContext(this.opts.ref);
		if (this.root.domContext === null) this.root.domContext = this.domContext;
		watch(() => this.root.opts.open.current, () => {
			if (this.root.opts.open.current) return;
			this.root.contentIsPositioned = false;
			this.isPositioned = false;
		});
		watch([() => this.isPositioned, () => this.root.highlightedNode], () => {
			if (!this.isPositioned || !this.root.highlightedNode) return;
			this.root.scrollHighlightedNodeIntoView(this.root.highlightedNode);
		});
		this.onpointermove = this.onpointermove.bind(this);
	}
	onpointermove(_) {
		this.root.isUsingKeyboard = false;
	}
	#styles = derived(() => {
		return getFloatingContentCSSVars(this.root.isCombobox ? "combobox" : "select");
	});
	onInteractOutside = (e) => {
		if (e.target === this.root.triggerNode || e.target === this.root.inputNode) {
			e.preventDefault();
			return;
		}
		this.opts.onInteractOutside.current(e);
		if (e.defaultPrevented) return;
		this.root.handleClose();
	};
	onEscapeKeydown = (e) => {
		this.opts.onEscapeKeydown.current(e);
		if (e.defaultPrevented) return;
		this.root.handleClose();
	};
	onOpenAutoFocus = (e) => {
		e.preventDefault();
	};
	onCloseAutoFocus = (e) => {
		e.preventDefault();
	};
	get shouldRender() {
		return this.root.contentPresence.shouldRender;
	}
	#snippetProps = derived(() => ({ open: this.root.opts.open.current }));
	get snippetProps() {
		return this.#snippetProps();
	}
	set snippetProps($$value) {
		return this.#snippetProps($$value);
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		role: "listbox",
		"aria-multiselectable": this.root.isMulti ? "true" : void 0,
		"data-state": getDataOpenClosed(this.root.opts.open.current),
		...getDataTransitionAttrs(this.root.contentPresence.transitionStatus),
		[this.root.getBitsAttr("content")]: "",
		style: {
			display: "flex",
			flexDirection: "column",
			outline: "none",
			boxSizing: "border-box",
			pointerEvents: "auto",
			...this.#styles()
		},
		onpointermove: this.onpointermove,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
	popperProps = {
		onInteractOutside: this.onInteractOutside,
		onEscapeKeydown: this.onEscapeKeydown,
		onOpenAutoFocus: this.onOpenAutoFocus,
		onCloseAutoFocus: this.onCloseAutoFocus,
		trapFocus: false,
		loop: false,
		onPlaced: () => {
			if (this.root.opts.open.current) {
				this.root.contentIsPositioned = true;
				this.isPositioned = true;
			}
		}
	};
};
var SelectItemState = class SelectItemState {
	static create(opts) {
		return new SelectItemState(opts, SelectRootContext.get());
	}
	opts;
	root;
	attachment;
	#isSelected = derived(() => this.root.includesItem(this.opts.value.current));
	get isSelected() {
		return this.#isSelected();
	}
	set isSelected($$value) {
		return this.#isSelected($$value);
	}
	#isHighlighted = derived(() => this.root.highlightedValue === this.opts.value.current);
	get isHighlighted() {
		return this.#isHighlighted();
	}
	set isHighlighted($$value) {
		return this.#isHighlighted($$value);
	}
	prevHighlighted = new Previous(() => this.isHighlighted);
	mounted = false;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(opts.ref);
		watch([() => this.isHighlighted, () => this.prevHighlighted.current], () => {
			if (this.isHighlighted) this.opts.onHighlight.current();
			else if (this.prevHighlighted.current) this.opts.onUnhighlight.current();
		});
		watch(() => this.mounted, () => {
			if (!this.mounted) return;
			this.root.setInitialHighlightedNode();
		});
		this.onpointerdown = this.onpointerdown.bind(this);
		this.onpointerup = this.onpointerup.bind(this);
		this.onpointermove = this.onpointermove.bind(this);
	}
	handleSelect() {
		if (this.opts.disabled.current) return;
		const isCurrentSelectedValue = this.opts.value.current === this.root.opts.value.current;
		if (!this.root.opts.allowDeselect.current && isCurrentSelectedValue && !this.root.isMulti) {
			this.root.handleClose();
			return;
		}
		this.root.toggleItem(this.opts.value.current, this.opts.label.current);
		if (!this.root.isMulti && !isCurrentSelectedValue) this.root.handleClose();
	}
	#snippetProps = derived(() => ({
		selected: this.isSelected,
		highlighted: this.isHighlighted
	}));
	get snippetProps() {
		return this.#snippetProps();
	}
	set snippetProps($$value) {
		return this.#snippetProps($$value);
	}
	onpointerdown(e) {
		e.preventDefault();
	}
	/**
	* Using `pointerup` instead of `click` allows power users to pointerdown
	* the trigger, then release pointerup on an item to select it vs having to do
	* multiple clicks.
	*/
	onpointerup(e) {
		if (e.defaultPrevented || !this.opts.ref.current) return;
		/**
		* For one reason or another, when it's a touch pointer and _not_ on IOS,
		* we need to listen for the immediate click event to handle the selection,
		* otherwise a click event will fire on the element _behind_ the item.
		*/
		if (e.pointerType === "touch" && !isIOS) {
			on(this.opts.ref.current, "click", () => {
				this.handleSelect();
				this.root.setHighlightedNode(this.opts.ref.current);
			}, { once: true });
			return;
		}
		e.preventDefault();
		this.handleSelect();
		if (e.pointerType === "touch") this.root.setHighlightedNode(this.opts.ref.current);
	}
	onpointermove(e) {
		/**
		* We don't want to highlight items on touch devices when scrolling,
		* as this is confusing behavior, so we return here and instead handle
		* the highlighting on the `pointerup` (or following `click`) event for
		* touch devices only.
		*/
		if (e.pointerType === "touch") return;
		if (this.root.highlightedNode !== this.opts.ref.current) this.root.setHighlightedNode(this.opts.ref.current);
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		role: "option",
		"aria-selected": this.root.includesItem(this.opts.value.current) ? "true" : void 0,
		"data-value": this.opts.value.current,
		"data-disabled": boolToEmptyStrOrUndef(this.opts.disabled.current),
		"data-highlighted": this.root.highlightedValue === this.opts.value.current && !this.opts.disabled.current ? "" : void 0,
		"data-selected": this.root.includesItem(this.opts.value.current) ? "" : void 0,
		"data-label": this.opts.label.current,
		[this.root.getBitsAttr("item")]: "",
		onpointermove: this.onpointermove,
		onpointerdown: this.onpointerdown,
		onpointerup: this.onpointerup,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectHiddenInputState = class SelectHiddenInputState {
	static create(opts) {
		return new SelectHiddenInputState(opts, SelectRootContext.get());
	}
	opts;
	root;
	#shouldRender = derived(() => this.root.opts.name.current !== "");
	get shouldRender() {
		return this.#shouldRender();
	}
	set shouldRender($$value) {
		return this.#shouldRender($$value);
	}
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.onfocus = this.onfocus.bind(this);
	}
	onfocus(e) {
		e.preventDefault();
		if (!this.root.isCombobox) this.root.triggerNode?.focus();
		else this.root.inputNode?.focus();
	}
	#props = derived(() => ({
		disabled: boolToTrueOrUndef(this.root.opts.disabled.current),
		required: boolToTrueOrUndef(this.root.opts.required.current),
		name: this.root.opts.name.current,
		value: this.opts.value.current,
		onfocus: this.onfocus
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectViewportState = class SelectViewportState {
	static create(opts) {
		return new SelectViewportState(opts, SelectContentContext.get());
	}
	opts;
	content;
	root;
	attachment;
	prevScrollTop = 0;
	constructor(opts, content) {
		this.opts = opts;
		this.content = content;
		this.root = content.root;
		this.attachment = attachRef(opts.ref, (v) => {
			this.root.viewportNode = v;
		});
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		role: "presentation",
		[this.root.getBitsAttr("viewport")]: "",
		style: {
			position: "relative",
			flex: 1,
			overflow: "auto"
		},
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectScrollButtonImplState = class {
	opts;
	content;
	root;
	attachment;
	autoScrollTimer = null;
	userScrollTimer = -1;
	isUserScrolling = false;
	onAutoScroll = noop;
	mounted = false;
	constructor(opts, content) {
		this.opts = opts;
		this.content = content;
		this.root = content.root;
		this.attachment = attachRef(opts.ref);
		watch([() => this.mounted], () => {
			if (!this.mounted) {
				this.isUserScrolling = false;
				return;
			}
			if (this.isUserScrolling) return;
		});
		this.onpointerdown = this.onpointerdown.bind(this);
		this.onpointermove = this.onpointermove.bind(this);
		this.onpointerleave = this.onpointerleave.bind(this);
	}
	handleUserScroll() {
		this.content.domContext.clearTimeout(this.userScrollTimer);
		this.isUserScrolling = true;
		this.userScrollTimer = this.content.domContext.setTimeout(() => {
			this.isUserScrolling = false;
		}, 200);
	}
	clearAutoScrollInterval() {
		if (this.autoScrollTimer === null) return;
		this.content.domContext.clearTimeout(this.autoScrollTimer);
		this.autoScrollTimer = null;
	}
	onpointerdown(_) {
		if (this.autoScrollTimer !== null) return;
		const autoScroll = (tick) => {
			this.onAutoScroll();
			this.autoScrollTimer = this.content.domContext.setTimeout(() => autoScroll(tick + 1), this.opts.delay.current(tick));
		};
		this.autoScrollTimer = this.content.domContext.setTimeout(() => autoScroll(1), this.opts.delay.current(0));
	}
	onpointermove(e) {
		this.onpointerdown(e);
	}
	onpointerleave(_) {
		this.clearAutoScrollInterval();
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		"aria-hidden": boolToStrTrueOrUndef(true),
		style: { flexShrink: 0 },
		onpointerdown: this.onpointerdown,
		onpointermove: this.onpointermove,
		onpointerleave: this.onpointerleave,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectScrollDownButtonState = class SelectScrollDownButtonState {
	static create(opts) {
		return new SelectScrollDownButtonState(new SelectScrollButtonImplState(opts, SelectContentContext.get()));
	}
	scrollButtonState;
	content;
	root;
	canScrollDown = false;
	scrollIntoViewTimer = null;
	constructor(scrollButtonState) {
		this.scrollButtonState = scrollButtonState;
		this.content = scrollButtonState.content;
		this.root = scrollButtonState.root;
		this.scrollButtonState.onAutoScroll = this.handleAutoScroll;
		watch([() => this.root.viewportNode, () => this.content.isPositioned], () => {
			if (!this.root.viewportNode || !this.content.isPositioned) return;
			this.handleScroll(true);
			return on(this.root.viewportNode, "scroll", () => this.handleScroll());
		});
		/**
		* If the input value changes, this means that the filtered items may have changed,
		* so we need to re-evaluate the scroll-ability of the list.
		*/
		watch([
			() => this.root.opts.inputValue.current,
			() => this.root.viewportNode,
			() => this.content.isPositioned
		], () => {
			if (!this.root.viewportNode || !this.content.isPositioned) return;
			this.handleScroll(true);
		});
		watch(() => this.scrollButtonState.mounted, () => {
			if (!this.scrollButtonState.mounted) return;
			if (this.scrollIntoViewTimer) clearTimeout(this.scrollIntoViewTimer);
			this.scrollIntoViewTimer = afterSleep(5, () => {
				const activeItem = this.root.highlightedNode;
				if (!activeItem) return;
				this.root.scrollHighlightedNodeIntoView(activeItem);
			});
		});
	}
	/**
	* @param manual - if true, it means the function was invoked manually outside of an event
	* listener, so we don't call `handleUserScroll` to prevent the auto scroll from kicking in.
	*/
	handleScroll = (manual = false) => {
		if (!manual) this.scrollButtonState.handleUserScroll();
		if (!this.root.viewportNode) return;
		const maxScroll = this.root.viewportNode.scrollHeight - this.root.viewportNode.clientHeight;
		const paddingTop = Number.parseInt(getComputedStyle(this.root.viewportNode).paddingTop, 10);
		this.canScrollDown = Math.ceil(this.root.viewportNode.scrollTop) < maxScroll - paddingTop;
	};
	handleAutoScroll = () => {
		const viewport = this.root.viewportNode;
		const selectedItem = this.root.highlightedNode;
		if (!viewport || !selectedItem) return;
		viewport.scrollTop = viewport.scrollTop + selectedItem.offsetHeight;
	};
	#props = derived(() => ({
		...this.scrollButtonState.props,
		[this.root.getBitsAttr("scroll-down-button")]: ""
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SelectScrollUpButtonState = class SelectScrollUpButtonState {
	static create(opts) {
		return new SelectScrollUpButtonState(new SelectScrollButtonImplState(opts, SelectContentContext.get()));
	}
	scrollButtonState;
	content;
	root;
	canScrollUp = false;
	constructor(scrollButtonState) {
		this.scrollButtonState = scrollButtonState;
		this.content = scrollButtonState.content;
		this.root = scrollButtonState.root;
		this.scrollButtonState.onAutoScroll = this.handleAutoScroll;
		watch([() => this.root.viewportNode, () => this.content.isPositioned], () => {
			if (!this.root.viewportNode || !this.content.isPositioned) return;
			this.handleScroll(true);
			return on(this.root.viewportNode, "scroll", () => this.handleScroll());
		});
	}
	/**
	* @param manual - if true, it means the function was invoked manually outside of an event
	* listener, so we don't call `handleUserScroll` to prevent the auto scroll from kicking in.
	*/
	handleScroll = (manual = false) => {
		if (!manual) this.scrollButtonState.handleUserScroll();
		if (!this.root.viewportNode) return;
		const paddingTop = Number.parseInt(getComputedStyle(this.root.viewportNode).paddingTop, 10);
		this.canScrollUp = this.root.viewportNode.scrollTop - paddingTop > .1;
	};
	handleAutoScroll = () => {
		if (!this.root.viewportNode || !this.root.highlightedNode) return;
		this.root.viewportNode.scrollTop = this.root.viewportNode.scrollTop - this.root.highlightedNode.offsetHeight;
	};
	#props = derived(() => ({
		...this.scrollButtonState.props,
		[this.root.getBitsAttr("scroll-up-button")]: ""
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/select/components/select-hidden-input.svelte
function Select_hidden_input($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { value = void 0, autocomplete } = $$props;
		const hiddenInputState = SelectHiddenInputState.create({ value: boxWith(() => value) });
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (hiddenInputState.shouldRender) {
				$$renderer.push("<!--[0-->");
				Hidden_input($$renderer, spread_props([hiddenInputState.props, {
					autocomplete,
					get value() {
						return value;
					},
					set value($$value) {
						value = $$value;
						$$settled = false;
					}
				}]));
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { value });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/utilities/arrow/arrow.svelte
function Arrow($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { id = useId(), children, child, width = 10, height = 5, $$slots, $$events, ...restProps } = $$props;
		const mergedProps = derived(() => mergeProps(restProps, { id }));
		if (child) {
			$$renderer.push("<!--[0-->");
			child($$renderer, { props: mergedProps() });
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<span${attributes({ ...mergedProps() })}>`);
			if (children) {
				$$renderer.push("<!--[0-->");
				children?.($$renderer);
				$$renderer.push(`<!---->`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<svg${attr("width", width)}${attr("height", height)} viewBox="0 0 30 10" preserveAspectRatio="none" data-arrow=""><polygon points="0,0 30,0 15,10" fill="currentColor"></polygon></svg>`);
			}
			$$renderer.push(`<!--]--></span>`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/utilities/floating-layer/components/floating-layer-arrow.svelte
function Floating_layer_arrow($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { id = useId(), ref = null, $$slots, $$events, ...restProps } = $$props;
		const arrowState = FloatingArrowState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v)
		});
		Arrow($$renderer, spread_props([derived(() => mergeProps(restProps, arrowState.props))()]));
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/select/components/select-content.svelte
function Select_content$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, forceMount = false, side = "bottom", onInteractOutside = noop, onEscapeKeydown = noop, children, child, preventScroll = false, style, $$slots, $$events, ...restProps } = $$props;
		const contentState = SelectContentState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v),
			onInteractOutside: boxWith(() => onInteractOutside),
			onEscapeKeydown: boxWith(() => onEscapeKeydown)
		});
		const mergedProps = derived(() => mergeProps(restProps, contentState.props));
		if (forceMount) {
			$$renderer.push("<!--[0-->");
			{
				function popper($$renderer, { props, wrapperProps }) {
					const finalProps = mergeProps(props, { style: contentState.props.style }, { style });
					if (child) {
						$$renderer.push("<!--[0-->");
						child($$renderer, {
							props: finalProps,
							wrapperProps,
							...contentState.snippetProps
						});
						$$renderer.push(`<!---->`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<div${attributes({ ...wrapperProps })}><div${attributes({ ...finalProps })}>`);
						children?.($$renderer);
						$$renderer.push(`<!----></div></div>`);
					}
					$$renderer.push(`<!--]-->`);
				}
				Popper_layer_force_mount($$renderer, spread_props([
					mergedProps(),
					contentState.popperProps,
					{
						ref: contentState.opts.ref,
						side,
						enabled: contentState.root.opts.open.current,
						id,
						preventScroll,
						forceMount: true,
						shouldRender: contentState.shouldRender,
						popper,
						$$slots: { popper: true }
					}
				]));
			}
		} else if (!forceMount) {
			$$renderer.push("<!--[1-->");
			{
				function popper($$renderer, { props, wrapperProps }) {
					const finalProps = mergeProps(props, { style: contentState.props.style }, { style });
					if (child) {
						$$renderer.push("<!--[0-->");
						child($$renderer, {
							props: finalProps,
							wrapperProps,
							...contentState.snippetProps
						});
						$$renderer.push(`<!---->`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<div${attributes({ ...wrapperProps })}><div${attributes({ ...finalProps })}>`);
						children?.($$renderer);
						$$renderer.push(`<!----></div></div>`);
					}
					$$renderer.push(`<!--]-->`);
				}
				Popper_layer($$renderer, spread_props([
					mergedProps(),
					contentState.popperProps,
					{
						ref: contentState.opts.ref,
						side,
						open: contentState.root.opts.open.current,
						id,
						preventScroll,
						forceMount: false,
						shouldRender: contentState.shouldRender,
						popper,
						$$slots: { popper: true }
					}
				]));
			}
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/utilities/mounted.svelte
function Mounted($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { mounted = false, onMountedChange = noop } = $$props;
		bind_props($$props, { mounted });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/select/components/select-item.svelte
function Select_item$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, value, label = value, disabled = false, children, child, onHighlight = noop, onUnhighlight = noop, $$slots, $$events, ...restProps } = $$props;
		const itemState = SelectItemState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v),
			value: boxWith(() => value),
			disabled: boxWith(() => disabled),
			label: boxWith(() => label),
			onHighlight: boxWith(() => onHighlight),
			onUnhighlight: boxWith(() => onUnhighlight)
		});
		const mergedProps = derived(() => mergeProps(restProps, itemState.props));
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (child) {
				$$renderer.push("<!--[0-->");
				child($$renderer, {
					props: mergedProps(),
					...itemState.snippetProps
				});
				$$renderer.push(`<!---->`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div${attributes({ ...mergedProps() })}>`);
				children?.($$renderer, itemState.snippetProps);
				$$renderer.push(`<!----></div>`);
			}
			$$renderer.push(`<!--]--> `);
			Mounted($$renderer, {
				get mounted() {
					return itemState.mounted;
				},
				set mounted($$value) {
					itemState.mounted = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!---->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/select/components/select-viewport.svelte
function Select_viewport($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, children, child, $$slots, $$events, ...restProps } = $$props;
		const viewportState = SelectViewportState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps(restProps, viewportState.props));
		if (child) {
			$$renderer.push("<!--[0-->");
			child($$renderer, { props: mergedProps() });
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div${attributes({ ...mergedProps() })}>`);
			children?.($$renderer);
			$$renderer.push(`<!----></div>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/select/components/select-scroll-down-button.svelte
function Select_scroll_down_button$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, delay = () => 50, child, children, $$slots, $$events, ...restProps } = $$props;
		const scrollButtonState = SelectScrollDownButtonState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v),
			delay: boxWith(() => delay)
		});
		const mergedProps = derived(() => mergeProps(restProps, scrollButtonState.props));
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (scrollButtonState.canScrollDown) {
				$$renderer.push("<!--[0-->");
				Mounted($$renderer, {
					get mounted() {
						return scrollButtonState.scrollButtonState.mounted;
					},
					set mounted($$value) {
						scrollButtonState.scrollButtonState.mounted = $$value;
						$$settled = false;
					}
				});
				$$renderer.push(`<!----> `);
				if (child) {
					$$renderer.push("<!--[0-->");
					child($$renderer, { props: restProps });
					$$renderer.push(`<!---->`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<div${attributes({ ...mergedProps() })}>`);
					children?.($$renderer);
					$$renderer.push(`<!----></div>`);
				}
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/select/components/select-scroll-up-button.svelte
function Select_scroll_up_button$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, delay = () => 50, child, children, $$slots, $$events, ...restProps } = $$props;
		const scrollButtonState = SelectScrollUpButtonState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v),
			delay: boxWith(() => delay)
		});
		const mergedProps = derived(() => mergeProps(restProps, scrollButtonState.props));
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (scrollButtonState.canScrollUp) {
				$$renderer.push("<!--[0-->");
				Mounted($$renderer, {
					get mounted() {
						return scrollButtonState.scrollButtonState.mounted;
					},
					set mounted($$value) {
						scrollButtonState.scrollButtonState.mounted = $$value;
						$$settled = false;
					}
				});
				$$renderer.push(`<!----> `);
				if (child) {
					$$renderer.push("<!--[0-->");
					child($$renderer, { props: restProps });
					$$renderer.push(`<!---->`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<div${attributes({ ...mergedProps() })}>`);
					children?.($$renderer);
					$$renderer.push(`<!----></div>`);
				}
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/select/components/select.svelte
function Select$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { value = void 0, onValueChange = noop, name = "", disabled = false, type, open = false, onOpenChange = noop, onOpenChangeComplete = noop, loop = false, scrollAlignment = "nearest", required = false, items = [], allowDeselect = false, autocomplete, children } = $$props;
		function handleDefaultValue() {
			if (value !== void 0) return;
			value = type === "single" ? "" : [];
		}
		handleDefaultValue();
		watch.pre(() => value, () => {
			handleDefaultValue();
		});
		let inputValue = "";
		const rootState = SelectRootState.create({
			type,
			value: boxWith(() => value, (v) => {
				value = v;
				onValueChange(v);
			}),
			disabled: boxWith(() => disabled),
			required: boxWith(() => required),
			open: boxWith(() => open, (v) => {
				open = v;
				onOpenChange(v);
			}),
			loop: boxWith(() => loop),
			scrollAlignment: boxWith(() => scrollAlignment),
			name: boxWith(() => name),
			isCombobox: false,
			items: boxWith(() => items),
			allowDeselect: boxWith(() => allowDeselect),
			inputValue: boxWith(() => inputValue, (v) => inputValue = v),
			onOpenChangeComplete: boxWith(() => onOpenChangeComplete)
		});
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Floating_layer($$renderer, {
				children: ($$renderer) => {
					children?.($$renderer);
					$$renderer.push(`<!---->`);
				}});
			$$renderer.push(`<!----> `);
			if (Array.isArray(rootState.opts.value.current)) {
				$$renderer.push("<!--[0-->");
				if (rootState.opts.value.current.length === 0) {
					$$renderer.push("<!--[0-->");
					Select_hidden_input($$renderer, { autocomplete });
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--[-->`);
					const each_array = ensure_array_like(rootState.opts.value.current);
					for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
						let item = each_array[$$index];
						Select_hidden_input($$renderer, {
							value: item,
							autocomplete
						});
					}
					$$renderer.push(`<!--]-->`);
				}
				$$renderer.push(`<!--]-->`);
			} else {
				$$renderer.push("<!--[-1-->");
				Select_hidden_input($$renderer, {
					autocomplete,
					get value() {
						return rootState.opts.value.current;
					},
					set value($$value) {
						rootState.opts.value.current = $$value;
						$$settled = false;
					}
				});
			}
			$$renderer.push(`<!--]-->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, {
			value,
			open
		});
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/select/components/select-trigger.svelte
function Select_trigger$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { id = createId(uid), ref = null, child, children, type = "button", $$slots, $$events, ...restProps } = $$props;
		const triggerState = SelectTriggerState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps(restProps, triggerState.props, { type }));
		if (Floating_layer_anchor) {
			$$renderer.push("<!--[-->");
			Floating_layer_anchor($$renderer, {
				id,
				ref: triggerState.opts.ref,
				children: ($$renderer) => {
					if (child) {
						$$renderer.push("<!--[0-->");
						child($$renderer, { props: mergedProps() });
						$$renderer.push(`<!---->`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<button${attributes({ ...mergedProps() })}>`);
						children?.($$renderer);
						$$renderer.push(`<!----></button>`);
					}
					$$renderer.push(`<!--]-->`);
				}});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/switch/switch.svelte.js
var switchAttrs = createBitsAttrs({
	component: "switch",
	parts: ["root", "thumb"]
});
var SwitchRootContext = new Context("Switch.Root");
var SwitchRootState = class SwitchRootState {
	static create(opts) {
		return SwitchRootContext.set(new SwitchRootState(opts));
	}
	opts;
	attachment;
	constructor(opts) {
		this.opts = opts;
		this.attachment = attachRef(opts.ref);
		this.onkeydown = this.onkeydown.bind(this);
		this.onclick = this.onclick.bind(this);
	}
	#toggle() {
		this.opts.checked.current = !this.opts.checked.current;
	}
	onkeydown(e) {
		if (!(e.key === "Enter" || e.key === " ") || this.opts.disabled.current) return;
		e.preventDefault();
		this.#toggle();
	}
	onclick(_) {
		if (this.opts.disabled.current) return;
		this.#toggle();
	}
	#sharedProps = derived(() => ({
		"data-disabled": boolToEmptyStrOrUndef(this.opts.disabled.current),
		"data-state": getDataChecked(this.opts.checked.current),
		"data-required": boolToEmptyStrOrUndef(this.opts.required.current)
	}));
	get sharedProps() {
		return this.#sharedProps();
	}
	set sharedProps($$value) {
		return this.#sharedProps($$value);
	}
	#snippetProps = derived(() => ({ checked: this.opts.checked.current }));
	get snippetProps() {
		return this.#snippetProps();
	}
	set snippetProps($$value) {
		return this.#snippetProps($$value);
	}
	#props = derived(() => ({
		...this.sharedProps,
		id: this.opts.id.current,
		role: "switch",
		disabled: boolToTrueOrUndef(this.opts.disabled.current),
		"aria-checked": getAriaChecked(this.opts.checked.current),
		"aria-required": boolToStr(this.opts.required.current),
		[switchAttrs.root]: "",
		onclick: this.onclick,
		onkeydown: this.onkeydown,
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SwitchInputState = class SwitchInputState {
	static create() {
		return new SwitchInputState(SwitchRootContext.get());
	}
	root;
	#shouldRender = derived(() => this.root.opts.name.current !== void 0);
	get shouldRender() {
		return this.#shouldRender();
	}
	set shouldRender($$value) {
		return this.#shouldRender($$value);
	}
	constructor(root) {
		this.root = root;
	}
	#props = derived(() => ({
		type: "checkbox",
		name: this.root.opts.name.current,
		value: this.root.opts.value.current,
		checked: this.root.opts.checked.current,
		disabled: this.root.opts.disabled.current,
		required: this.root.opts.required.current
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var SwitchThumbState = class SwitchThumbState {
	static create(opts) {
		return new SwitchThumbState(opts, SwitchRootContext.get());
	}
	opts;
	root;
	attachment;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(opts.ref);
	}
	#snippetProps = derived(() => ({ checked: this.root.opts.checked.current }));
	get snippetProps() {
		return this.#snippetProps();
	}
	set snippetProps($$value) {
		return this.#snippetProps($$value);
	}
	#props = derived(() => ({
		...this.root.sharedProps,
		id: this.opts.id.current,
		[switchAttrs.thumb]: "",
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/switch/components/switch-input.svelte
function Switch_input($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const inputState = SwitchInputState.create();
		if (inputState.shouldRender) {
			$$renderer.push("<!--[0-->");
			Hidden_input($$renderer, spread_props([inputState.props]));
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/switch/components/switch.svelte
function Switch$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { child, children, ref = null, id = createId(uid), disabled = false, required = false, checked = false, value = "on", name = void 0, type = "button", onCheckedChange = noop, $$slots, $$events, ...restProps } = $$props;
		const rootState = SwitchRootState.create({
			checked: boxWith(() => checked, (v) => {
				checked = v;
				onCheckedChange?.(v);
			}),
			disabled: boxWith(() => disabled ?? false),
			required: boxWith(() => required),
			value: boxWith(() => value),
			name: boxWith(() => name),
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps(restProps, rootState.props, { type }));
		if (child) {
			$$renderer.push("<!--[0-->");
			child($$renderer, {
				props: mergedProps(),
				...rootState.snippetProps
			});
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<button${attributes({ ...mergedProps() })}>`);
			children?.($$renderer, rootState.snippetProps);
			$$renderer.push(`<!----></button>`);
		}
		$$renderer.push(`<!--]--> `);
		Switch_input($$renderer);
		$$renderer.push(`<!---->`);
		bind_props($$props, {
			ref,
			checked
		});
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/switch/components/switch-thumb.svelte
function Switch_thumb($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { child, children, ref = null, id = createId(uid), $$slots, $$events, ...restProps } = $$props;
		const thumbState = SwitchThumbState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps(restProps, thumbState.props));
		if (child) {
			$$renderer.push("<!--[0-->");
			child($$renderer, {
				props: mergedProps(),
				...thumbState.snippetProps
			});
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<span${attributes({ ...mergedProps() })}>`);
			children?.($$renderer, thumbState.snippetProps);
			$$renderer.push(`<!----></span>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/internal/timeout-fn.js
var TimeoutFn = class {
	#interval;
	#cb;
	#timer = null;
	constructor(cb, interval) {
		this.#cb = cb;
		this.#interval = interval;
		this.stop = this.stop.bind(this);
		this.start = this.start.bind(this);
		this.stop;
	}
	#clear() {
		if (this.#timer !== null) {
			window.clearTimeout(this.#timer);
			this.#timer = null;
		}
	}
	stop() {
		this.#clear();
	}
	start(...args) {
		this.#clear();
		this.#timer = window.setTimeout(() => {
			this.#timer = null;
			this.#cb(...args);
		}, this.#interval);
	}
};
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/tooltip/tooltip.svelte.js
var tooltipAttrs = createBitsAttrs({
	component: "tooltip",
	parts: ["content", "trigger"]
});
var TooltipProviderContext = new Context("Tooltip.Provider");
var TooltipRootContext = new Context("Tooltip.Root");
var TooltipTriggerRegistryState = class {
	triggers = /* @__PURE__ */ new Map();
	activeTriggerId = null;
	#activeTriggerNode = derived(() => {
		const activeTriggerId = this.activeTriggerId;
		if (activeTriggerId === null) return null;
		return this.triggers.get(activeTriggerId)?.node ?? null;
	});
	get activeTriggerNode() {
		return this.#activeTriggerNode();
	}
	set activeTriggerNode($$value) {
		return this.#activeTriggerNode($$value);
	}
	#activePayload = derived(() => {
		const activeTriggerId = this.activeTriggerId;
		if (activeTriggerId === null) return null;
		return this.triggers.get(activeTriggerId)?.payload ?? null;
	});
	get activePayload() {
		return this.#activePayload();
	}
	set activePayload($$value) {
		return this.#activePayload($$value);
	}
	register = (record) => {
		const next = new Map(this.triggers);
		next.set(record.id, record);
		this.triggers = next;
		this.#coerceActiveTrigger();
	};
	update = (record) => {
		const next = new Map(this.triggers);
		next.set(record.id, record);
		this.triggers = next;
		this.#coerceActiveTrigger();
	};
	unregister = (id) => {
		if (!this.triggers.has(id)) return;
		const next = new Map(this.triggers);
		next.delete(id);
		this.triggers = next;
		if (this.activeTriggerId === id) this.activeTriggerId = null;
	};
	setActiveTrigger = (id) => {
		if (id === null) {
			this.activeTriggerId = null;
			return;
		}
		if (!this.triggers.has(id)) {
			this.activeTriggerId = null;
			return;
		}
		this.activeTriggerId = id;
	};
	get = (id) => {
		return this.triggers.get(id);
	};
	has = (id) => {
		return this.triggers.has(id);
	};
	getFirstTriggerId = () => {
		const firstEntry = this.triggers.entries().next();
		if (firstEntry.done) return null;
		return firstEntry.value[0];
	};
	#coerceActiveTrigger = () => {
		const activeTriggerId = this.activeTriggerId;
		if (activeTriggerId === null) return;
		if (!this.triggers.has(activeTriggerId)) this.activeTriggerId = null;
	};
};
var TooltipProviderState = class TooltipProviderState {
	static create(opts) {
		return TooltipProviderContext.set(new TooltipProviderState(opts));
	}
	opts;
	isOpenDelayed = true;
	isPointerInTransit = simpleBox(false);
	#timerFn;
	#openTooltip = null;
	constructor(opts) {
		this.opts = opts;
		this.#timerFn = new TimeoutFn(() => {
			this.isOpenDelayed = true;
		}, this.opts.skipDelayDuration.current);
	}
	#startTimer = () => {
		if (this.opts.skipDelayDuration.current === 0) {
			this.isOpenDelayed = true;
			return;
		} else this.#timerFn.start();
	};
	#clearTimer = () => {
		this.#timerFn.stop();
	};
	onOpen = (tooltip) => {
		if (this.#openTooltip && this.#openTooltip !== tooltip) this.#openTooltip.handleClose();
		this.#clearTimer();
		this.isOpenDelayed = false;
		this.#openTooltip = tooltip;
	};
	onClose = (tooltip) => {
		if (this.#openTooltip === tooltip) {
			this.#openTooltip = null;
			this.#startTimer();
		}
	};
	isTooltipOpen = (tooltip) => {
		return this.#openTooltip === tooltip;
	};
};
var TooltipRootState = class TooltipRootState {
	static create(opts) {
		return TooltipRootContext.set(new TooltipRootState(opts, TooltipProviderContext.get()));
	}
	opts;
	provider;
	#delayDuration = derived(() => this.opts.delayDuration.current ?? this.provider.opts.delayDuration.current);
	get delayDuration() {
		return this.#delayDuration();
	}
	set delayDuration($$value) {
		return this.#delayDuration($$value);
	}
	#disableHoverableContent = derived(() => this.opts.disableHoverableContent.current ?? this.provider.opts.disableHoverableContent.current);
	get disableHoverableContent() {
		return this.#disableHoverableContent();
	}
	set disableHoverableContent($$value) {
		return this.#disableHoverableContent($$value);
	}
	#disableCloseOnTriggerClick = derived(() => this.opts.disableCloseOnTriggerClick.current ?? this.provider.opts.disableCloseOnTriggerClick.current);
	get disableCloseOnTriggerClick() {
		return this.#disableCloseOnTriggerClick();
	}
	set disableCloseOnTriggerClick($$value) {
		return this.#disableCloseOnTriggerClick($$value);
	}
	#disabled = derived(() => this.opts.disabled.current ?? this.provider.opts.disabled.current);
	get disabled() {
		return this.#disabled();
	}
	set disabled($$value) {
		return this.#disabled($$value);
	}
	#ignoreNonKeyboardFocus = derived(() => this.opts.ignoreNonKeyboardFocus.current ?? this.provider.opts.ignoreNonKeyboardFocus.current);
	get ignoreNonKeyboardFocus() {
		return this.#ignoreNonKeyboardFocus();
	}
	set ignoreNonKeyboardFocus($$value) {
		return this.#ignoreNonKeyboardFocus($$value);
	}
	registry;
	tether;
	contentNode = null;
	contentPresence;
	#wasOpenDelayed = false;
	#timerFn;
	#stateAttr = derived(() => {
		if (!this.opts.open.current) return "closed";
		return this.#wasOpenDelayed ? "delayed-open" : "instant-open";
	});
	get stateAttr() {
		return this.#stateAttr();
	}
	set stateAttr($$value) {
		return this.#stateAttr($$value);
	}
	constructor(opts, provider) {
		this.opts = opts;
		this.provider = provider;
		this.tether = opts.tether.current?.state ?? null;
		this.registry = this.tether?.registry ?? new TooltipTriggerRegistryState();
		this.#timerFn = new TimeoutFn(() => {
			this.#wasOpenDelayed = true;
			this.opts.open.current = true;
		}, this.delayDuration ?? 0);
		if (this.tether) this.tether.root = this;
		this.contentPresence = new PresenceManager({
			open: this.opts.open,
			ref: boxWith(() => this.contentNode),
			onComplete: () => {
				this.opts.onOpenChangeComplete.current(this.opts.open.current);
			}
		});
		watch(() => this.delayDuration, () => {
			if (this.delayDuration === void 0) return;
			this.#timerFn = new TimeoutFn(() => {
				this.#wasOpenDelayed = true;
				this.opts.open.current = true;
			}, this.delayDuration);
		});
		watch(() => this.opts.open.current, (isOpen) => {
			if (isOpen) {
				this.ensureActiveTrigger();
				this.provider.onOpen(this);
			} else this.provider.onClose(this);
		}, { lazy: true });
		watch(() => this.opts.triggerId.current, (triggerId) => {
			if (triggerId === this.registry.activeTriggerId) return;
			this.registry.setActiveTrigger(triggerId);
		});
		watch(() => this.registry.activeTriggerId, (activeTriggerId) => {
			if (this.opts.triggerId.current === activeTriggerId) return;
			this.opts.triggerId.current = activeTriggerId;
		});
	}
	handleOpen = () => {
		this.#timerFn.stop();
		this.#wasOpenDelayed = false;
		this.ensureActiveTrigger();
		this.opts.open.current = true;
	};
	handleClose = () => {
		this.#timerFn.stop();
		this.opts.open.current = false;
	};
	#handleDelayedOpen = () => {
		this.#timerFn.stop();
		const shouldSkipDelay = !this.provider.isOpenDelayed;
		const delayDuration = this.delayDuration ?? 0;
		if (shouldSkipDelay || delayDuration === 0) {
			this.#wasOpenDelayed = false;
			this.opts.open.current = true;
		} else this.#timerFn.start();
	};
	onTriggerEnter = (triggerId) => {
		this.setActiveTrigger(triggerId);
		this.#handleDelayedOpen();
	};
	onTriggerLeave = () => {
		if (this.disableHoverableContent) this.handleClose();
		else this.#timerFn.stop();
	};
	ensureActiveTrigger = () => {
		if (this.registry.activeTriggerId !== null && this.registry.has(this.registry.activeTriggerId)) return;
		if (this.opts.triggerId.current !== null && this.registry.has(this.opts.triggerId.current)) {
			this.registry.setActiveTrigger(this.opts.triggerId.current);
			return;
		}
		const firstTriggerId = this.registry.getFirstTriggerId();
		this.registry.setActiveTrigger(firstTriggerId);
	};
	setActiveTrigger = (triggerId) => {
		this.registry.setActiveTrigger(triggerId);
	};
	registerTrigger = (trigger) => {
		this.registry.register(trigger);
		if (trigger.disabled && this.registry.activeTriggerId === trigger.id && this.opts.open.current) this.handleClose();
	};
	updateTrigger = (trigger) => {
		this.registry.update(trigger);
		if (trigger.disabled && this.registry.activeTriggerId === trigger.id && this.opts.open.current) this.handleClose();
	};
	unregisterTrigger = (id) => {
		const isActive = this.registry.activeTriggerId === id;
		this.registry.unregister(id);
		if (isActive && this.opts.open.current) this.handleClose();
	};
	isActiveTrigger = (triggerId) => {
		return this.registry.activeTriggerId === triggerId;
	};
	get triggerNode() {
		return this.registry.activeTriggerNode;
	}
	get activePayload() {
		return this.registry.activePayload;
	}
	get activeTriggerId() {
		return this.registry.activeTriggerId;
	}
};
var TooltipTriggerState = class TooltipTriggerState {
	static create(opts) {
		if (opts.tether.current) return new TooltipTriggerState(opts, null, opts.tether.current.state);
		return new TooltipTriggerState(opts, TooltipRootContext.get(), null);
	}
	opts;
	root;
	tether;
	attachment;
	#isPointerDown = simpleBox(false);
	#hasPointerMoveOpened = false;
	domContext;
	#transitCheckTimeout = null;
	#mounted = false;
	#lastRegisteredId = null;
	constructor(opts, root, tether) {
		this.opts = opts;
		this.root = root;
		this.tether = tether;
		this.domContext = new DOMContext(opts.ref);
		this.attachment = attachRef(this.opts.ref, (v) => this.#register(v));
		watch(() => this.opts.id.current, () => {
			this.#register(this.opts.ref.current);
		});
		watch(() => this.opts.payload.current, () => {
			this.#register(this.opts.ref.current);
		});
		watch(() => this.opts.disabled.current, () => {
			this.#register(this.opts.ref.current);
		});
	}
	#getRoot = () => {
		return this.tether?.root ?? this.root;
	};
	#isDisabled = () => {
		const root = this.#getRoot();
		return this.opts.disabled.current || Boolean(root?.disabled);
	};
	#register = (node) => {
		if (!this.#mounted) return;
		const id = this.opts.id.current;
		const payload = this.opts.payload.current;
		const disabled = this.opts.disabled.current;
		if (this.#lastRegisteredId && this.#lastRegisteredId !== id) {
			const root = this.#getRoot();
			if (this.tether) this.tether.registry.unregister(this.#lastRegisteredId);
			else root?.unregisterTrigger(this.#lastRegisteredId);
		}
		const triggerRecord = {
			id,
			node,
			payload,
			disabled
		};
		const root = this.#getRoot();
		if (this.tether) {
			if (this.tether.registry.has(id)) this.tether.registry.update(triggerRecord);
			else this.tether.registry.register(triggerRecord);
			if (disabled && this.tether.registry.activeTriggerId === id && root?.opts.open.current) root.handleClose();
		} else if (root?.registry.has(id)) root.updateTrigger(triggerRecord);
		else root?.registerTrigger(triggerRecord);
		this.#lastRegisteredId = id;
	};
	#clearTransitCheck = () => {
		if (this.#transitCheckTimeout !== null) {
			clearTimeout(this.#transitCheckTimeout);
			this.#transitCheckTimeout = null;
		}
	};
	handlePointerUp = () => {
		this.#isPointerDown.current = false;
	};
	#onpointerup = () => {
		if (this.#isDisabled()) return;
		this.#isPointerDown.current = false;
	};
	#onpointerdown = () => {
		if (this.#isDisabled()) return;
		this.#isPointerDown.current = true;
		this.domContext.getDocument().addEventListener("pointerup", () => {
			this.handlePointerUp();
		}, { once: true });
	};
	#onpointerenter = (e) => {
		const root = this.#getRoot();
		if (!root) return;
		if (this.#isDisabled()) {
			if (root.opts.open.current) root.handleClose();
			return;
		}
		if (e.pointerType === "touch") return;
		if (root.provider.isPointerInTransit.current) {
			this.#clearTransitCheck();
			this.#transitCheckTimeout = window.setTimeout(() => {
				if (root.provider.isPointerInTransit.current) {
					root.provider.isPointerInTransit.current = false;
					root.onTriggerEnter(this.opts.id.current);
					this.#hasPointerMoveOpened = true;
				}
			}, 250);
			return;
		}
		root.onTriggerEnter(this.opts.id.current);
		this.#hasPointerMoveOpened = true;
	};
	#onpointermove = (e) => {
		const root = this.#getRoot();
		if (!root) return;
		if (this.#isDisabled()) {
			if (root.opts.open.current) root.handleClose();
			return;
		}
		if (e.pointerType === "touch") return;
		if (this.#hasPointerMoveOpened) return;
		this.#clearTransitCheck();
		root.provider.isPointerInTransit.current = false;
		root.onTriggerEnter(this.opts.id.current);
		this.#hasPointerMoveOpened = true;
	};
	#onpointerleave = (e) => {
		const root = this.#getRoot();
		if (!root) return;
		if (this.#isDisabled()) return;
		this.#clearTransitCheck();
		if (!root.isActiveTrigger(this.opts.id.current)) {
			this.#hasPointerMoveOpened = false;
			return;
		}
		const relatedTarget = e.relatedTarget;
		if (isElement(relatedTarget)) for (const record of root.registry.triggers.values()) {
			if (record.node !== relatedTarget) continue;
			if (root.provider.opts.skipDelayDuration.current > 0) {
				this.#hasPointerMoveOpened = false;
				return;
			}
			root.handleClose();
			this.#hasPointerMoveOpened = false;
			return;
		}
		root.onTriggerLeave();
		this.#hasPointerMoveOpened = false;
	};
	#onfocus = (e) => {
		const root = this.#getRoot();
		if (!root) return;
		if (this.#isPointerDown.current) return;
		if (this.#isDisabled()) {
			if (root.opts.open.current) root.handleClose();
			return;
		}
		if (root.ignoreNonKeyboardFocus && !isFocusVisible(e.currentTarget)) return;
		root.setActiveTrigger(this.opts.id.current);
		root.handleOpen();
	};
	#onblur = () => {
		const root = this.#getRoot();
		if (!root || this.#isDisabled()) return;
		root.handleClose();
	};
	#onclick = () => {
		const root = this.#getRoot();
		if (!root || root.disableCloseOnTriggerClick || this.#isDisabled()) return;
		root.handleClose();
	};
	#props = derived(() => {
		const root = this.#getRoot();
		const isOpenForTrigger = Boolean(root?.opts.open.current && root.isActiveTrigger(this.opts.id.current));
		const isDisabled = this.#isDisabled();
		return {
			id: this.opts.id.current,
			"aria-describedby": isOpenForTrigger ? root?.contentNode?.id : void 0,
			"data-state": isOpenForTrigger ? root?.stateAttr : "closed",
			"data-disabled": boolToEmptyStrOrUndef(isDisabled),
			"data-delay-duration": `${root?.delayDuration ?? 0}`,
			[tooltipAttrs.trigger]: "",
			tabindex: isDisabled ? void 0 : this.opts.tabindex.current,
			disabled: this.opts.disabled.current,
			onpointerup: this.#onpointerup,
			onpointerdown: this.#onpointerdown,
			onpointerenter: this.#onpointerenter,
			onpointermove: this.#onpointermove,
			onpointerleave: this.#onpointerleave,
			onfocus: this.#onfocus,
			onblur: this.#onblur,
			onclick: this.#onclick,
			...this.attachment
		};
	});
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
};
var TooltipContentState = class TooltipContentState {
	static create(opts) {
		return new TooltipContentState(opts, TooltipRootContext.get());
	}
	opts;
	root;
	attachment;
	constructor(opts, root) {
		this.opts = opts;
		this.root = root;
		this.attachment = attachRef(this.opts.ref, (v) => this.root.contentNode = v);
		new SafePolygon({
			triggerNode: () => this.root.triggerNode,
			contentNode: () => this.root.contentNode,
			enabled: () => this.root.opts.open.current && !this.root.disableHoverableContent,
			transitIntentTimeout: 180,
			ignoredTargets: () => {
				if (this.root.provider.opts.skipDelayDuration.current === 0) return [];
				const nodes = [];
				const activeTriggerNode = this.root.triggerNode;
				for (const record of this.root.registry.triggers.values()) if (record.node && record.node !== activeTriggerNode) nodes.push(record.node);
				return nodes;
			},
			onPointerExit: () => {
				if (this.root.provider.isTooltipOpen(this.root)) this.root.handleClose();
			}
		});
	}
	onInteractOutside = (e) => {
		if (isElement(e.target) && this.root.triggerNode?.contains(e.target) && this.root.disableCloseOnTriggerClick) {
			e.preventDefault();
			return;
		}
		this.opts.onInteractOutside.current(e);
		if (e.defaultPrevented) return;
		this.root.handleClose();
	};
	onEscapeKeydown = (e) => {
		this.opts.onEscapeKeydown.current?.(e);
		if (e.defaultPrevented) return;
		this.root.handleClose();
	};
	onOpenAutoFocus = (e) => {
		e.preventDefault();
	};
	onCloseAutoFocus = (e) => {
		e.preventDefault();
	};
	get shouldRender() {
		return this.root.contentPresence.shouldRender;
	}
	#snippetProps = derived(() => ({ open: this.root.opts.open.current }));
	get snippetProps() {
		return this.#snippetProps();
	}
	set snippetProps($$value) {
		return this.#snippetProps($$value);
	}
	#props = derived(() => ({
		id: this.opts.id.current,
		"data-state": this.root.stateAttr,
		"data-disabled": boolToEmptyStrOrUndef(this.root.disabled),
		...getDataTransitionAttrs(this.root.contentPresence.transitionStatus),
		style: { outline: "none" },
		[tooltipAttrs.content]: "",
		...this.attachment
	}));
	get props() {
		return this.#props();
	}
	set props($$value) {
		return this.#props($$value);
	}
	popperProps = {
		onInteractOutside: this.onInteractOutside,
		onEscapeKeydown: this.onEscapeKeydown,
		onOpenAutoFocus: this.onOpenAutoFocus,
		onCloseAutoFocus: this.onCloseAutoFocus
	};
};
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/tooltip/components/tooltip.svelte
function Tooltip$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open = false, triggerId = null, onOpenChange = noop, onOpenChangeComplete = noop, disabled, delayDuration, disableCloseOnTriggerClick, disableHoverableContent, ignoreNonKeyboardFocus, tether, children } = $$props;
		const rootState = TooltipRootState.create({
			open: boxWith(() => open, (v) => {
				open = v;
				onOpenChange(v);
			}),
			triggerId: boxWith(() => triggerId, (v) => {
				triggerId = v;
			}),
			delayDuration: boxWith(() => delayDuration),
			disableCloseOnTriggerClick: boxWith(() => disableCloseOnTriggerClick),
			disableHoverableContent: boxWith(() => disableHoverableContent),
			ignoreNonKeyboardFocus: boxWith(() => ignoreNonKeyboardFocus),
			disabled: boxWith(() => disabled),
			onOpenChangeComplete: boxWith(() => onOpenChangeComplete),
			tether: boxWith(() => tether)
		});
		Floating_layer($$renderer, {
			tooltip: true,
			children: ($$renderer) => {
				children?.($$renderer, {
					open: rootState.opts.open.current,
					triggerId: rootState.activeTriggerId,
					payload: rootState.activePayload
				});
				$$renderer.push(`<!---->`);
			}});
		bind_props($$props, {
			open,
			triggerId
		});
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/tooltip/components/tooltip-content.svelte
function Tooltip_content$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { children, child, id = createId(uid), ref = null, side = "top", sideOffset = 0, align = "center", avoidCollisions = true, arrowPadding = 0, sticky = "partial", strategy, hideWhenDetached = false, customAnchor, collisionPadding = 0, onInteractOutside = noop, onEscapeKeydown = noop, forceMount = false, style, $$slots, $$events, ...restProps } = $$props;
		const contentState = TooltipContentState.create({
			id: boxWith(() => id),
			ref: boxWith(() => ref, (v) => ref = v),
			onInteractOutside: boxWith(() => onInteractOutside),
			onEscapeKeydown: boxWith(() => onEscapeKeydown)
		});
		const floatingProps = derived(() => ({
			side,
			sideOffset,
			align,
			avoidCollisions,
			arrowPadding,
			sticky,
			hideWhenDetached,
			collisionPadding,
			strategy,
			customAnchor: customAnchor ?? contentState.root.triggerNode
		}));
		const mergedProps = derived(() => mergeProps(restProps, floatingProps(), contentState.props));
		if (forceMount) {
			$$renderer.push("<!--[0-->");
			{
				function popper($$renderer, { props, wrapperProps }) {
					const finalWrapperProps = mergeProps(wrapperProps, { style: { pointerEvents: contentState.root.disableHoverableContent ? "none" : void 0 } });
					const finalProps = mergeProps(props, { style: getFloatingContentCSSVars("tooltip") }, { style });
					if (child) {
						$$renderer.push("<!--[0-->");
						child($$renderer, {
							props: finalProps,
							wrapperProps: finalWrapperProps,
							...contentState.snippetProps
						});
						$$renderer.push(`<!---->`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<div${attributes({ ...finalWrapperProps })}><div${attributes({ ...finalProps })}>`);
						children?.($$renderer);
						$$renderer.push(`<!----></div></div>`);
					}
					$$renderer.push(`<!--]-->`);
				}
				Popper_layer_force_mount($$renderer, spread_props([
					mergedProps(),
					contentState.popperProps,
					{
						enabled: contentState.root.opts.open.current,
						id,
						trapFocus: false,
						loop: false,
						preventScroll: false,
						forceMount: true,
						ref: contentState.opts.ref,
						tooltip: true,
						shouldRender: contentState.shouldRender,
						contentPointerEvents: contentState.root.disableHoverableContent ? "none" : "auto",
						popper,
						$$slots: { popper: true }
					}
				]));
			}
		} else if (!forceMount) {
			$$renderer.push("<!--[1-->");
			{
				function popper($$renderer, { props, wrapperProps }) {
					const finalWrapperProps = mergeProps(wrapperProps, { style: { pointerEvents: contentState.root.disableHoverableContent ? "none" : void 0 } });
					const finalProps = mergeProps(props, { style: getFloatingContentCSSVars("tooltip") }, { style });
					if (child) {
						$$renderer.push("<!--[0-->");
						child($$renderer, {
							props: finalProps,
							wrapperProps: finalWrapperProps,
							...contentState.snippetProps
						});
						$$renderer.push(`<!---->`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<div${attributes({ ...finalWrapperProps })}><div${attributes({ ...finalProps })}>`);
						children?.($$renderer);
						$$renderer.push(`<!----></div></div>`);
					}
					$$renderer.push(`<!--]-->`);
				}
				Popper_layer($$renderer, spread_props([
					mergedProps(),
					contentState.popperProps,
					{
						open: contentState.root.opts.open.current,
						id,
						trapFocus: false,
						loop: false,
						preventScroll: false,
						forceMount: false,
						ref: contentState.opts.ref,
						tooltip: true,
						shouldRender: contentState.shouldRender,
						contentPointerEvents: contentState.root.disableHoverableContent ? "none" : "auto",
						popper,
						$$slots: { popper: true }
					}
				]));
			}
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/tooltip/components/tooltip-trigger.svelte
function Tooltip_trigger$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const uid = props_id($$renderer);
		let { children, child, id = createId(uid), disabled = false, payload, tether, type = "button", tabindex = 0, ref = null, $$slots, $$events, ...restProps } = $$props;
		const triggerState = TooltipTriggerState.create({
			id: boxWith(() => id),
			disabled: boxWith(() => disabled ?? false),
			tabindex: boxWith(() => tabindex ?? 0),
			payload: boxWith(() => payload),
			tether: boxWith(() => tether),
			ref: boxWith(() => ref, (v) => ref = v)
		});
		const mergedProps = derived(() => mergeProps(restProps, triggerState.props, { type }));
		if (child) {
			$$renderer.push("<!--[0-->");
			child($$renderer, { props: mergedProps() });
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<button${attributes({ ...mergedProps() })}>`);
			children?.($$renderer);
			$$renderer.push(`<!----></button>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/tooltip/components/tooltip-arrow.svelte
function Tooltip_arrow($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Floating_layer_arrow($$renderer, spread_props([restProps, {
				get ref() {
					return ref;
				},
				set ref($$value) {
					ref = $$value;
					$$settled = false;
				}
			}]));
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/bits-ui@2.18.1_@internationalized+date@3.12.2_@sveltejs+kit@2.63.0_@sveltejs+vite-plugi_9cc058121c596515e088620f7102fcef/node_modules/bits-ui/dist/bits/tooltip/components/tooltip-provider.svelte
function Tooltip_provider$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { children, delayDuration = 700, disableCloseOnTriggerClick = false, disableHoverableContent = false, disabled = false, ignoreNonKeyboardFocus = false, skipDelayDuration = 300 } = $$props;
		TooltipProviderState.create({
			delayDuration: boxWith(() => delayDuration),
			disableCloseOnTriggerClick: boxWith(() => disableCloseOnTriggerClick),
			disableHoverableContent: boxWith(() => disableHoverableContent),
			disabled: boxWith(() => disabled),
			ignoreNonKeyboardFocus: boxWith(() => ignoreNonKeyboardFocus),
			skipDelayDuration: boxWith(() => skipDelayDuration)
		});
		children?.($$renderer);
		$$renderer.push(`<!---->`);
	});
}
//#endregion
//#region src/lib/components/ui/tooltip/tooltip.svelte
function Tooltip($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open = false, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Tooltip$1) {
				$$renderer.push("<!--[-->");
				Tooltip$1($$renderer, spread_props([restProps, {
					get open() {
						return open;
					},
					set open($$value) {
						open = $$value;
						$$settled = false;
					}
				}]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { open });
	});
}
//#endregion
//#region src/lib/components/ui/tooltip/tooltip-trigger.svelte
function Tooltip_trigger($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Tooltip_trigger$1) {
				$$renderer.push("<!--[-->");
				Tooltip_trigger$1($$renderer, spread_props([
					{ "data-slot": "tooltip-trigger" },
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						}
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/tooltip/tooltip-portal.svelte
function Tooltip_portal($$renderer, $$props) {
	let { $$slots, $$events, ...restProps } = $$props;
	if (Portal) {
		$$renderer.push("<!--[-->");
		Portal($$renderer, spread_props([restProps]));
		$$renderer.push("<!--]-->");
	} else {
		$$renderer.push("<!--[!-->");
		$$renderer.push("<!--]-->");
	}
}
//#endregion
//#region src/lib/components/ui/tooltip/tooltip-content.svelte
function Tooltip_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, sideOffset = 0, side = "top", children, arrowClasses, portalProps, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Tooltip_portal($$renderer, spread_props([portalProps, {
				children: ($$renderer) => {
					if (Tooltip_content$1) {
						$$renderer.push("<!--[-->");
						Tooltip_content$1($$renderer, spread_props([
							{
								"data-slot": "tooltip-content",
								sideOffset,
								side,
								class: cn("z-50 inline-flex w-fit max-w-xs origin-(--bits-tooltip-content-transform-origin) items-center gap-1.5 rounded-xl bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-lg data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className)
							},
							restProps,
							{
								get ref() {
									return ref;
								},
								set ref($$value) {
									ref = $$value;
									$$settled = false;
								},
								children: ($$renderer) => {
									children?.($$renderer);
									$$renderer.push(`<!----> `);
									{
										function child($$renderer, { props }) {
											$$renderer.push(`<div${attributes({
												class: clsx$1(cn("z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground data-[side=left]:translate-x-[-1.5px] data-[side=right]:translate-x-[1.5px]", "data-[side=top]:translate-x-1/2 data-[side=top]:translate-y-[calc(-50%+2px)]", "data-[side=bottom]:-translate-x-1/2 data-[side=bottom]:-translate-y-[calc(-50%+1px)]", "data-[side=right]:translate-x-[calc(50%+2px)] data-[side=right]:translate-y-1/2", "data-[side=left]:-translate-y-[calc(50%-3px)]", arrowClasses)),
												...props
											})}></div>`);
										}
										if (Tooltip_arrow) {
											$$renderer.push("<!--[-->");
											Tooltip_arrow($$renderer, {
												child,
												$$slots: { child: true }
											});
											$$renderer.push("<!--]-->");
										} else {
											$$renderer.push("<!--[!-->");
											$$renderer.push("<!--]-->");
										}
									}
								},
								$$slots: { default: true }
							}
						]));
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			}]));
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/tooltip/tooltip-provider.svelte
function Tooltip_provider($$renderer, $$props) {
	let { delayDuration = 0, $$slots, $$events, ...restProps } = $$props;
	if (Tooltip_provider$1) {
		$$renderer.push("<!--[-->");
		Tooltip_provider$1($$renderer, spread_props([{ delayDuration }, restProps]));
		$$renderer.push("<!--]-->");
	} else {
		$$renderer.push("<!--[!-->");
		$$renderer.push("<!--]-->");
	}
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-menu-button.svelte
var sidebarMenuButtonVariants = tv({
	base: "ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground gap-2 rounded-xl px-3 py-2 text-left text-sm transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! focus-visible:ring-2 data-active:font-medium peer/menu-button group/menu-button flex w-full items-center overflow-hidden outline-hidden disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
	variants: {
		variant: {
			default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
			outline: "bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shadow-[0_0_0_1px_var(--sidebar-border)] hover:shadow-[0_0_0_1px_var(--sidebar-accent)]"
		},
		size: {
			default: "h-9 text-sm",
			sm: "h-8 text-xs",
			lg: "h-14 px-3 text-sm group-data-[collapsible=icon]:p-0!"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Sidebar_menu_button($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, child, variant = "default", size = "default", isActive = false, tooltipContent, tooltipContentProps, $$slots, $$events, ...restProps } = $$props;
		const sidebar = useSidebar();
		const buttonProps = derived(() => ({
			class: cn(sidebarMenuButtonVariants({
				variant,
				size
			}), className),
			"data-slot": "sidebar-menu-button",
			"data-sidebar": "menu-button",
			"data-size": size,
			"data-active": isActive,
			...restProps
		}));
		function Button($$renderer, { props }) {
			const mergedProps = mergeProps(buttonProps(), props);
			if (child) {
				$$renderer.push("<!--[0-->");
				child($$renderer, { props: mergedProps });
				$$renderer.push(`<!---->`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<button${attributes({ ...mergedProps })}>`);
				children?.($$renderer);
				$$renderer.push(`<!----></button>`);
			}
			$$renderer.push(`<!--]-->`);
		}
		if (!tooltipContent) {
			$$renderer.push("<!--[0-->");
			Button($$renderer, {});
		} else {
			$$renderer.push("<!--[-1-->");
			if (Tooltip) {
				$$renderer.push("<!--[-->");
				Tooltip($$renderer, {
					children: ($$renderer) => {
						{
							function child($$renderer, { props }) {
								Button($$renderer, { props });
							}
							if (Tooltip_trigger) {
								$$renderer.push("<!--[-->");
								Tooltip_trigger($$renderer, {
									child,
									$$slots: { child: true }
								});
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
						}
						$$renderer.push(` `);
						if (Tooltip_content) {
							$$renderer.push("<!--[-->");
							Tooltip_content($$renderer, spread_props([
								{
									side: "right",
									align: "center",
									hidden: sidebar.state !== "collapsed" || sidebar.isMobile
								},
								tooltipContentProps,
								{
									children: ($$renderer) => {
										if (typeof tooltipContent === "string") {
											$$renderer.push("<!--[0-->");
											$$renderer.push(`${escape_html(tooltipContent)}`);
										} else if (tooltipContent) {
											$$renderer.push("<!--[1-->");
											tooltipContent($$renderer);
											$$renderer.push(`<!---->`);
										} else $$renderer.push("<!--[-1-->");
										$$renderer.push(`<!--]-->`);
									},
									$$slots: { default: true }
								}
							]));
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
					},
					$$slots: { default: true }
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-menu-item.svelte
function Sidebar_menu_item($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<li${attributes({
			"data-slot": "sidebar-menu-item",
			"data-sidebar": "menu-item",
			class: clsx$1(cn("group/menu-item relative", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></li>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-menu.svelte
function Sidebar_menu($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<ul${attributes({
			"data-slot": "sidebar-menu",
			"data-sidebar": "menu",
			class: clsx$1(cn("flex w-full min-w-0 flex-col gap-0.5", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></ul>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar-provider.svelte
function Sidebar_provider($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, open = true, onOpenChange = () => {}, class: className, style, children, $$slots, $$events, ...restProps } = $$props;
		setSidebar({
			open: () => open,
			setOpen: (value) => {
				open = value;
				onOpenChange(value);
				document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
			}
		});
		if (Tooltip_provider) {
			$$renderer.push("<!--[-->");
			Tooltip_provider($$renderer, {
				delayDuration: 0,
				children: ($$renderer) => {
					$$renderer.push(`<div${attributes({
						"data-slot": "sidebar-wrapper",
						style: `--sidebar-width: ${stringify(SIDEBAR_WIDTH)}; --sidebar-width-icon: ${stringify(SIDEBAR_WIDTH_ICON)}; ${stringify(style)}`,
						class: clsx$1(cn("group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar", className)),
						...restProps
					})}>`);
					children?.($$renderer);
					$$renderer.push(`<!----></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		bind_props($$props, {
			ref,
			open
		});
	});
}
//#endregion
//#region src/lib/components/ui/sheet/sheet.svelte
function Sheet($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open = false, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Dialog$1) {
				$$renderer.push("<!--[-->");
				Dialog$1($$renderer, spread_props([restProps, {
					get open() {
						return open;
					},
					set open($$value) {
						open = $$value;
						$$settled = false;
					}
				}]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { open });
	});
}
//#endregion
//#region src/lib/components/ui/sheet/sheet-portal.svelte
function Sheet_portal($$renderer, $$props) {
	let { $$slots, $$events, ...restProps } = $$props;
	if (Portal) {
		$$renderer.push("<!--[-->");
		Portal($$renderer, spread_props([restProps]));
		$$renderer.push("<!--]-->");
	} else {
		$$renderer.push("<!--[!-->");
		$$renderer.push("<!--]-->");
	}
}
//#endregion
//#region src/lib/components/ui/sheet/sheet-overlay.svelte
function Sheet_overlay($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Dialog_overlay$1) {
				$$renderer.push("<!--[-->");
				Dialog_overlay$1($$renderer, spread_props([
					{
						"data-slot": "sheet-overlay",
						class: cn("fixed inset-0 z-50 bg-black/30 supports-backdrop-filter:backdrop-blur-sm", className)
					},
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						}
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sheet/sheet-content.svelte
function Sheet_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, side = "right", showCloseButton = true, portalProps, children, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Sheet_portal($$renderer, spread_props([portalProps, {
				children: ($$renderer) => {
					Sheet_overlay($$renderer, {});
					$$renderer.push(`<!----> `);
					if (Dialog_content$1) {
						$$renderer.push("<!--[-->");
						Dialog_content$1($$renderer, spread_props([
							{
								"data-slot": "sheet-content",
								"data-side": side,
								class: cn("fixed z-50 flex flex-col bg-popover bg-clip-padding text-sm text-popover-foreground shadow-xl transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10", className)
							},
							restProps,
							{
								get ref() {
									return ref;
								},
								set ref($$value) {
									ref = $$value;
									$$settled = false;
								},
								children: ($$renderer) => {
									children?.($$renderer);
									$$renderer.push(`<!----> `);
									if (showCloseButton) {
										$$renderer.push("<!--[0-->");
										{
											function child($$renderer, { props }) {
												Button($$renderer, spread_props([
													{
														variant: "ghost",
														class: "absolute top-4 right-4 bg-secondary",
														size: "icon-sm"
													},
													props,
													{
														children: ($$renderer) => {
															Close_line($$renderer, {});
															$$renderer.push(`<!----> <span class="sr-only">Close</span>`);
														},
														$$slots: { default: true }
													}
												]));
											}
											if (Dialog_close) {
												$$renderer.push("<!--[-->");
												Dialog_close($$renderer, {
													"data-slot": "sheet-close",
													child,
													$$slots: { child: true }
												});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
										}
									} else $$renderer.push("<!--[-1-->");
									$$renderer.push(`<!--]-->`);
								},
								$$slots: { default: true }
							}
						]));
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			}]));
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sheet/sheet-header.svelte
function Sheet_header($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, $$slots, $$events, ...restProps } = $$props;
		$$renderer.push(`<div${attributes({
			"data-slot": "sheet-header",
			class: clsx$1(cn("flex flex-col gap-1.5 p-6", className)),
			...restProps
		})}>`);
		children?.($$renderer);
		$$renderer.push(`<!----></div>`);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sheet/sheet-title.svelte
function Sheet_title($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Dialog_title$1) {
				$$renderer.push("<!--[-->");
				Dialog_title$1($$renderer, spread_props([
					{
						"data-slot": "sheet-title",
						class: cn("text-base font-medium text-foreground", className)
					},
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						}
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sheet/sheet-description.svelte
function Sheet_description($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Dialog_description$1) {
				$$renderer.push("<!--[-->");
				Dialog_description$1($$renderer, spread_props([
					{
						"data-slot": "sheet-description",
						class: cn("text-sm text-muted-foreground", className)
					},
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						}
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/sidebar/sidebar.svelte
function Sidebar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, side = "left", variant = "sidebar", collapsible = "offcanvas", class: className, children, $$slots, $$events, ...restProps } = $$props;
		const sidebar = useSidebar();
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (collapsible === "none") {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div${attributes({
					class: clsx$1(cn("flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground", className)),
					...restProps
				})}>`);
				children?.($$renderer);
				$$renderer.push(`<!----></div>`);
			} else if (sidebar.isMobile) {
				$$renderer.push("<!--[1-->");
				var bind_get = () => sidebar.openMobile;
				var bind_set = (v) => sidebar.setOpenMobile(v);
				if (Sheet) {
					$$renderer.push("<!--[-->");
					Sheet($$renderer, spread_props([
						{
							get open() {
								return bind_get();
							},
							set open($$value) {
								bind_set($$value);
							}
						},
						restProps,
						{
							children: ($$renderer) => {
								if (Sheet_content) {
									$$renderer.push("<!--[-->");
									Sheet_content($$renderer, {
										"data-sidebar": "sidebar",
										"data-slot": "sidebar",
										"data-mobile": "true",
										class: cn("w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden", className),
										style: `--sidebar-width: ${stringify(SIDEBAR_WIDTH_MOBILE)};`,
										side,
										get ref() {
											return ref;
										},
										set ref($$value) {
											ref = $$value;
											$$settled = false;
										},
										children: ($$renderer) => {
											if (Sheet_header) {
												$$renderer.push("<!--[-->");
												Sheet_header($$renderer, {
													class: "sr-only",
													children: ($$renderer) => {
														if (Sheet_title) {
															$$renderer.push("<!--[-->");
															Sheet_title($$renderer, {
																children: ($$renderer) => {
																	$$renderer.push(`<!---->Sidebar`);
																},
																$$slots: { default: true }
															});
															$$renderer.push("<!--]-->");
														} else {
															$$renderer.push("<!--[!-->");
															$$renderer.push("<!--]-->");
														}
														$$renderer.push(` `);
														if (Sheet_description) {
															$$renderer.push("<!--[-->");
															Sheet_description($$renderer, {
																children: ($$renderer) => {
																	$$renderer.push(`<!---->Displays the mobile sidebar.`);
																},
																$$slots: { default: true }
															});
															$$renderer.push("<!--]-->");
														} else {
															$$renderer.push("<!--[!-->");
															$$renderer.push("<!--]-->");
														}
													},
													$$slots: { default: true }
												});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
											$$renderer.push(` <div class="flex h-full w-full flex-col">`);
											children?.($$renderer);
											$$renderer.push(`<!----></div>`);
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
							},
							$$slots: { default: true }
						}
					]));
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div class="group peer hidden text-sidebar-foreground md:block"${attr("data-state", sidebar.state)}${attr("data-collapsible", sidebar.state === "collapsed" ? collapsible : "")}${attr("data-variant", variant)}${attr("data-side", side)} data-slot="sidebar"><div data-slot="sidebar-gap"${attr_class(clsx$1(cn("relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear", "group-data-[collapsible=offcanvas]:w-0", "group-data-[side=right]:rotate-180", variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)")))}></div> <div${attributes({
					"data-slot": "sidebar-container",
					class: clsx$1(cn("fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex", side === "left" ? "start-0 group-data-[collapsible=offcanvas]:start-[calc(var(--sidebar-width)*-1)]" : "end-0 group-data-[collapsible=offcanvas]:end-[calc(var(--sidebar-width)*-1)]", variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-e group-data-[side=right]:border-s", className)),
					...restProps
				})}><div data-sidebar="sidebar" data-slot="sidebar-inner" class="flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-2xl group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border">`);
				children?.($$renderer);
				$$renderer.push(`<!----></div></div></div>`);
			}
			$$renderer.push(`<!--]-->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/SidebarNav.svelte
function SidebarNav($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const sidebar = useSidebar();
		const nav = useNavState();
		if (Sidebar) {
			$$renderer.push("<!--[-->");
			Sidebar($$renderer, {
				collapsible: "none",
				class: "w-[calc(var(--sidebar-width-icon)+1px)]! border-e",
				children: ($$renderer) => {
					if (Sidebar_content) {
						$$renderer.push("<!--[-->");
						Sidebar_content($$renderer, {
							children: ($$renderer) => {
								if (Sidebar_group) {
									$$renderer.push("<!--[-->");
									Sidebar_group($$renderer, {
										children: ($$renderer) => {
											if (Sidebar_group_content) {
												$$renderer.push("<!--[-->");
												Sidebar_group_content($$renderer, {
													class: "px-1.5 md:px-0",
													children: ($$renderer) => {
														if (Sidebar_menu) {
															$$renderer.push("<!--[-->");
															Sidebar_menu($$renderer, {
																children: ($$renderer) => {
																	$$renderer.push(`<!--[-->`);
																	const each_array = ensure_array_like(navItems);
																	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
																		let item = each_array[$$index];
																		if (Sidebar_menu_item) {
																			$$renderer.push("<!--[-->");
																			Sidebar_menu_item($$renderer, {
																				children: ($$renderer) => {
																					if (Sidebar_menu_button) {
																						$$renderer.push("<!--[-->");
																						Sidebar_menu_button($$renderer, {
																							tooltipContent: item.title,
																							isActive: nav.current === item.id,
																							class: "px-2.5 md:px-2",
																							onclick: () => {
																								const wasActive = nav.current === item.id;
																								nav.toggle(item.id);
																								if (wasActive) sidebar.setOpen(false);
																								else sidebar.setOpen(true);
																							},
																							children: ($$renderer) => {
																								Icon($$renderer, {
																									icon: item.icon,
																									class: "size-5"
																								});
																							},
																							$$slots: { default: true }
																						});
																						$$renderer.push("<!--]-->");
																					} else {
																						$$renderer.push("<!--[!-->");
																						$$renderer.push("<!--]-->");
																					}
																				},
																				$$slots: { default: true }
																			});
																			$$renderer.push("<!--]-->");
																		} else {
																			$$renderer.push("<!--[!-->");
																			$$renderer.push("<!--]-->");
																		}
																	}
																	$$renderer.push(`<!--]-->`);
																},
																$$slots: { default: true }
															});
															$$renderer.push("<!--]-->");
														} else {
															$$renderer.push("<!--[!-->");
															$$renderer.push("<!--]-->");
														}
													},
													$$slots: { default: true }
												});
												$$renderer.push("<!--]-->");
											} else {
												$$renderer.push("<!--[!-->");
												$$renderer.push("<!--]-->");
											}
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
							},
							$$slots: { default: true }
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
					$$renderer.push(` `);
					if (Sidebar_footer) {
						$$renderer.push("<!--[-->");
						Sidebar_footer($$renderer, {});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
	});
}
//#endregion
//#region src/lib/stores/create-query.svelte.ts
function createQuery(fetcher, initial) {
	let data = initial;
	let loading = false;
	let error = null;
	async function refresh() {
		loading = true;
		error = null;
		try {
			data = await fetcher();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}
	return {
		get data() {
			return data;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		refresh
	};
}
//#endregion
//#region src/lib/components/SidebarSessionList.svelte
function SidebarSessionList($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		const sessions = createQuery(() => AgentService.listSessions(), store_get($$store_subs ??= {}, "$page", page).data.sessions ?? []);
		function timeAgo(iso, now) {
			const diff = now - new Date(iso).getTime();
			const mins = Math.floor(diff / 6e4);
			if (mins < 1) return "now";
			if (mins < 60) return `${mins}m ago`;
			const hrs = Math.floor(mins / 60);
			if (hrs < 24) return `${hrs}h ago`;
			return `${Math.floor(hrs / 24)}d ago`;
		}
		let sessionsWithTime = derived(() => sessions.data.map((s) => ({
			...s,
			time: timeAgo(s.createdAt, Date.now())
		})));
		if (Sidebar_header) {
			$$renderer.push("<!--[-->");
			Sidebar_header($$renderer, {
				class: "gap-3.5 border-b px-4 py-3",
				children: ($$renderer) => {
					$$renderer.push(`<div class="flex w-full items-center gap-3"><div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20">`);
					Icon($$renderer, {
						icon: e7,
						class: "size-4 text-primary"
					});
					$$renderer.push(`<!----></div> <span class="text-sm font-medium">Chat</span> `);
					Button($$renderer, {
						size: "icon-xs",
						class: "ml-auto",
						onclick: () => goto(),
						children: ($$renderer) => {
							Icon($$renderer, { icon: FCr });
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----></div> `);
					if (Sidebar_input) {
						$$renderer.push("<!--[-->");
						Sidebar_input($$renderer, { placeholder: "Search sessions..." });
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		$$renderer.push(` `);
		if (Sidebar_content) {
			$$renderer.push("<!--[-->");
			Sidebar_content($$renderer, {
				children: ($$renderer) => {
					if (Sidebar_group) {
						$$renderer.push("<!--[-->");
						Sidebar_group($$renderer, {
							class: "px-0",
							children: ($$renderer) => {
								if (Sidebar_group_content) {
									$$renderer.push("<!--[-->");
									Sidebar_group_content($$renderer, {
										children: ($$renderer) => {
											if (sessions.loading && sessions.data.length === 0) {
												$$renderer.push("<!--[0-->");
												Icon($$renderer, {
													icon: p1,
													class: "size-4 text-primary"
												});
											} else {
												$$renderer.push("<!--[-1-->");
												$$renderer.push(`<!--[-->`);
												const each_array = ensure_array_like(sessionsWithTime());
												for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
													let item = each_array[$$index];
													$$renderer.push(`<a${attr("href", `/dashboard/${stringify(item.sessionId)}`)}${attr_class("flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-all duration-150 last:border-b-0 hover:brightness-110 svelte-1fphcqs", void 0, { "active-session": store_get($$store_subs ??= {}, "$page", page).params.sessionId === item.sessionId })} style="border-color: oklch(0.5 0.08 185 / 0.12); background: transparent;"><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><span class="truncate text-sm font-medium">${escape_html(item.preview)}</span> <span class="shrink-0 text-[10px]" style="color: oklch(0.5 0.03 170)">${escape_html(item.time)}</span></div> <p class="mt-0.5 truncate text-xs" style="color: oklch(0.5 0.03 170)">${escape_html(item.preview)}</p></div></a>`);
												}
												$$renderer.push(`<!--]-->`);
											}
											$$renderer.push(`<!--]-->`);
										},
										$$slots: { default: true }
									});
									$$renderer.push("<!--]-->");
								} else {
									$$renderer.push("<!--[!-->");
									$$renderer.push("<!--]-->");
								}
							},
							$$slots: { default: true }
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/shared/cached-query.svelte.ts
function storage(p) {
	if (typeof localStorage === "undefined") return;
	if (p === "local") return localStorage;
	if (p === "session") return sessionStorage;
}
function loadFromCache(key, p) {
	const s = storage(p);
	if (!s) return;
	try {
		const raw = s.getItem("cq:" + key);
		if (!raw) return;
		const { data, expires } = JSON.parse(raw);
		if (expires && Date.now() > expires) {
			s.removeItem("cq:" + key);
			return;
		}
		return data;
	} catch {
		return;
	}
}
function saveToCache(key, data, p, ttl) {
	const s = storage(p);
	if (!s) return;
	try {
		const expires = ttl ? Date.now() + ttl : 0;
		s.setItem("cq:" + key, JSON.stringify({
			data,
			expires
		}));
	} catch {}
}
var CachedQueryInstance = class {
	key;
	fetcher;
	persistence;
	ttl;
	data;
	loading = true;
	refreshing = false;
	error = null;
	initialized = false;
	constructor(key, fetcher, persistence, ttl) {
		this.key = key;
		this.fetcher = fetcher;
		this.persistence = persistence;
		this.ttl = ttl;
	}
	async refresh() {
		if (!this.initialized) this.initialized = true;
		this.refreshing = true;
		try {
			const result = await this.fetcher();
			this.data = result;
			this.error = null;
			saveToCache(this.key, result, this.persistence, this.ttl);
		} catch (err) {
			this.error = err instanceof Error ? err.message : String(err);
		} finally {
			this.loading = false;
			this.refreshing = false;
		}
	}
};
var registry = /* @__PURE__ */ new Map();
function createCachedQuery(key, fetcher, options) {
	const existing = registry.get(key);
	if (existing) return existing;
	const persistence = options?.persistence ?? "none";
	const ttl = options?.ttl ?? 0;
	const cached = loadFromCache(key, persistence);
	const instance = new CachedQueryInstance(key, fetcher, persistence, ttl);
	if (cached !== void 0) {
		instance.data = cached;
		instance.loading = false;
	}
	registry.set(key, instance);
	queueMicrotask(() => instance.refresh());
	return instance;
}
//#endregion
//#region src/lib/components/ui/switch/switch.svelte
function Switch($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, checked = false, size = "default", $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Switch$1) {
				$$renderer.push("<!--[-->");
				Switch$1($$renderer, spread_props([
					{
						"data-slot": "switch",
						"data-size": size,
						class: cn("data-checked:bg-primary data-unchecked:bg-input/90 data-checked:border-primary focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 shrink-0 rounded-full border-2 focus-visible:ring-3 aria-invalid:ring-3 data-unchecked:border-transparent data-[size=default]:h-5 data-[size=default]:w-11 data-[size=sm]:h-4 data-[size=sm]:w-7 peer group/switch relative inline-flex items-center transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50", className)
					},
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						},
						get checked() {
							return checked;
						},
						set checked($$value) {
							checked = $$value;
							$$settled = false;
						},
						children: ($$renderer) => {
							if (Switch_thumb) {
								$$renderer.push("<!--[-->");
								Switch_thumb($$renderer, {
									"data-slot": "switch-thumb",
									class: "bg-background dark:data-unchecked:bg-foreground dark:data-checked:bg-primary-foreground rounded-full shadow-sm not-dark:bg-clip-padding group-data-[size=default]/switch:h-4 group-data-[size=default]/switch:w-6 group-data-[size=sm]/switch:h-3 group-data-[size=sm]/switch:w-4 data-checked:translate-x-[calc(100%-8px)] data-unchecked:translate-x-0 pointer-events-none block ring-0 transition-transform rtl:data-[state=checked]:translate-x-[calc(-100%)]"
								});
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, {
			ref,
			checked
		});
	});
}
//#endregion
//#region src/lib/components/ui/collapsible/collapsible.svelte
function Collapsible($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, open = false, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Collapsible$1) {
				$$renderer.push("<!--[-->");
				Collapsible$1($$renderer, spread_props([
					{ "data-slot": "collapsible" },
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						},
						get open() {
							return open;
						},
						set open($$value) {
							open = $$value;
							$$settled = false;
						}
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, {
			ref,
			open
		});
	});
}
//#endregion
//#region src/lib/components/ui/collapsible/collapsible-trigger.svelte
function Collapsible_trigger($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Collapsible_trigger$1) {
				$$renderer.push("<!--[-->");
				Collapsible_trigger$1($$renderer, spread_props([
					{ "data-slot": "collapsible-trigger" },
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						}
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/collapsible/collapsible-content.svelte
function Collapsible_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Collapsible_content$1) {
				$$renderer.push("<!--[-->");
				Collapsible_content$1($$renderer, spread_props([
					{
						"data-slot": "collapsible-content",
						class: cn("overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down", className)
					},
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						}
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/select/select.svelte
function Select($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open = false, value = void 0, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Select$1) {
				$$renderer.push("<!--[-->");
				Select$1($$renderer, spread_props([restProps, {
					get open() {
						return open;
					},
					set open($$value) {
						open = $$value;
						$$settled = false;
					},
					get value() {
						return value;
					},
					set value($$value) {
						value = $$value;
						$$settled = false;
					}
				}]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, {
			open,
			value
		});
	});
}
//#endregion
//#region src/lib/components/ui/select/select-item.svelte
function Select_item($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, value, label, children: childrenProp, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			{
				function children($$renderer, { selected, highlighted }) {
					$$renderer.push(`<span class="absolute end-2 flex size-3.5 items-center justify-center">`);
					if (selected) {
						$$renderer.push("<!--[0-->");
						Check_line($$renderer, { class: "cn-select-item-indicator-icon" });
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></span> <span class="flex flex-1 shrink-0 gap-2 whitespace-nowrap">`);
					if (childrenProp) {
						$$renderer.push("<!--[0-->");
						childrenProp($$renderer, {
							selected,
							highlighted
						});
						$$renderer.push(`<!---->`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`${escape_html(label || value)}`);
					}
					$$renderer.push(`<!--]--></span>`);
				}
				if (Select_item$1) {
					$$renderer.push("<!--[-->");
					Select_item$1($$renderer, spread_props([
						{
							value,
							"data-slot": "select-item",
							class: cn("relative flex w-full cursor-default items-center gap-2.5 rounded-2xl py-2 pr-8 pl-3 text-sm font-medium outline-hidden select-none focus:bg-accent focus:bg-accent focus:text-accent-foreground focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2", className)
						},
						restProps,
						{
							get ref() {
								return ref;
							},
							set ref($$value) {
								ref = $$value;
								$$settled = false;
							},
							children,
							$$slots: { default: true }
						}
					]));
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/select/select-portal.svelte
function Select_portal($$renderer, $$props) {
	let { $$slots, $$events, ...restProps } = $$props;
	if (Portal) {
		$$renderer.push("<!--[-->");
		Portal($$renderer, spread_props([restProps]));
		$$renderer.push("<!--]-->");
	} else {
		$$renderer.push("<!--[!-->");
		$$renderer.push("<!--]-->");
	}
}
//#endregion
//#region node_modules/.pnpm/remixicon-svelte@0.0.5_svelte@5.56.1/node_modules/remixicon-svelte/dist/icons/arrow-up-s-line.svelte
function Arrow_up_s_line($$renderer, $$props) {
	let { fill = "currentColor", class: className, $$slots, $$events, ...restProps } = $$props;
	$$renderer.push(`<svg${attributes({
		xmlns: "http://www.w3.org/2000/svg",
		viewBox: "0 0 24 24",
		fill,
		class: `remixicon ri-arrow-up-s-line ${stringify(className)}`,
		...restProps
	}, void 0, void 0, void 0, 3)}><path d="M11.9999 10.8284L7.0502 15.7782L5.63599 14.364L11.9999 8L18.3639 14.364L16.9497 15.7782L11.9999 10.8284Z"></path></svg>`);
}
//#endregion
//#region src/lib/components/ui/select/select-scroll-up-button.svelte
function Select_scroll_up_button($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Select_scroll_up_button$1) {
				$$renderer.push("<!--[-->");
				Select_scroll_up_button$1($$renderer, spread_props([
					{
						"data-slot": "select-scroll-up-button",
						class: cn("top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4", className)
					},
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						},
						children: ($$renderer) => {
							Arrow_up_s_line($$renderer, {});
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region node_modules/.pnpm/remixicon-svelte@0.0.5_svelte@5.56.1/node_modules/remixicon-svelte/dist/icons/arrow-down-s-line.svelte
function Arrow_down_s_line($$renderer, $$props) {
	let { fill = "currentColor", class: className, $$slots, $$events, ...restProps } = $$props;
	$$renderer.push(`<svg${attributes({
		xmlns: "http://www.w3.org/2000/svg",
		viewBox: "0 0 24 24",
		fill,
		class: `remixicon ri-arrow-down-s-line ${stringify(className)}`,
		...restProps
	}, void 0, void 0, void 0, 3)}><path d="M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z"></path></svg>`);
}
//#endregion
//#region src/lib/components/ui/select/select-scroll-down-button.svelte
function Select_scroll_down_button($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Select_scroll_down_button$1) {
				$$renderer.push("<!--[-->");
				Select_scroll_down_button$1($$renderer, spread_props([
					{
						"data-slot": "select-scroll-down-button",
						class: cn("bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4", className)
					},
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						},
						children: ($$renderer) => {
							Arrow_down_s_line($$renderer, {});
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/select/select-content.svelte
function Select_content($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, sideOffset = 4, portalProps, children, preventScroll = true, $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			Select_portal($$renderer, spread_props([portalProps, {
				children: ($$renderer) => {
					if (Select_content$1) {
						$$renderer.push("<!--[-->");
						Select_content$1($$renderer, spread_props([
							{
								sideOffset,
								preventScroll,
								"data-slot": "select-content",
								class: cn("relative isolate z-50 min-w-36 overflow-x-hidden overflow-y-auto rounded-3xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className)
							},
							restProps,
							{
								get ref() {
									return ref;
								},
								set ref($$value) {
									ref = $$value;
									$$settled = false;
								},
								children: ($$renderer) => {
									Select_scroll_up_button($$renderer, {});
									$$renderer.push(`<!----> `);
									if (Select_viewport) {
										$$renderer.push("<!--[-->");
										Select_viewport($$renderer, {
											class: cn("h-(--bits-select-anchor-height) w-full min-w-(--bits-select-anchor-width) scroll-my-1"),
											children: ($$renderer) => {
												children?.($$renderer);
												$$renderer.push(`<!---->`);
											},
											$$slots: { default: true }
										});
										$$renderer.push("<!--]-->");
									} else {
										$$renderer.push("<!--[!-->");
										$$renderer.push("<!--]-->");
									}
									$$renderer.push(` `);
									Select_scroll_down_button($$renderer, {});
									$$renderer.push(`<!---->`);
								},
								$$slots: { default: true }
							}
						]));
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			}]));
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/ui/select/select-trigger.svelte
function Select_trigger($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, class: className, children, size = "default", $$slots, $$events, ...restProps } = $$props;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Select_trigger$1) {
				$$renderer.push("<!--[-->");
				Select_trigger$1($$renderer, spread_props([
					{
						"data-slot": "select-trigger",
						"data-size": size,
						class: cn("flex w-fit items-center justify-between gap-1.5 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className)
					},
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						},
						children: ($$renderer) => {
							children?.($$renderer);
							$$renderer.push(`<!----> `);
							Arrow_down_s_line($$renderer, { class: "pointer-events-none size-4 text-muted-foreground" });
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/lib/components/SidebarProvidersList.svelte
function SidebarProvidersList($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const providerInfoQuery = createCachedQuery("providerInfo", () => AgentService.getProvidersInfo(), { persistence: "local" });
		const configuredQuery = createCachedQuery("configuredProviders", () => AgentService.getConfiguredProviders(), { persistence: "local" });
		const availableProviders = derived(() => providerInfoQuery.data);
		const loading = derived(() => providerInfoQuery.loading && configuredQuery.loading);
		let configuredProviders = {};
		let apiKeys = {};
		let saving = {};
		let saved = {};
		let searchQuery = "";
		let showDropdown = false;
		let openCollapsibles = {};
		let addDialogOpen = false;
		let newProviderName = "";
		let newProviderBaseUrl = "";
		let newProviderApiKey = "";
		let newProviderApiType = "openai-completions";
		let newProviderModels = "";
		let newProviderSaving = false;
		const filteredAvailable = derived(() => {
			if (!searchQuery.trim()) return [];
			const q = searchQuery.toLowerCase();
			return availableProviders().filter((p) => p.id.toLowerCase().includes(q) || p.models.some((m) => m.toLowerCase().includes(q)));
		});
		const configuredList = derived(() => {
			return Object.entries(configuredProviders).sort(([a], [b]) => a.localeCompare(b)).map(([id, cfg]) => ({
				id,
				enabled: cfg.enabled,
				hasKey: cfg.hasKey,
				baseUrl: cfg.baseUrl,
				info: availableProviders().find((p) => p.id === id) ?? {
					id,
					envKeys: [],
					models: [],
					isCustom: !!cfg.baseUrl
				}
			}));
		});
		function isConfigured(providerId) {
			return providerId in configuredProviders;
		}
		/** Add provider to list locally only. DB write happens when key is saved. */
		function addProvider(providerId) {
			configuredProviders[providerId] = {
				enabled: true,
				hasKey: false
			};
			searchQuery = "";
			showDropdown = false;
		}
		async function toggleProvider(providerId, enabled) {
			configuredProviders[providerId] = {
				...configuredProviders[providerId],
				enabled
			};
			toggleProviderEnabled(providerId, enabled);
			if (configuredProviders[providerId]?.hasKey || configuredProviders[providerId]?.baseUrl) await AgentService.toggleProvider(providerId, enabled);
		}
		async function saveKey(providerId) {
			const key = apiKeys[providerId]?.trim() || "";
			if (!key && configuredProviders[providerId]?.hasKey) return;
			saving[providerId] = true;
			try {
				await AgentService.saveProviderKey(providerId, key);
				saved[providerId] = true;
				configuredProviders[providerId] = {
					...configuredProviders[providerId],
					enabled: configuredProviders[providerId]?.enabled ?? true,
					hasKey: !!key
				};
				if (configuredProviders[providerId]?.enabled && !!key) toggleProviderEnabled(providerId, true);
				apiKeys[providerId] = "";
				setTimeout(() => {
					saved[providerId] = false;
				}, 2e3);
			} catch (err) {
				console.error("Failed to save API key:", err);
			} finally {
				saving[providerId] = false;
			}
		}
		async function addCustomProvider() {
			if (!newProviderName.trim() || !newProviderBaseUrl.trim()) return;
			newProviderSaving = true;
			try {
				const models = newProviderModels.split(",").map((m) => m.trim()).filter(Boolean);
				await AgentService.saveCustomProvider(newProviderName.trim(), newProviderApiKey, newProviderBaseUrl.trim(), newProviderApiType, models);
				addDialogOpen = false;
				resetForm();
				await Promise.all([providerInfoQuery.refresh(), configuredQuery.refresh()]);
			} catch (err) {
				console.error("Failed to add provider:", err);
			} finally {
				newProviderSaving = false;
			}
		}
		function resetForm() {
			newProviderName = "";
			newProviderBaseUrl = "";
			newProviderApiKey = "";
			newProviderApiType = "openai-completions";
			newProviderModels = "";
		}
		function formatName(name) {
			return name.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
		}
		function statusColor(item) {
			if (item.hasKey && item.enabled) return "bg-primary";
			if (item.hasKey && !item.enabled) return "bg-muted-foreground/40";
			return "bg-muted";
		}
		function statusTitle(item) {
			if (!item.hasKey) return "No API key configured";
			if (!item.enabled) return "Disabled";
			return "Active";
		}
		function onSearchBlur(e) {
			const related = e.relatedTarget;
			const dropdownEl = e.currentTarget.closest(".relative")?.querySelector("[data-dropdown]");
			if (dropdownEl && related && dropdownEl.contains(related)) return;
			showDropdown = false;
		}
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Sidebar_header) {
				$$renderer.push("<!--[-->");
				Sidebar_header($$renderer, {
					class: "gap-3.5 border-b px-4 py-3",
					children: ($$renderer) => {
						$$renderer.push(`<div class="flex w-full items-center gap-3"><div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20">`);
						Icon($$renderer, {
							icon: Lhr,
							class: "size-4 text-primary"
						});
						$$renderer.push(`<!----></div> <span class="text-sm font-medium">LLM Providers</span></div>`);
					},
					$$slots: { default: true }
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
			$$renderer.push(` `);
			if (Sidebar_content) {
				$$renderer.push("<!--[-->");
				Sidebar_content($$renderer, {
					class: "p-4",
					children: ($$renderer) => {
						if (loading()) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<div class="flex h-32 items-center justify-center text-xs text-muted-foreground">Loading providers...</div>`);
						} else {
							$$renderer.push("<!--[-1-->");
							$$renderer.push(`<div class="flex flex-col gap-3"><div class="relative"><div class="relative">`);
							Icon($$renderer, {
								icon: dcr,
								class: "absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/60"
							});
							$$renderer.push(`<!----> `);
							Input($$renderer, {
								type: "text",
								placeholder: "Search providers or models...",
								onfocus: () => showDropdown = true,
								onblur: onSearchBlur,
								class: "pl-8 text-xs",
								get value() {
									return searchQuery;
								},
								set value($$value) {
									searchQuery = $$value;
									$$settled = false;
								}
							});
							$$renderer.push(`<!----></div> `);
							if (showDropdown && searchQuery.trim()) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<div class="absolute z-10 mt-1 w-full rounded-xl border border-border/40 bg-popover p-1 shadow-lg origin-top" data-dropdown=""><div class="no-scrollbar max-h-48 overflow-y-auto">`);
								if (filteredAvailable().length > 0) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`<!--[-->`);
									const each_array = ensure_array_like(filteredAvailable());
									for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
										let p = each_array[$$index];
										$$renderer.push(`<div class="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent/50"><div class="flex min-w-0 flex-col"><span class="truncate text-xs font-medium text-foreground">${escape_html(formatName(p.id))}</span> <span class="truncate font-mono text-[10px] text-muted-foreground">${escape_html(p.id)} · ${escape_html(p.models.length)} model${escape_html(p.models.length === 1 ? "" : "s")}</span></div> `);
										if (isConfigured(p.id)) {
											$$renderer.push("<!--[0-->");
											$$renderer.push(`<span class="shrink-0 text-[10px] text-muted-foreground">Added</span>`);
										} else {
											$$renderer.push("<!--[-1-->");
											Button($$renderer, {
												size: "sm",
												class: "h-6 shrink-0 px-2.5 text-[10px] font-medium",
												onclick: () => addProvider(p.id),
												children: ($$renderer) => {
													$$renderer.push(`<!---->Add`);
												},
												$$slots: { default: true }
											});
										}
										$$renderer.push(`<!--]--></div>`);
									}
									$$renderer.push(`<!--]-->`);
								} else {
									$$renderer.push("<!--[-1-->");
									$$renderer.push(`<div class="px-3 py-4 text-center text-[10px] text-muted-foreground">No providers match "${escape_html(searchQuery)}"</div>`);
								}
								$$renderer.push(`<!--]--></div> <div class="border-t border-border/20 px-1 pt-1"><button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">`);
								Icon($$renderer, {
									icon: FCr,
									class: "size-3.5 shrink-0"
								});
								$$renderer.push(`<!----> Add custom provider...</button></div></div>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--></div> `);
							if (Dialog) {
								$$renderer.push("<!--[-->");
								Dialog($$renderer, {
									get open() {
										return addDialogOpen;
									},
									set open($$value) {
										addDialogOpen = $$value;
										$$settled = false;
									},
									children: ($$renderer) => {
										if (Dialog_content) {
											$$renderer.push("<!--[-->");
											Dialog_content($$renderer, {
												class: "sm:max-w-md",
												children: ($$renderer) => {
													if (Dialog_header) {
														$$renderer.push("<!--[-->");
														Dialog_header($$renderer, {
															children: ($$renderer) => {
																if (Dialog_title) {
																	$$renderer.push("<!--[-->");
																	Dialog_title($$renderer, {
																		children: ($$renderer) => {
																			$$renderer.push(`<!---->Add Custom Provider`);
																		},
																		$$slots: { default: true }
																	});
																	$$renderer.push("<!--]-->");
																} else {
																	$$renderer.push("<!--[!-->");
																	$$renderer.push("<!--]-->");
																}
																$$renderer.push(` `);
																if (Dialog_description) {
																	$$renderer.push("<!--[-->");
																	Dialog_description($$renderer, {
																		children: ($$renderer) => {
																			$$renderer.push(`<!---->Configure a custom LLM provider with its own API endpoint and models.`);
																		},
																		$$slots: { default: true }
																	});
																	$$renderer.push("<!--]-->");
																} else {
																	$$renderer.push("<!--[!-->");
																	$$renderer.push("<!--]-->");
																}
															},
															$$slots: { default: true }
														});
														$$renderer.push("<!--]-->");
													} else {
														$$renderer.push("<!--[!-->");
														$$renderer.push("<!--]-->");
													}
													$$renderer.push(` <div class="flex flex-col gap-3 py-4">`);
													Input($$renderer, {
														type: "text",
														placeholder: "Provider name (e.g. my-provider)",
														get value() {
															return newProviderName;
														},
														set value($$value) {
															newProviderName = $$value;
															$$settled = false;
														}
													});
													$$renderer.push(`<!----> `);
													Input($$renderer, {
														type: "text",
														placeholder: "Base URL (e.g. https://api.example.com)",
														get value() {
															return newProviderBaseUrl;
														},
														set value($$value) {
															newProviderBaseUrl = $$value;
															$$settled = false;
														}
													});
													$$renderer.push(`<!----> `);
													Input($$renderer, {
														type: "password",
														placeholder: "API Key (optional)",
														get value() {
															return newProviderApiKey;
														},
														set value($$value) {
															newProviderApiKey = $$value;
															$$settled = false;
														}
													});
													$$renderer.push(`<!----> `);
													if (Select) {
														$$renderer.push("<!--[-->");
														Select($$renderer, {
															type: "single",
															value: newProviderApiType,
															onValueChange: (v) => newProviderApiType = v,
															children: ($$renderer) => {
																if (Select_trigger) {
																	$$renderer.push("<!--[-->");
																	Select_trigger($$renderer, {
																		class: "w-full text-xs",
																		children: ($$renderer) => {
																			$$renderer.push(`<!---->${escape_html(newProviderApiType)}`);
																		},
																		$$slots: { default: true }
																	});
																	$$renderer.push("<!--]-->");
																} else {
																	$$renderer.push("<!--[!-->");
																	$$renderer.push("<!--]-->");
																}
																$$renderer.push(` `);
																if (Select_content) {
																	$$renderer.push("<!--[-->");
																	Select_content($$renderer, {
																		children: ($$renderer) => {
																			if (Select_item) {
																				$$renderer.push("<!--[-->");
																				Select_item($$renderer, {
																					value: "openai-completions",
																					children: ($$renderer) => {
																						$$renderer.push(`<!---->OpenAI Completions`);
																					},
																					$$slots: { default: true }
																				});
																				$$renderer.push("<!--]-->");
																			} else {
																				$$renderer.push("<!--[!-->");
																				$$renderer.push("<!--]-->");
																			}
																			$$renderer.push(` `);
																			if (Select_item) {
																				$$renderer.push("<!--[-->");
																				Select_item($$renderer, {
																					value: "openai-responses",
																					children: ($$renderer) => {
																						$$renderer.push(`<!---->OpenAI Responses`);
																					},
																					$$slots: { default: true }
																				});
																				$$renderer.push("<!--]-->");
																			} else {
																				$$renderer.push("<!--[!-->");
																				$$renderer.push("<!--]-->");
																			}
																			$$renderer.push(` `);
																			if (Select_item) {
																				$$renderer.push("<!--[-->");
																				Select_item($$renderer, {
																					value: "anthropic-messages",
																					children: ($$renderer) => {
																						$$renderer.push(`<!---->Anthropic Messages`);
																					},
																					$$slots: { default: true }
																				});
																				$$renderer.push("<!--]-->");
																			} else {
																				$$renderer.push("<!--[!-->");
																				$$renderer.push("<!--]-->");
																			}
																		},
																		$$slots: { default: true }
																	});
																	$$renderer.push("<!--]-->");
																} else {
																	$$renderer.push("<!--[!-->");
																	$$renderer.push("<!--]-->");
																}
															},
															$$slots: { default: true }
														});
														$$renderer.push("<!--]-->");
													} else {
														$$renderer.push("<!--[!-->");
														$$renderer.push("<!--]-->");
													}
													$$renderer.push(` `);
													Input($$renderer, {
														type: "text",
														placeholder: "Model IDs (comma-separated: gpt-4,claude-3)",
														get value() {
															return newProviderModels;
														},
														set value($$value) {
															newProviderModels = $$value;
															$$settled = false;
														}
													});
													$$renderer.push(`<!----></div> `);
													if (Dialog_footer) {
														$$renderer.push("<!--[-->");
														Dialog_footer($$renderer, {
															children: ($$renderer) => {
																Button($$renderer, {
																	size: "sm",
																	class: "h-8 text-xs",
																	onclick: addCustomProvider,
																	disabled: newProviderSaving || !newProviderName.trim() || !newProviderBaseUrl.trim(),
																	children: ($$renderer) => {
																		$$renderer.push(`<!---->${escape_html(newProviderSaving ? "Adding..." : "Add Provider")}`);
																	},
																	$$slots: { default: true }
																});
															},
															$$slots: { default: true }
														});
														$$renderer.push("<!--]-->");
													} else {
														$$renderer.push("<!--[!-->");
														$$renderer.push("<!--]-->");
													}
												},
												$$slots: { default: true }
											});
											$$renderer.push("<!--]-->");
										} else {
											$$renderer.push("<!--[!-->");
											$$renderer.push("<!--]-->");
										}
									},
									$$slots: { default: true }
								});
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
							$$renderer.push(` `);
							if (configuredList().length > 0) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<div class="flex flex-col gap-1"><!--[-->`);
								const each_array_1 = ensure_array_like(configuredList());
								for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
									let item = each_array_1[$$index_1];
									if (Collapsible) {
										$$renderer.push("<!--[-->");
										Collapsible($$renderer, {
											open: openCollapsibles[item.id] ?? false,
											onOpenChange: (v) => openCollapsibles[item.id] = v,
											class: "overflow-hidden rounded-xl border border-border/40 bg-card/20",
											children: ($$renderer) => {
												if (Collapsible_trigger) {
													$$renderer.push("<!--[-->");
													Collapsible_trigger($$renderer, {
														class: "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-accent/50 transition-colors outline-none",
														children: ($$renderer) => {
															$$renderer.push(`<div class="flex items-center gap-2 min-w-0"><span${attr_class(`size-1.5 shrink-0 rounded-full ${stringify(statusColor(item))}`)}${attr("title", statusTitle(item))}></span> <span class="truncate text-xs font-medium">${escape_html(formatName(item.id))}</span> <span class="shrink-0 font-mono text-[10px] text-muted-foreground">${escape_html(item.id)}</span></div> `);
															Icon($$renderer, {
																icon: Tn,
																class: "size-3 text-muted-foreground/60 transition-transform ui-open:rotate-180"
															});
															$$renderer.push(`<!---->`);
														},
														$$slots: { default: true }
													});
													$$renderer.push("<!--]-->");
												} else {
													$$renderer.push("<!--[!-->");
													$$renderer.push("<!--]-->");
												}
												$$renderer.push(` `);
												if (Collapsible_content) {
													$$renderer.push("<!--[-->");
													Collapsible_content($$renderer, {
														children: ($$renderer) => {
															$$renderer.push(`<div class="flex flex-col gap-2 px-3 pb-3 pt-1">`);
															Input($$renderer, {
																type: "password",
																placeholder: item.hasKey ? "Key saved — type to replace" : "Enter API key",
																class: "text-xs",
																get value() {
																	return apiKeys[item.id];
																},
																set value($$value) {
																	apiKeys[item.id] = $$value;
																	$$settled = false;
																}
															});
															$$renderer.push(`<!----> `);
															if (item.baseUrl) {
																$$renderer.push("<!--[0-->");
																$$renderer.push(`<div class="flex flex-col gap-1.5 rounded-lg bg-muted/30 px-2.5 py-2"><div class="flex items-center justify-between"><span class="text-[10px] text-muted-foreground">Base URL</span> <span class="max-w-[70%] truncate text-[10px] font-mono text-foreground/80">${escape_html(item.baseUrl)}</span></div> `);
																if (item.info.models.length > 0) {
																	$$renderer.push("<!--[0-->");
																	$$renderer.push(`<div class="flex items-center justify-between"><span class="text-[10px] text-muted-foreground">Models</span> <span class="max-w-[70%] truncate text-[10px] font-mono text-foreground/80">${escape_html(item.info.models.join(", "))}</span></div>`);
																} else $$renderer.push("<!--[-1-->");
																$$renderer.push(`<!--]--></div>`);
															} else $$renderer.push("<!--[-1-->");
															$$renderer.push(`<!--]--> <div class="flex items-center gap-3 pt-1"><div class="flex items-center gap-2">`);
															Switch($$renderer, {
																checked: item.enabled,
																onCheckedChange: (v) => toggleProvider(item.id, v)
															});
															$$renderer.push(`<!----> <span class="text-xs text-muted-foreground">${escape_html(item.enabled ? "Enabled" : "Disabled")}</span></div> <div class="flex-1"></div> `);
															if (item.baseUrl) {
																$$renderer.push("<!--[0-->");
																$$renderer.push(`<button type="button" class="flex items-center gap-1 text-[10px] text-muted-foreground/60 transition-colors hover:text-destructive">`);
																Icon($$renderer, {
																	icon: XA,
																	class: "size-3"
																});
																$$renderer.push(`<!----> Remove</button>`);
															} else $$renderer.push("<!--[-1-->");
															$$renderer.push(`<!--]--> `);
															Button($$renderer, {
																size: "sm",
																class: "h-7 min-w-15 px-3 text-[11px] font-medium",
																onclick: () => saveKey(item.id),
																disabled: saving[item.id],
																children: ($$renderer) => {
																	if (saving[item.id]) {
																		$$renderer.push("<!--[0-->");
																		$$renderer.push(`Saving...`);
																	} else {
																		$$renderer.push("<!--[-1-->");
																		$$renderer.push(`<div class="flex items-center gap-1">`);
																		if (saved[item.id]) {
																			$$renderer.push("<!--[0-->");
																			Icon($$renderer, {
																				icon: cH,
																				class: "size-3"
																			});
																			$$renderer.push(`<!----> Saved`);
																		} else {
																			$$renderer.push("<!--[-1-->");
																			Icon($$renderer, {
																				icon: Y1,
																				class: "size-3"
																			});
																			$$renderer.push(`<!----> Save`);
																		}
																		$$renderer.push(`<!--]--></div>`);
																	}
																	$$renderer.push(`<!--]-->`);
																},
																$$slots: { default: true }
															});
															$$renderer.push(`<!----></div></div>`);
														},
														$$slots: { default: true }
													});
													$$renderer.push("<!--]-->");
												} else {
													$$renderer.push("<!--[!-->");
													$$renderer.push("<!--]-->");
												}
											},
											$$slots: { default: true }
										});
										$$renderer.push("<!--]-->");
									} else {
										$$renderer.push("<!--[!-->");
										$$renderer.push("<!--]-->");
									}
								}
								$$renderer.push(`<!--]--></div>`);
							} else {
								$$renderer.push("<!--[-1-->");
								$$renderer.push(`<div class="py-6 text-center text-xs text-muted-foreground">No providers configured. Search above to add one.</div>`);
							}
							$$renderer.push(`<!--]--></div>`);
						}
						$$renderer.push(`<!--]-->`);
					},
					$$slots: { default: true }
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
	});
}
//#endregion
//#region src/lib/components/AppSidebar.svelte
function AppSidebar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref = null, $$slots, $$events, ...restProps } = $$props;
		const nav = useNavState();
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Sidebar) {
				$$renderer.push("<!--[-->");
				Sidebar($$renderer, spread_props([
					{
						collapsible: "icon",
						class: "overflow-hidden *:data-[sidebar=sidebar]:flex-row"
					},
					restProps,
					{
						get ref() {
							return ref;
						},
						set ref($$value) {
							ref = $$value;
							$$settled = false;
						},
						children: ($$renderer) => {
							SidebarNav($$renderer);
							$$renderer.push(`<!----> `);
							if (Sidebar) {
								$$renderer.push("<!--[-->");
								Sidebar($$renderer, {
									collapsible: "none",
									class: "hidden flex-1 md:flex [position:relative]",
									children: ($$renderer) => {
										if (nav.current === "sessions") {
											$$renderer.push("<!--[0-->");
											$$renderer.push(`<div class="absolute inset-0">`);
											SidebarSessionList($$renderer);
											$$renderer.push(`<!----></div>`);
										} else $$renderer.push("<!--[-1-->");
										$$renderer.push(`<!--]--> `);
										if (nav.current === "providers") {
											$$renderer.push("<!--[0-->");
											$$renderer.push(`<div class="absolute inset-0">`);
											SidebarProvidersList($$renderer);
											$$renderer.push(`<!----></div>`);
										} else $$renderer.push("<!--[-1-->");
										$$renderer.push(`<!--]-->`);
									},
									$$slots: { default: true }
								});
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
						},
						$$slots: { default: true }
					}
				]));
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, { ref });
	});
}
//#endregion
//#region src/routes/dashboard/+layout.svelte
function _layout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { children } = $$props;
		let sidebarOpen = useNavState().current !== null;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (Sidebar_provider) {
				$$renderer.push("<!--[-->");
				Sidebar_provider($$renderer, {
					style: "--sidebar-width: 350px;",
					get open() {
						return sidebarOpen;
					},
					set open($$value) {
						sidebarOpen = $$value;
						$$settled = false;
					},
					children: ($$renderer) => {
						AppSidebar($$renderer, {});
						$$renderer.push(`<!----> `);
						if (Sidebar_inset) {
							$$renderer.push("<!--[-->");
							Sidebar_inset($$renderer, {
								children: ($$renderer) => {
									children?.($$renderer);
									$$renderer.push(`<!---->`);
								},
								$$slots: { default: true }
							});
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
					},
					$$slots: { default: true }
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
	});
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-DR8YK-zF.js.map
