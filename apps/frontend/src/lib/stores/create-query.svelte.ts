import { browser } from '$app/environment';

export interface QueryState<T> {
	readonly data: T;
	readonly loading: boolean;
	readonly error: string | null;
	refresh(): void;
}

/**
 * Universal reactive query wrapper.
 * Converts any async fetcher (BackendMethod, fetch, etc.) into a
 * Svelte 5 runes reactive object with loading/error states.
 *
 * Usage:
 *   let sessions = createQuery(() => AgentService.listSessions(), []);
 *   //      ^ { data: Session[], loading: boolean, error, refresh }
 */
export function createQuery<T>(
	fetcher: () => Promise<T>,
	initial: T,
	options?: { lazy?: boolean }
): QueryState<T> {
	let data = $state<T>(initial) as T;
	let loading = $state(browser && !options?.lazy);
	let error = $state<string | null>(null);

	if (browser && !options?.lazy) {
		queueMicrotask(() => refresh());
	}

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
