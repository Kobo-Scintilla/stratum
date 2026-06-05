// Seed: write /tmp/x.json — a deterministic 5-row JSON array the model
// must convert to CSV in the code/transform task.
//
// The shape is fixed: an array of objects with fields `a`, `b`, `c`. The
// CSV the model writes is checked by the `fileMatches` predicate in
// tasks.ts, which asserts the header `a,b,c` and the presence of all
// 5 row values in any order.
//
// Idempotent: re-running rewrites the file with the same content.
//
// Run: npx tsx eval/tasks/seed-x-json.ts

import { writeFileSync, statSync } from 'node:fs';

const OUT = '/tmp/x.json';

const DATA: Array<{ a: number; b: string; c: boolean }> = [
	{ a: 1, b: 'alpha', c: true },
	{ a: 2, b: 'beta', c: false },
	{ a: 3, b: 'gamma', c: true },
	{ a: 4, b: 'delta', c: false },
	{ a: 5, b: 'epsilon', c: true }
];

writeFileSync(OUT, JSON.stringify(DATA, null, 2), 'utf8');
const st = statSync(OUT);
console.log(`[seed-x-json] wrote ${OUT}: ${st.size} bytes, ${DATA.length} rows`);
