import { f as setContext, g as getContext } from './dev-B7dMAZiC.js';
import { w as w8, L as Lhr } from './index.min-CZbVwdp3.js';

//#region node_modules/.pnpm/svelte-persisted-state@1.4.1_svelte@5.56.1/node_modules/svelte-persisted-state/dist/index.svelte.js
function getCookie(name) {
	const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
	return match ? decodeURIComponent(match[2]) : null;
}
function setCookie(name, value, options = {}) {
	const { expireDays = 365, maxAge, path = "/", domain, secure = false, sameSite = "Lax", httpOnly = false } = options;
	let cookieString = `${name}=${encodeURIComponent(value)}`;
	cookieString += `; path=${path}`;
	if (maxAge !== void 0) cookieString += `; max-age=${maxAge}`;
	else {
		const expires = new Date(Date.now() + expireDays * 864e5).toUTCString();
		cookieString += `; expires=${expires}`;
	}
	if (domain) cookieString += `; domain=${domain}`;
	if (secure) cookieString += `; secure`;
	cookieString += `; samesite=${sameSite}`;
	if (httpOnly) cookieString += `; httponly`;
	document.cookie = cookieString;
}
function getStorage(type, cookieOptions = {}) {
	if (type === "local") return {
		getItem: (k) => localStorage.getItem(k),
		setItem: (k, v) => localStorage.setItem(k, v)
	};
	if (type === "session") return {
		getItem: (k) => sessionStorage.getItem(k),
		setItem: (k, v) => sessionStorage.setItem(k, v)
	};
	return {
		getItem: getCookie,
		setItem: (k, v) => setCookie(k, v, cookieOptions)
	};
}
function persistedState(key, initialValue, options = {}) {
	const { storage = "local", serializer = JSON, syncTabs = true, cookieExpireDays, cookieOptions = {}, onWriteError = console.error, onParseError = console.error, beforeRead = (v) => v, beforeWrite = (v) => v } = options;
	const finalCookieOptions = {
		...cookieOptions,
		...cookieExpireDays !== void 0 && { expireDays: cookieExpireDays }
	};
	const storageArea = typeof window !== "undefined" && typeof document !== "undefined" ? getStorage(storage, finalCookieOptions) : null;
	let storedValue;
	try {
		const item = storageArea?.getItem(key);
		storedValue = item ? beforeRead(serializer.parse(item)) : initialValue;
	} catch (error) {
		onParseError(error);
		storedValue = initialValue;
	}
	let state = storedValue;
	storageArea?.getItem(key);
	if (syncTabs && typeof window !== "undefined" && storage === "local") window.addEventListener("storage", (event) => {
		if (event.key === key && event.storageArea === localStorage) try {
			state = beforeRead(event.newValue ? serializer.parse(event.newValue) : initialValue);
		} catch (error) {
			onParseError(error);
		}
	});
	return {
		/**
		* @deprecated Use current to align with Svelte conventions
		*/
		get value() {
			return state;
		},
		/**
		* @deprecated Use current to align with Svelte conventions
		*/
		set value(newValue) {
			state = newValue;
		},
		get current() {
			return state;
		},
		set current(newValue) {
			state = newValue;
		},
		reset() {
			state = initialValue;
		}
	};
}
//#endregion
//#region src/lib/stores/nav-state.svelte.ts
var navItems = [{
	id: "sessions",
	title: "Sessions",
	icon: w8
}, {
	id: "providers",
	title: "Providers",
	icon: Lhr
}];
var KEY = "nav-active-tab";
var CONTEXT_KEY = Symbol("nav-state");
/**
* Create nav state inside root layout.
* `ssrValue` comes from +layout.server.ts cookie read — prevents hydration flash.
*/
function createNavState(ssrValueOrFn) {
	const state = persistedState(KEY, typeof ssrValueOrFn === "function" ? ssrValueOrFn() : ssrValueOrFn, {
		storage: "local",
		syncTabs: true
	});
	const nav = {
		get current() {
			return state.current;
		},
		set current(v) {
			state.current = v;
		},
		toggle(id) {
			nav.current = nav.current === id ? null : id;
		},
		reset() {
			state.reset();
		}
	};
	setContext(CONTEXT_KEY, nav);
	return nav;
}
function useNavState() {
	return getContext(CONTEXT_KEY);
}

export { createNavState as c, navItems as n, useNavState as u };
//# sourceMappingURL=nav-state.svelte-CohoPdO3.js.map
