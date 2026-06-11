import { browser } from '$app/environment';
/** Shared state for provider enable/disable across sidebar and dashboard. */
let enabledProviders = $state<Set<string>>(new Set());

export function getEnabledProviders(): Set<string> {
	return enabledProviders;
}

export function setEnabledProviders(ids: Set<string>) {
	enabledProviders = ids;
}

export function toggleProviderEnabled(id: string, enabled: boolean) {
	const next = new Set(enabledProviders);
	if (enabled) {
		next.add(id);
	} else {
		next.delete(id);
	}
	enabledProviders = next;
}
export function activeProviderIds(
	configured: Array<{ id: string; enabled: boolean; hasKey: boolean }>
): Set<string> {
	return new Set(configured.filter((c) => c.enabled && c.hasKey).map((c) => c.id));
}

// ── Cache (persisted to localStorage for instant reload) ──

interface CachedProviderInfo {
	id: string;
	envKeys: string[];
	models: Array<{ id: string; contextWindow: number }>;
	isCustom: boolean;
}

interface CachedConfigured {
	id: string;
	enabled: boolean;
	hasKey: boolean;
	baseUrl?: string;
	apiType?: string;
	models?: string;
}

function loadCache<T>(key: string, fallback: T): T {
	if (!browser) return fallback;
	try {
		const raw = localStorage.getItem('providers:' + key);
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
}

function saveCache(key: string, value: unknown) {
	if (!browser) return;
	try {
		localStorage.setItem('providers:' + key, JSON.stringify(value));
	} catch {
		/* quota */
	}
}

let cachedProviderInfo = $state<CachedProviderInfo[]>(loadCache('providerInfo', []));
let cachedConfigured = $state<CachedConfigured[]>(loadCache('configured', []));

export function getCachedProviderInfo(): CachedProviderInfo[] {
	return cachedProviderInfo;
}

export function getCachedConfigured(): CachedConfigured[] {
	return cachedConfigured;
}

export function setProviderCache(
	providerInfo: CachedProviderInfo[],
	configured: CachedConfigured[]
) {
	cachedProviderInfo = providerInfo;
	cachedConfigured = configured;
	saveCache('providerInfo', providerInfo);
	saveCache('configured', configured);
}

export function clearProviderCache() {
	cachedProviderInfo = [];
	cachedConfigured = [];
	if (browser) {
		localStorage.removeItem('providers:providerInfo');
		localStorage.removeItem('providers:configured');
	}
}
