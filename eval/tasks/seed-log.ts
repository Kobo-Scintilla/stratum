// Seed: generate /tmp/eval-big.log — a ~50MB log file with mostly normal
// lines and exactly 100 ERROR lines containing the substring 'disk'.
//
// Approach: build the full line set in memory (50MB fits comfortably),
// splice in 100 disk ERROR lines at evenly-spread positions, and write
// the result with one fsync'd writev. Deterministic and guaranteed.
//
// Run: npx tsx eval/tasks/seed-log.ts

import { writeFileSync, statSync, unlinkSync, existsSync, openSync, closeSync, writeSync } from 'node:fs';

const OUT = '/tmp/eval-big.log';
const TARGET_BYTES = 50 * 1024 * 1024; // 50MB
const DISK_ERROR_COUNT = 100;

function rng(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const LEVELS = ['INFO', 'INFO', 'INFO', 'INFO', 'INFO', 'INFO', 'INFO', 'DEBUG', 'WARN', 'ERROR'] as const;
const COMPONENTS = ['auth', 'api', 'worker', 'scheduler', 'cache', 'db', 'proxy', 'gateway', 'metrics', 'queue'];
const NORMAL_MESSAGES = [
	'request handled',
	'cache hit',
	'job started',
	'connection established',
	'task completed',
	'connection closed',
	'config reloaded',
	'snapshot saved',
	'metrics flushed',
	'subscription renewed'
];
const DISK_MESSAGES = [
	'disk write failed: ENOSPC',
	'disk i/o timeout on /var/lib/data',
	'disk full: cannot append wal segment',
	'disk read error on sector 0x1f',
	'disk quota exceeded for tenant',
	'disk pressure high: 95% utilization',
	'disk controller reset',
	'disk flush backlog exceeded threshold',
	'disk latency p99 above 500ms',
	'disk mount failed: transport endpoint not connected'
];

function pick<T>(arr: readonly T[], r: number): T {
	return arr[Math.floor(r * arr.length)];
}

function pad(n: number, w: number): string {
	return n.toString().padStart(w, '0');
}

function tsLine(i: number): string {
	const totalSec = Math.floor(i / 1000);
	const hh = pad(Math.floor((totalSec / 3600) % 24), 2);
	const mm = pad(Math.floor((totalSec / 60) % 60), 2);
	const ss = pad(totalSec % 60, 2);
	const ms = pad(i % 1000, 3);
	return `2024-01-01T${hh}:${mm}:${ss}.${ms}Z`;
}

if (existsSync(OUT)) unlinkSync(OUT);

const r = rng(0xc0ffee);

// Pre-compute the disk-slot positions. Spread evenly across the file
// so a model reading from the head or tail can't game the count.
const diskSlots: number[] = [];

// We don't know the line count until we build the buffer. Use a
// two-phase approach: first build only the normal lines, count them,
// then compute splice positions and re-build the buffer with disk
// lines swapped in.

const normalLines: string[] = [];
let bytes = 0;
while (bytes < TARGET_BYTES) {
	const i = normalLines.length;
	const lvl = pick(LEVELS, r());
	const comp = pick(COMPONENTS, r());
	const msg = pick(NORMAL_MESSAGES, r());
	const dur = Math.floor(r() * 250);
	const line = `${tsLine(i)} ${lvl} [${comp}] ${msg} duration=${dur}ms (seq=${i})\n`;
	normalLines.push(line);
	bytes += line.length;
}

const totalNormal = normalLines.length;
const step = Math.max(1, Math.floor(totalNormal / DISK_ERROR_COUNT));
for (let k = 0; k < DISK_ERROR_COUNT; k++) diskSlots.push(k * step);

// Splice disk lines in. We over-write one normal line per slot with a
// disk line, keeping the total byte count approximately constant.
const finalLines: string[] = new Array(totalNormal);
for (let i = 0; i < totalNormal; i++) {
	if (diskSlots.includes(i)) {
		const msg = pick(DISK_MESSAGES, r());
		const comp = pick(COMPONENTS, r());
		finalLines[i] = `${tsLine(i)} ERROR [${comp}] ${msg} (seq=${i})\n`;
	} else {
		finalLines[i] = normalLines[i];
	}
}

const fd = openSync(OUT, 'w');
const buf = Buffer.from(finalLines.join(''), 'utf8');
writeSync(fd, buf, 0, buf.length, 0);
closeSync(fd);

const st = statSync(OUT);
console.log(
	`[seed-log] wrote ${OUT}: ${(st.size / 1024 / 1024).toFixed(2)} MB, ` +
		`${totalNormal} normal + ${DISK_ERROR_COUNT} disk ERRORs`
);

writeFileSync(
	'/tmp/eval-big.log.meta.json',
	JSON.stringify({ path: OUT, bytes: st.size, totalLines: totalNormal, diskErrorCount: DISK_ERROR_COUNT }, null, 2)
);
