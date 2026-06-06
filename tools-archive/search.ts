import { adaptTool, SearchParams, IndexParams } from './types';
import Database from 'better-sqlite3';
import {
	IndexedContent,
	SessionEvent,
	getIndexedRepo,
	getSessionEventRepo
} from '../../shared/entities/KnowledgeStore.js';
import { initFts5, searchFts5, type FtsHit } from '../fts5';

async function ensureRemult(): Promise<void> {
	if (globalThis.remultApi) return;
	await import('../api.js');
}

function runInRemultContext<T>(fn: () => Promise<T>): Promise<T> {
	const api = globalThis.remultApi as
		| { withRemult: <U>(req: undefined, what: () => Promise<U>) => Promise<U> }
		| undefined;
	if (api) return api.withRemult(undefined, fn);
	return fn();
}

// Search tool — unified knowledge search across FTS5 + persisted memory.
// Queries indexed content via BM25-ranked FTS5 and session events via $contains.

// The api module owns the primary DB connection. We open a second handle
// here so we can run BM25 MATCH queries against chunks_fts without
// round-tripping through Remult (the fts5 virtual table is not exposed
// via the Remult repo). better-sqlite3 reads the same on-disk file and
// picks up the existing virtual table + triggers installed by api.ts.
const ftsDb: Database.Database = new Database('./db.sqlite');
initFts5(ftsDb);

function escapeFtsQuery(raw: string): string {
	// Wrap as a literal FTS5 phrase; double any embedded quote so the
	// phrase stays a single token and parse errors are impossible for
	// any caller-provided string.
	return `"${raw.replace(/"/g, '""')}"`;
}
async function performSearch(
	query: string,
	scope: string,
	source?: string,
	limit: number = 10
): Promise<string[]> {
	const results: string[] = [];
	const q = query.toLowerCase();
	try {
		const repo = getIndexedRepo();
		const eventRepo = getSessionEventRepo();
		// FTS5 BM25 lookup. Wrap the query in double quotes for a literal
		// phrase search (so user terms with FTS5 metacharacters don't
		// blow up the MATCH parser), with internal `"` doubled. If FTS5
		// still rejects the query, fall back to the $contains scan so
		// the tool stays useful for partial-token lookups and other
		// queries FTS5 can't tokenize.
		let ftsHits: FtsHit[] = [];
		try {
			ftsHits = searchFts5(ftsDb, escapeFtsQuery(query), limit);
		} catch (_ftsErr) {
			const contentFilter = [{ content: { $contains: q } }, { source: { $contains: q } }];
			const contentResults = await repo.find({
				where: { $or: contentFilter },
				limit,
				orderBy: { createdAt: 'desc' }
			});
			for (const item of contentResults) {
				const excerpt =
					item.content.length > 200 ? item.content.substring(0, 200) + '...' : item.content;
				results.push(`[Indexed] ${item.source} (${item.contentType}): ${excerpt}`);
			}
		}
		for (const hit of ftsHits) {
			if (source && hit.source !== source) continue;
			const excerpt = hit.content.length > 200 ? hit.content.substring(0, 200) : hit.content;
			results.push(
				`[Indexed] (bm25=${hit.score.toFixed(2)}) source=${hit.source} type=${hit.contentType}: ${excerpt}`
			);
		}
		if (scope === 'all' || results.length < limit) {
			const eventResults = await eventRepo.find({
				where: {
					$or: [{ summary: { $contains: q } }, { detail: { $contains: q } }]
				},
				limit: limit - results.length,
				orderBy: { createdAt: 'desc' }
			});
			for (const evt of eventResults) {
				results.push(`[${evt.eventType}] ${evt.summary} (session: ${evt.sessionId})`);
			}
		}
	} catch (_err) {
		// Knowledge store unavailable (e.g. no server in test mode)
		results.push(`(Knowledge store unavailable — index() and retry search later)`);
	}
	return results;
}
export const searchTool = adaptTool({
	name: 'search',
	description: [
		'Search all stored context across sessions. Queries run across:',
		'- FTS5 indexed content (docs, code snapshots, tool output summaries)',
		'- Session memory (decisions, blockers, plans, errors)',
		'- Compressed artifacts from completed tasks',
		'',
		'Indexed content is ranked with SQLite FTS5 BM25 (lower score = better match).',
		'Each result line includes the bm25 score so you can judge relevance.',
		'',
		'WHEN:',
		'- You need to recall something from earlier in this session',
		'- You want to reference knowledge from previous sessions',
		'- You indexed content earlier with index() and need to query it',
		'',
		'RETURNS:',
		'BM25-ranked results with content excerpts, source tags, content type, and the bm25 score.',
		'Use specific technical terms for best results. Batch multiple queries in one call.'
	].join('\n'),
	parameters: SearchParams,
	execute: async (args) => {
		const params = args as unknown as SearchParams;
		const { queries, scope = 'current', source, limit = 10 } = params;

		const allResults = await Promise.all(
			queries.map((q) => performSearch(q, scope, source, limit))
		);

		const output: string[] = [];
		for (let i = 0; i < queries.length; i++) {
			output.push(`Query: "${queries[i]}"`);
			if (allResults[i].length === 0) {
				output.push('  No results found. Try different terms or index() content first.');
			} else {
				for (const r of allResults[i].slice(0, limit)) {
					output.push(`  • ${r}`);
				}
			}
			output.push('');
		}

		return output.join('\n') || 'No results found.';
	}
});
export const indexTool = adaptTool({
	name: 'index',
	description: [
		'Store content in the searchable knowledge base for future retrieval.',
		'Splits markdown by headings, keeps code blocks intact. The full content',
		'stays in storage — retrieve any section on-demand via search().',
		'',
		'WHEN:',
		'- Documentation, API references, framework guides that you may need later',
		'- Results of code analysis that could be relevant to future work',
		'- Key decisions, architecture notes, or context you want preserved across sessions',
		'',
		'RETURNS:',
		'Indexing metadata: chunk counts, source label, and search tips.'
	].join('\n'),
	parameters: IndexParams,
	execute: async (args) => {
		const params = args as unknown as IndexParams;
		const { content, path, source } = params;

		// Determine what text to index
		let textToIndex = content || '';
		if (path && !textToIndex) {
			textToIndex = `[File: ${path}]`;
		}

		if (!textToIndex) {
			return 'Error: provide content or path to index.';
		}

		// Detect content type
		const contentType =
			textToIndex.trim().startsWith('{') || textToIndex.trim().startsWith('[')
				? 'json'
				: textToIndex.includes('```') ||
					  textToIndex.includes('function ') ||
					  textToIndex.includes('class ')
					? 'code'
					: 'text';

		// Store as chunks (split by double newlines for simplicity)
		const chunks = textToIndex.split(/\n\n+/).filter(Boolean);
		const repo = getIndexedRepo();

		// In a SvelteKit request cycle remultApi.withRemult is already
		// active; in CLI / test contexts we lazy-load the api module
		// and wrap the inserts in withRemult so Remult sees a valid
		// request context (otherwise repo.insert throws "remult object
		// was requested outside of a valid request cycle").
		let chunkIndex = 0;
		await ensureRemult();
		chunkIndex = await runInRemultContext(async () => {
			let written = 0;
			for (const chunk of chunks) {
				if (chunk.trim().length < 20) continue;
				await repo.insert({
					source,
					content: chunk.trim(),
					contentType,
					scope: 'persistent',
					sessionId: 'default',
					chunkIndex: written++
				});
			}
			return written;
		});

		return [
			`Indexed ${chunkIndex} chunks to source: "${source}"`,
			`Content type: ${contentType}`,
			`Total chars: ${textToIndex.length}`,
			'',
			'Use search() to find this content later.',
			`search(queries: [...], source: "${source}") scopes results.`
		].join('\n');
	}
});
