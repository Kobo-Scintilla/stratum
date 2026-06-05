// Ground-truth scorer — evaluates a model's final answer against a Task's
// GroundTruth. Pure functions, no side effects. The runner in runner.ts
// calls `score(task, answer)` after collecting the model's output.
//
// Each branch is intentionally verbose about the reason a check failed,
// so the run report can be used as a debugging artifact.

import { readFileSync } from 'node:fs';
import type { GroundTruth, Task } from './types';

function normalize(s: string, mode: 'lower' | 'trim' | 'lower-trim' | undefined): string {
	if (mode === 'lower') return s.toLowerCase();
	if (mode === 'trim') return s.trim();
	if (mode === 'lower-trim') return s.trim().toLowerCase();
	return s;
}

export interface ScoreResult {
	pass: boolean;
	detail: string;
}

/**
 * Score a model's final answer against the task's ground truth.
 * Returns `{ pass, detail }`; `detail` is always a human-readable explanation.
 */
export function score(task: Task, answer: string): ScoreResult {
	const gt = task.groundTruth;

	switch (gt.kind) {
		case 'exact': {
			const expected = normalize(gt.value, gt.normalize);
			const got = normalize(answer, gt.normalize);
			const pass = expected === got;
			return {
				pass,
				detail: pass
					? `exact match: ${JSON.stringify(got)}`
					: `exact mismatch — expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`
			};
		}

		case 'contains': {
			const hits = gt.values.filter((v) => answer.includes(v));
			const missed = gt.values.filter((v) => !answer.includes(v));
			const pass = hits.length >= gt.minMatches;
			const lines = [
				`contains check: ${hits.length}/${gt.values.length} matched (need ${gt.minMatches})`,
				...hits.map((v) => `  ✓ contains: ${JSON.stringify(v)}`),
				...missed.map((v) => `  ✗ missing:  ${JSON.stringify(v)}`)
			];
			if (gt.mustNotContain && gt.mustNotContain.length > 0) {
				const banned = gt.mustNotContain.filter((b) => answer.includes(b));
				if (banned.length > 0) {
					lines.push(...banned.map((b) => `  ✗ forbidden: ${JSON.stringify(b)}`));
					return { pass: false, detail: lines.join('\n') };
				}
			}
			return { pass, detail: lines.join('\n') };
		}

		case 'regex': {
			const re = new RegExp(gt.pattern, gt.flags ?? 'i');
			const pass = re.test(answer);
			return {
				pass,
				detail: pass
					? `regex /${gt.pattern}/${gt.flags ?? ''} matched`
					: `regex /${gt.pattern}/${gt.flags ?? ''} did not match answer: ${JSON.stringify(answer.slice(0, 200))}`
			};
		}

		case 'fileMatches': {
			let content: string;
			try {
				content = readFileSync(gt.path, 'utf8');
			} catch (err) {
				return {
					pass: false,
					detail: `fileMatches: could not read ${gt.path}: ${(err as Error).message}`
				};
			}
			let pass: boolean;
			try {
				pass = gt.predicate(content);
			} catch (err) {
				return {
					pass: false,
					detail: `fileMatches: predicate threw: ${(err as Error).message}`
				};
			}
			return {
				pass,
				detail: pass
					? `fileMatches: predicate passed on ${gt.path}`
					: `fileMatches: predicate failed on ${gt.path} (${content.length} bytes)`
			};
		}
	}
}
