import { browser } from '$app/environment';
import type { Repository, FindOptions } from 'remult';

export interface LiveQueryState<R> {
	readonly data: R;
	readonly error: string | null;
	readonly loading: boolean;
}

/**
 * Universal Svelte 5 Rune wrapper for Remult liveQuery subscriptions.
 * Automatically handles subscriptions, updates, error states, and cleanup.
 *
 * Usage:
 *   const query = createLiveQuery(
 *     () => ({ repo: remult.repo(ChatMessage), options: { where: { sessionId } } }),
 *     { initial: data.messages }
 *   );
 */
export function createLiveQuery<T, R = T[]>(
	queryFn: () => { repo: Repository<T>; options?: FindOptions<T> } | null | undefined,
	options?: {
		initial?: R;
		reducer?: (info: { items: T[]; applyChanges: (prev: T[]) => T[] }, prev: R) => R;
	}
): LiveQueryState<R> {
	const initial = options?.initial ?? ([] as unknown as R);
	let data = $state<R>(initial);
	let error = $state<string | null>(null);
	let loading = $state(browser);

	if (browser) {
		$effect(() => {
			const query = queryFn();
			if (!query) {
				loading = false;
				return;
			}
			const { repo, options: findOpts } = query;
			loading = true;

			const unsubscribe = repo.liveQuery(findOpts).subscribe({
				next: (info) => {
					if (options?.reducer) {
						data = options.reducer(info, data);
					} else {
						data = info.items as unknown as R;
					}
					error = null;
					loading = false;
				},
				error: (err) => {
					error = err instanceof Error ? err.message : String(err);
					loading = false;
				}
			});

			return unsubscribe;
		});
	}

	return {
		get data() {
			return data;
		},
		get error() {
			return error;
		},
		get loading() {
			return loading;
		}
	};
}
