// EVAL_TASKS — the six-task suite for the live evaluation harness.
//
// Each task is runnable in two modes (with-tools / no-tools) and scored by
// a single GroundTruth check. The with-tools mode is the interesting one:
// the model has execute/search/index/compress, and the task is to see
// whether those tools actually help it arrive at a correct answer with
// fewer tokens. The no-tools mode is the baseline.
//
// The fixtures are seeded by eval/tasks/seed-*.ts. Run them once before a
// benchmark sweep with `npx tsx eval/tasks/seed-all.ts`.
//
// Task 1: small/lookup — wc -l on package.json
// Task 2: medium/aggregate — top-3 dependencies by name length
// Task 3: large/log-analysis — count disk ERRORs in a ~50MB log
// Task 4: multi-step/refactor — files that import remult AND have TODO
// Task 5: search-heavy/recall — find the rate-limit fact in IndexedContent
// Task 6: code/transform — JSON to CSV with columns a,b,c

import type { Task } from './types';

// ─── Task 1: small/lookup ────────────────────────────────────────────
// 49 lines per `wc -l /root/dev/app/package.json`. A model with execute()
// can verify the count in one shell call; a model without tools has to
// either count by hand (the package.json is 49 lines, which is feasible)
// or admit it can't be sure.

export const task1: Task = {
	id: 'lookup-lines-pkg',
	difficulty: 'small',
	category: 'lookup',
	prompt: 'How many lines are in /root/dev/app/package.json? Reply with the integer count and nothing else.',
	seedFile: '/root/dev/app/package.json',
	expectedBehavior: 'Model must call execute(language="shell", code="wc -l /root/dev/app/package.json") and reply with 49.',
	groundTruth: { kind: 'exact', value: '49' }
};

// ─── Task 2: medium/aggregate ────────────────────────────────────────
// We define "largest" as longest dependency NAME (every value in
// package.json is a one-line semver string, so byte count is degenerate).
// Top 3 by name length:
//   @sveltejs/vite-plugin-svelte (28)
//   @fontsource-variable/outfit   (27)
//   prettier-plugin-tailwindcss   (27)
// A model with execute() can compute this in one shell pipeline; without
// execute() it has to read the file character by character.

export const task2: Task = {
	id: 'aggregate-top3-deps',
	difficulty: 'medium',
	category: 'aggregate',
	prompt:
		'List the 3 dependencies in /root/dev/app/package.json whose names are the longest by character count. ' +
		'Reply with the three package names, one per line, sorted by name length descending.',
	seedFile: '/root/dev/app/package.json',
	expectedBehavior:
		'Model should parse the dependencies/devDependencies blocks, measure each name string, and return the top 3 in descending order.',
	groundTruth: {
		kind: 'contains',
		values: ['@sveltejs/vite-plugin-svelte', '@fontsource-variable/outfit', 'prettier-plugin-tailwindcss'],
		minMatches: 3
	}
};

// ─── Task 3: large/log-analysis ─────────────────────────────────────
// ~50MB log at /tmp/eval-big.log with 100 ERROR lines containing 'disk'.
// Grep is the natural tool. A model without execute() cannot inspect
// the file at all — it has to guess. With execute() + intent, the
// auto-index path returns a BM25-ranked section preview that includes
// the count.

export const task3: Task = {
	id: 'log-disk-errors',
	difficulty: 'large',
	category: 'log-analysis',
	prompt:
		'How many lines in /tmp/eval-big.log match the regex ERROR.*disk (an ERROR line whose message contains the substring "disk")? ' +
		'Reply with the integer count and nothing else.',
	seedFile: '/tmp/eval-big.log',
	expectedBehavior:
		'Model should run execute(language="shell", code="grep -cE \'ERROR.*disk\' /tmp/eval-big.log") and reply 100.',
	groundTruth: { kind: 'exact', value: '100' }
};

// ─── Task 4: multi-step/refactor ─────────────────────────────────────
// Three files in /root/dev/app/src/ are seeded with a TODO(eval-seed)
// marker. Two of them import from 'remult'; one does not. The model
// must intersect the two sets. The distractor (utils.ts) is the failure
// mode we want to detect — a model that returns all three is wrong.

export const task4: Task = {
	id: 'remult-importers-with-todo',
	difficulty: 'multi-step',
	category: 'refactor',
	prompt:
		'In /root/dev/app/src/, list the files that (a) import from the "remult" package AND (b) contain a TODO comment. ' +
		'Reply with one path per line, no other commentary.',
	expectedBehavior:
		'Model should grep for `from [\'"]remult` and for `TODO`, then intersect. Ground truth: the two remult-importing files; the distractor (utils.ts) must NOT appear.',
	groundTruth: {
		kind: 'contains',
		values: ['src/lib/server/api.ts', 'src/lib/shared/AgentService.ts'],
		minMatches: 2,
		mustNotContain: ['src/lib/utils.ts']
	}
};

// ─── Task 5: search-heavy/recall ─────────────────────────────────────
// Three chunks are pre-seeded in IndexedContent; only one contains the
// rate-limit fact. The model must use search() to find it. Without
// search(), the chunk is not in its context and the answer is
// necessarily a guess.

export const task5: Task = {
	id: 'recall-rate-limit',
	difficulty: 'search-heavy',
	category: 'recall',
	prompt: 'What did the user say about the API rate limit? Reply in one or two sentences.',
	expectedBehavior:
		'Model should call search(queries: ["API rate limit", "requests per minute", "rate limit"]) and synthesize a one-sentence answer citing the 100 requests per minute fact.',
	groundTruth: {
		kind: 'contains',
		values: ['100', 'requests per minute'],
		minMatches: 2
	}
};

// ─── Task 6: code/transform ──────────────────────────────────────────
// /tmp/x.json is a 5-row array of {a, b, c}. The model must write a CSV
// with header "a,b,c" and one row per JSON object. The fileMatches
// predicate checks for the header, the right row count, and that the
// specific values from each row appear somewhere in the file.

export const task6: Task = {
	id: 'json-to-csv',
	difficulty: 'medium',
	category: 'transform',
	prompt:
		'Read /tmp/x.json and write its contents to /tmp/x.csv as CSV with header columns a,b,c. ' +
		'Use the file path /tmp/x.csv for the output.',
	seedFile: '/tmp/x.json',
	expectedBehavior:
		'Model reads /tmp/x.json (5 rows) and writes /tmp/x.csv. The CSV must have a header line "a,b,c" and 5 data rows containing the original values.',
	groundTruth: {
		kind: 'fileMatches',
		path: '/tmp/x.csv',
		predicate: (content: string): boolean => {
			const lines = content.trim().split(/\r?\n/);
			// Header check
			if ((lines[0] ?? '').trim() !== 'a,b,c') return false;
			// 5 data rows after the header
			if (lines.length < 6) return false;
			// Every row must have exactly 3 columns
			for (let i = 1; i < lines.length; i++) {
				if ((lines[i].split(',').length) !== 3) return false;
			}
			// The data must contain all 5 b-values (the unique strings), in any order.
			const must = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
			for (const v of must) {
				if (!content.includes(v)) return false;
			}
			// The data must contain the numbers 1..5 somewhere in the first column
			for (let n = 1; n <= 5; n++) {
				if (!new RegExp(`(?:^|,)${n}(?:,|$)`, 'm').test(content)) return false;
			}
			return true;
		}
	}
};

// ─── Suite ───────────────────────────────────────────────────────────

export const EVAL_TASKS: Task[] = [task1, task2, task3, task4, task5, task6];
