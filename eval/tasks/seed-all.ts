// Seed-all: runs every seed-* script in sequence. Useful before a full
// benchmark sweep so the model sees consistent fixture state.
//
// Run: npx tsx eval/tasks/seed-all.ts

async function main(): Promise<void> {
	const steps: Array<{ name: string; mod: string }> = [
		{ name: 'log', mod: './seed-log.js' },
		{ name: 'todos', mod: './seed-todos.js' },
		{ name: 'search', mod: './seed-search.js' },
		{ name: 'x-json', mod: './seed-x-json.js' }
	];

	for (const step of steps) {
		console.log(`\n=== seed:${step.name} ===`);
		const t0 = Date.now();
		await import(step.mod);
		console.log(`=== seed:${step.name} done in ${Date.now() - t0}ms ===`);
	}
}

main().catch((err) => {
	console.error('seed-all failed:', err);
	process.exit(1);
});
