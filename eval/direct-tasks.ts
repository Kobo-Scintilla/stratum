// Direct-eval task suite. Self-contained prompts + ground truth. None of the
// tasks need external fixtures — they only touch files that are always
// present in the repo (package.json). This keeps the runner runnable
// immediately after `pnpm install` with no setup phase.

import type { GroundTruth } from './direct-ground-truth.js';

export type EvalTask = {
	id: string;
	prompt: string;
	groundTruth: GroundTruth;
	/** Human-readable category, used in summary tables. */
	category: 'factual' | 'shell' | 'reasoning' | 'composite';
};

export const EVAL_TASKS: EvalTask[] = [
	{
		id: 'small-lookup',
		category: 'shell',
		prompt:
			'How many lines are in /root/dev/app/package.json? Reply with only the integer count.',
		// `wc -l` reports newlines, not split-elements. The file ends with `\n`,
		// so `split('\n').length` is 50 (49 content + 1 empty) while `wc -l` is 49.
		// Accept either — both are defensible readings of "lines in the file".
		groundTruth: { kind: 'any', values: ['49', '50'] }
	},
	{
		id: 'package-name',
		category: 'factual',
		prompt:
			'What is the "name" field in /root/dev/app/package.json? Reply with only the value.',
		groundTruth: 'app'
	},
	{
		id: 'dev-deps-count',
		category: 'shell',
		prompt:
			'How many entries are in the "devDependencies" object of /root/dev/app/package.json? Reply with only the integer count.',
		groundTruth: { kind: 'number', expected: 26, tolerance: 0 }
	},
	{
		id: 'has-svelte5',
		category: 'factual',
		prompt:
			'Does /root/dev/app/package.json declare "svelte" version 5.55 or higher? Answer with YES or NO only.',
		groundTruth: { kind: 'any', values: ['YES', 'Yes', 'yes'] }
	},
	{
		id: 'pkg-type',
		category: 'factual',
		prompt: 'What is the "type" field set to in /root/dev/app/package.json? Reply with only that value.',
		groundTruth: 'module'
	}
];

export function getTask(id: string): EvalTask | undefined {
	return EVAL_TASKS.find((t) => t.id === id);
}
