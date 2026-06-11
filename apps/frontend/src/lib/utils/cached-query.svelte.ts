/**
 * Reactive cache-then-network query for Remult backend methods.
 *
 * Returns immediately from cache (memory then localStorage), refreshes in
 * background. The returned object is reactive via Svelte 5 $state — use its
 * properties directly in templates or $derived expressions.
 */
type Persistence = 'none' | 'local' | 'session';

export interface CachedQuery<T> {
	readonly data: T;
	readonly loading: boolean;
	readonly refreshing: boolean;
	readonly error: string | null;
	refresh(): Promise<void>;
}

function storage(p: Persistence): Storage | undefined {
	if (typeof localStorage === 'undefined') return;
	if (p === 'local') return localStorage;
	if (p === 'session') return sessionStorage;
}

function loadFromCache<T>(key: string, p: Persistence): T | undefined {
	const s = storage(p);
	if (!s) return;
	try {
		const raw = s.getItem('cq:' + key);
		if (!raw) return;
		const { data, expires } = JSON.parse(raw);
		if (expires && Date.now() > expires) {
			s.removeItem('cq:' + key);
			return;
		}
		return data as T;
	} catch {
		return;
	}
}

function saveToCache<T>(key: string, data: T, p: Persistence, ttl: number) {
	const s = storage(p);
	if (!s) return;
	try {
		const expires = ttl ? Date.now() + ttl : 0;
		s.setItem('cq:' + key, JSON.stringify({ data, expires }));
	} catch {
		/* quota */
	}
}

class CachedQueryInstance<T> implements CachedQuery<T> {
	data = $state<T>() as T;
	loading = $state(true);
	refreshing = $state(false);
	error = $state<string | null>(null);
	private initialized = false;

	constructor(
		private key: string,
		private fetcher: () => Promise<T>,
		private persistence: Persistence,
		private ttl: number
	) {}

	async refresh(): Promise<void> {
		if (!this.initialized) this.initialized = true;
		this.refreshing = true;
		try {
			const result = await this.fetcher();
			this.data = result;
			this.error = null;
			saveToCache(this.key, result, this.persistence, this.ttl);
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : String(err);
		} finally {
			this.loading = false;
			this.refreshing = false;
		}
	}
}

const registry = new Map<string, CachedQueryInstance<unknown>>();

export function createCachedQuery<T>(
	key: string,
	fetcher: () => Promise<T>,
	options?: { persistence?: Persistence; ttl?: number }
): CachedQuery<T> {
	const existing = registry.get(key);
	if (existing) return existing as CachedQuery<T>;

	const persistence = options?.persistence ?? 'none';
	const ttl = options?.ttl ?? 0;
	const cached = loadFromCache<T>(key, persistence);
	const instance = new CachedQueryInstance<T>(key, fetcher, persistence, ttl);

	if (cached !== undefined) {
		instance.data = cached;
		instance.loading = false;
	}

	registry.set(key, instance);
	if (typeof window !== 'undefined') queueMicrotask(() => instance.refresh());
	return instance;
}

export function clearCachedQuery(key: string) {
	registry.delete(key);
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem('cq:' + key);
	}
}
