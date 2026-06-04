import { remult } from 'remult';
import { FlueSession } from './entities/FlueSession';
// fallow-ignore-file unused-class-member

interface SessionData {
	version: 4;
	entries: unknown[];
	leafId: string | null;
}

// Re-establish Remult server context for async operations.
// Without this, remult.repo() returns a client-side HTTP proxy.
async function withContext<T>(fn: () => Promise<T>): Promise<T> {
	const api = (globalThis as Record<string, unknown>).remultApi as {
		withRemult: (req: unknown, what: () => Promise<T>) => Promise<T>;
	} | undefined;
	if (api) {
		return api.withRemult(undefined, fn);
	}
	return fn();
}

export class FlueSessionStore {
	async save(id: string, data: { updatedAt: string }): Promise<void> {
		await withContext(async () => {
			const repo = remult.repo(FlueSession);
			const existing = await repo.findId(id);
			if (existing) {
				existing.data = JSON.stringify(data);
				existing.updatedAt = data.updatedAt;
				await repo.save(existing);
			} else {
				await repo.insert({
					id,
					data: JSON.stringify(data),
					updatedAt: data.updatedAt
				});
			}
		});
	}

	async load(id: string): Promise<SessionData | null> {
		return withContext(async () => {
			try {
				const repo = remult.repo(FlueSession);
				console.log('[FlueSessionStore] repo.findId called for', id, 'api present:', !!(globalThis as any).remultApi);
				const row = await repo.findId(id);
				if (!row) return null;
				return JSON.parse(row.data) as SessionData;
			} catch (e: any) {
				console.error('[FlueSessionStore] load error:', e?.message, e?.httpStatusCode);
				return null;
			}
		});
	}

	async delete(id: string): Promise<void> {
		await withContext(async () => {
			try {
				await remult.repo(FlueSession).delete(id);
			} catch {
				// ignore if already deleted
			}
		});
	}
}
