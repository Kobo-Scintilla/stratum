import { Logger } from '$lib/logger.js';

const logger = new Logger('frontend:optimistic');

// ── Low-level primitive ──────────────────────────────────────────────────────

/**
 * Run a server mutation with automatic rollback on failure.
 *
 * Usage:
 * ```ts
 * const prev = state
 * state = newState
 * await optimistic(
 *   () => api.doThing(newState),
 *   () => { state = prev }
 * )
 * ```
 */
export async function optimistic<T>(
	server: () => Promise<T>,
	rollback: () => void,
	commit?: (result: T) => void
): Promise<T | null> {
	try {
		const r = await server();
		commit?.(r);
		return r;
	} catch (err) {
		logger.error('Optimistic mutation failed, rolling back.', err);
		rollback();
		return null;
	}
}

/** Generate a temp ID prefixed with `opt-`. */
export function tempId(): string {
	return `opt-${crypto.randomUUID()}`;
}

/** True if the id starts with `opt-` (temp/optimistic). */
export function isTemp(id: string): boolean {
	return id.startsWith('opt-');
}

// ── OptimisticField — scalar backed by server mutation ──────────────────────

/**
 * A single scalar value with optimistic updates and auto-rollback.
 *
 * ```svelte
 * <script lang="ts">
 *   let available = new OptimisticField(false, async (val) => {
 *     await ProviderController.toggleAvailability(val ? 'Available' : 'Offline')
 *   })
 * </script>
 *
 * <button onclick={() => available.set(!available.value)}>
 *   {available.value ? 'Online' : 'Offline'}
 * </button>
 * {#if available.pending}saving...{/if}
 * ```
 */
export class OptimisticField<T> {
	/** Current value (optimistic while pending, committed otherwise). */
	value: T = $state() as T;

	/** True while a mutation is in flight. */
	pending: boolean = $state(false);

	#committed: T;
	#sync: (value: T) => Promise<T | undefined>;

	constructor(initial: T, sync: (value: T) => Promise<T | undefined>) {
		this.value = initial;
		this.#committed = initial;
		this.#sync = sync;
	}

	/**
	 * Optimistically set `value` and sync with the server.
	 * Rolls back on failure. Returns server result or null.
	 */
	async set(value: T): Promise<T | undefined | null> {
		if (this.pending) return null;
		const prev = this.#committed;
		this.value = value;
		this.pending = true;

		try {
			const result = await this.#sync(value);
			this.#committed = result ?? value;
			this.value = this.#committed;
			this.pending = false;
			return result;
		} catch (err) {
			logger.error('OptimisticField mutation failed, rolling back.', err);
			this.value = prev;
			this.#committed = prev;
			this.pending = false;
			return null;
		}
	}
}

// ── OptimisticList — array backed by liveQuery + optimistic mutations ──────

/**
 * An array managed by a server liveQuery with optimistic add/remove.
 *
 * ```svelte
 * <script lang="ts">
 *   let messages = new OptimisticList<Message>()
 *
 *   $effect(() => {
 *     subscribeLiveQuery(Message, { where: ... }, (items) => {
 *       messages.setServer(items)
 *     }, () => messages.items)
 *   })
 * </script>
 *
 * {#each messages.items as msg (msg.id)}
 *   <p>{msg.content}</p>
 * {/each}
 * ```
 */
export class OptimisticList<T extends { id: string }> {
	/** Merged items: server items + pending optimistic items (deduped by id). */
	items: T[] = $state([]);

	#server: T[] = [];
	#optimistic: T[] = [];

	/** Feed the latest server-delivered items (from liveQuery callback). */
	setServer(items: T[]): void {
		this.#server = items;
		this.#sync();
	}

	/** Number of pending optimistic items. */
	get optimisticCount(): number {
		return this.#optimistic.length;
	}

	/**
	 * Add a single item optimistically.
	 * Returns a `finalize` function you MUST call after the server responds.
	 *
	 * ```ts
	 * const done = messages.add(item)
	 * try {
	 *   await api.mutate(...)
	 *   done('commit')
	 * } catch {
	 *   done('rollback')
	 * }
	 * ```
	 */
	add(item: T): (action: 'commit' | 'rollback') => void {
		this.#optimistic = [...this.#optimistic, item];
		this.#sync();
		return (_action: 'commit' | 'rollback') => {
			this.#removeOptimistic(item.id);
		};
	}

	/**
	 * Add optimistically AND fire a server mutation in one call.
	 * The item appears immediately. On success the optimistic copy is removed
	 * (real copy arrives via liveQuery). On failure the item is rolled back.
	 */
	async addOptimistic(
		item: T,
		sync: () => Promise<unknown>
	): Promise<unknown | null> {
		const done = this.add(item);
		try {
			const result = await sync();
			done('commit');
			return result;
		} catch (err) {
			logger.error('OptimisticList add failed, rolling back.', err);
			done('rollback');
			return null;
		}
	}

	/** Remove an item optimistically. Rolls back if server fails. */
	async removeOptimistic(
		id: string,
		sync: () => Promise<unknown>
	): Promise<unknown | null> {
		const removed =
			this.#optimistic.find((m) => m.id === id) ??
			this.#server.find((m) => m.id === id);
		if (!removed) return sync();
		this.#removeOptimistic(id);
		this.#sync();
		try {
			const result = await sync();
			return result;
		} catch (err) {
			logger.error('OptimisticList remove failed, rolling back.', err);
			this.#optimistic = [...this.#optimistic, removed];
			this.#sync();
			return null;
		}
	}

	// ── internals ──

	#removeOptimistic(id: string): void {
		this.#optimistic = this.#optimistic.filter((m) => m.id !== id);
	}

	#sync(): void {
		const serverIds = new Set(this.#server.map((m) => m.id));
		const pending = this.#optimistic.filter((m) => !serverIds.has(m.id));
		this.items = [...this.#server, ...pending];
	}
}
