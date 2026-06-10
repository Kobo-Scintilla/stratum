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

// ── Cache (persisted to localStorage for instant reload) ──

interface CachedProviderInfo {
	id: string;
	envKeys: string[];
	models: string[];
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
	if (typeof localStorage === 'undefined') return fallback;
	try {
		const raw = localStorage.getItem('providers:' + key);
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
}

function saveCache(key: string, value: unknown) {
	if (typeof localStorage === 'undefined') return;
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
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem('providers:providerInfo');
		localStorage.removeItem('providers:configured');
	}
}
