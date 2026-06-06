import { adaptTool, CompressParams } from './types';
import { headroom } from '../headroom';
import { getCompressedRepo } from '../../shared/entities/KnowledgeStore.js';

// DCP-style compress tool.
// The model calls this when it has completed a meaningful task.
// The system compresses the conversation span, stores it losslessly,
// and prunes verbatim content from active context.
//
// Pipeline:
//   1. Cheap in-memory dedup (ring of last 32 invocations keyed by topic+summary).
//   2. Persist a CompressedArtifact row (lossless, retrievable via search).
//   3. Best-effort Headroom call for token-savings accounting.
//      Headroom is a separate proxy; if it is unreachable we still persist
//      and the user's compress call succeeds.
// The SvelteKit server normally loads $lib/server/api, which sets
// globalThis.remultApi and runs schema creation. In CLI / test contexts
// (scripts, the test harness) that bootstrap never runs, so we lazy-import
// it on first use. The import is idempotent: re-registration is a no-op and
// the CREATE TABLE statements use IF NOT EXISTS.
async function ensureRemult(): Promise<void> {
	if (globalThis.remultApi) return;
	await import('../api.js');
}

// Wrap a remult operation in a request context when an api is installed.
// Without an explicit request cycle, repo.insert throws "remult object was
// requested outside of a valid request cycle".
function runInRemultContext<T>(fn: () => Promise<T>): Promise<T> {
	const api = globalThis.remultApi as { withRemult: <U>(req: undefined, what: () => Promise<U>) => Promise<U> } | undefined;
	if (api) return api.withRemult(undefined, fn);
	return fn();
}

const HEADROOM_MODEL = 'bifrost/b-opencodego/deepseek-v4-flash';
const SESSION_ID = 'default';
const RING_SIZE = 32;
// Rough estimate: each compressed block saves ~200 tokens vs the raw
// conversation it replaces. Matches the prior stub's contract.
const TOKENS_PER_BLOCK = 200;

type ContentBlock = { startId: string; endId: string; summary: string };

// FIFO ring of `${topic}:${summary}` keys for cheap DCP dedup.
const dedupRing: string[] = [];
const dedupSet = new Set<string>();

function rememberInvocation(key: string): void {
	if (dedupSet.has(key)) return;
	dedupSet.add(key);
	dedupRing.push(key);
	if (dedupRing.length > RING_SIZE) {
		const evicted = dedupRing.shift()!;
		dedupSet.delete(evicted);
	}
}

// Build an OpenAI-format messages array for Headroom. Headroom compresses
// the messages it receives; we hand it the summaries as user messages.
function buildMessages(blocks: ContentBlock[]): Array<{ role: 'user'; content: string }> {
	return blocks.map((b) => ({
		role: 'user' as const,
		content: `[${b.startId}..${b.endId}] ${b.summary}`
	}));
}
export const compressTool = adaptTool({
	name: 'compress',
	description: [
		'Signal that a task is complete. The system compresses the conversation span,',
		'stores it losslessly, and prunes verbatim content from active context.',
		'',
		'WHEN:',
		'- You have completed a meaningful unit of work (analysis, bug fix, feature implementation)',
		'- You have extracted all needed information from a set of tool results',
		'- You want to free context space without losing information',
		'',
		'WHEN NOT:',
		'- You are actively working on a task and may need the context again',
		'- The conversation is short (< 10 messages) — compression is not needed yet',
		'',
		'RETURNS:',
		'Compression summary: tokens saved, blocks compressed, and a confirmation.',
		'The compressed content is still retrievable via search() — nothing is lost.'
	].join('\n'),
	parameters: CompressParams,
	execute: async (args) => {
		const params = args as unknown as CompressParams;
		const { topic, content } = params;
		const blocks = content;

		// 1. DCP dedup — cheap pass on topic+summary. Each block is checked
		// independently so a partially-overlapping call still compresses the
		// novel block.
		const fresh = blocks.filter((b) => !dedupSet.has(`${topic}:${b.summary}`));
		if (fresh.length === 0) {
			return [
				`Duplicate block; already compressed.`,
				`Topic: "${topic}"`,
				`All ${blocks.length} block(s) in this call matched a recent compression.`
			].join('\n');
		}

		const blockCount = fresh.length;
		const tokensSaved = blockCount * TOKENS_PER_BLOCK;

		// 2. Persist to CompressedArtifact (lossless, retrievable via search).
		// When invoked from a SvelteKit request cycle, remultApi is already set
		// and inserts just work. From CLI / test contexts we need to install
		// the api module AND run the insert inside withRemult so the data
		// provider sees a valid request context.
		let artifactId: string | null = null;
		try {
			await ensureRemult();
			const repo = getCompressedRepo();
			const saved = await runInRemultContext(() =>
				repo.insert({
					topic,
					blockCount,
					blocks: fresh,
					sessionId: SESSION_ID,
					tokensSaved
				})
			);
			artifactId = saved.id ?? null;
		} catch (err) {
			console.warn(`[compress] persist failed: ${(err as Error).message}`);
		}

		// 3. Best-effort Headroom call. Don't fail the user's compress on outage.
		let headroomSaved: number | null = null;
		try {
			const result = await headroom.compress({
				messages: buildMessages(fresh),
				model: HEADROOM_MODEL
			});
			headroomSaved = result.tokens_saved;
		} catch (err) {
			console.warn(
				`[compress] Headroom unreachable, continuing with persist only: ${(err as Error).message}`
			);
		}

		// 4. Mark these invocations as seen for future dedup.
		for (const b of fresh) rememberInvocation(`${topic}:${b.summary}`);

		// 5. Return a structured, model-readable summary.
		const tokensLine = headroomSaved !== null
			? `Tokens saved (Headroom est.): ~${headroomSaved}`
			: `Tokens saved (estimate): ~${tokensSaved} (Headroom unavailable)`;

		const storedLine = artifactId
			? `Stored in CompressedArtifact (id: ${artifactId}).`
			: `Persist to CompressedArtifact failed; result kept in memory only.`;

		return [
			`Compression complete: "${topic}"`,
			`Blocks compressed: ${blockCount}`,
			tokensLine,
			storedLine,
			`Retrievable via search(queries: ["${topic}"]).`
		].join('\n');
	}
});
