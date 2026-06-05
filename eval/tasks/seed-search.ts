// Seed: populate the IndexedContent Remult table with three specific
// chunks so the search-heavy/recall task has a findable answer.
//
// The model's prompt is: "what did the user say about the API rate limit?"
// Only one of the three chunks contains the rate-limit fact, and the
// answer ("100 requests per minute") is unique to that chunk.
//
// We insert via Remult (the same path the index() tool uses), which
// automatically populates the FTS5 virtual table. Idempotent: rows are
// matched by `source` + `chunkIndex` and re-inserts are skipped.
//
// Run: npx tsx eval/tasks/seed-search.ts

import { getIndexedRepo } from '../../src/lib/shared/entities/KnowledgeStore.js';
// Importing api.js as a side-effect bootstraps globalThis.remultApi and
// installs the FTS5 schema. We can't statically import it from a tool
// surface path because the tool layer itself lazy-imports it — keep the
// path identical so the same schema is in play.
import '../../src/lib/server/api.js';

const SESSION_ID = 'default';
const SOURCE = 'eval-seed:user-feedback';

const CHUNKS: Array<{ content: string; contentType: 'text' | 'decision' }> = [
	{
		content:
			'User feedback from onboarding interview #14 (2024-03-12): the new dashboard ' +
			'chart rendering is "noticeably faster than the old one", and the user ' +
			'specifically called out the export-to-PDF feature as the highlight of the week. ' +
			'No complaints about the navigation layout.',
		contentType: 'text'
	},
	{
		content:
			'User feedback from support thread #882 (2024-04-02): the customer asked the ' +
			'sales engineer to confirm the public API rate limit. The engineer responded ' +
			'that the published rate limit is 100 requests per minute per API key, with a ' +
			'burst allowance of 200 requests in any 10-second window. The customer ' +
			'acknowledged and proceeded with integration.',
		contentType: 'text'
	},
	{
		content:
			'Decision log 2024-05-18: the team agreed to deprecate the legacy v1 webhook ' +
			'system on 2024-09-01. Migration guide to be published by 2024-07-15. Owners: ' +
			'platform-team. No objections raised in the meeting.',
		contentType: 'decision'
	}
];

const api = (
	globalThis as { remultApi?: { withRemult: <T>(_req: undefined, fn: () => Promise<T>) => Promise<T> } }
).remultApi;

async function withCtx<T>(fn: () => Promise<T>): Promise<T> {
	if (api) return api.withRemult(undefined, fn);
	return fn();
}

const repo = getIndexedRepo();

let stored = 0;
let skipped = 0;
await withCtx(async () => {
	for (let i = 0; i < CHUNKS.length; i++) {
		const c = CHUNKS[i];
		const existing = await repo.findFirst({ source: SOURCE, chunkIndex: i });
		if (existing) {
			console.log(`[seed-search] chunk ${i}: already present (id=${existing.id}), skipping`);
			skipped++;
			continue;
		}
		const row = await repo.insert({
			source: SOURCE,
			content: c.content,
			contentType: c.contentType,
			scope: 'persistent',
			sessionId: SESSION_ID,
			chunkIndex: i,
			createdAt: new Date()
		});
		console.log(`[seed-search] chunk ${i}: stored id=${row.id}`);
		stored++;
	}
});

console.log(`[seed-search] done. stored=${stored} skipped=${skipped} total=${CHUNKS.length}`);
