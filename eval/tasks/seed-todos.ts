// Seed: inject a single TODO comment line into a fixed set of source files
// so the multi-step/refactor task has a real ground truth.
//
// Files seeded with TODO markers:
//   - src/lib/server/api.ts          (imports from 'remult'  ← KEEP in answer)
//   - src/lib/shared/AgentService.ts (imports from 'remult'  ← KEEP in answer)
//   - src/lib/utils.ts               (does NOT import remult ← distractor)
//
// The ground truth for task 4 is: the two remult-importing files. A model
// that returns all three (including the distractor) is wrong.
//
// Idempotent: re-running is a no-op because the marker line is detected
// before insertion. The marker is `// TODO(eval-seed)` so it is easy to
// strip out via `git checkout` after a benchmark run.
//
// Run: npx tsx eval/tasks/seed-todos.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = '/root/dev/app';
const MARKER = '// TODO(eval-seed): benchmark fixture — safe to ignore';

const TARGETS = [
	'src/lib/server/api.ts',
	'src/lib/shared/AgentService.ts',
	'src/lib/utils.ts'
] as const;

for (const rel of TARGETS) {
	const abs = join(REPO, rel);
	const original = readFileSync(abs, 'utf8');

	if (original.includes(MARKER)) {
		console.log(`[seed-todos] ${rel}: already seeded, skipping`);
		continue;
	}

	// Insert the marker as the first line of the file. This keeps the
	// diff minimal and easy to revert. We don't try to be clever about
	// placing it near an existing import — the regex search in the task
	// just needs the substring `TODO` to appear somewhere in the file.
	const seeded = `${MARKER}\n${original}`;
	writeFileSync(abs, seeded, 'utf8');
	console.log(`[seed-todos] ${rel}: injected TODO marker`);
}

console.log('[seed-todos] done. Revert with:');
for (const rel of TARGETS) {
	console.log(`  git checkout -- ${rel}`);
}
