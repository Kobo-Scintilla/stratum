import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';
import { api as handleRemult } from '$lib/server/api';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// ── Bootstrap encryption key ────────────────────────────────────
if (!env.ENCRYPTION_KEY) {
	const keyFile = path.resolve('.encryption-key');
	let key: string;
	if (fs.existsSync(keyFile)) {
		key = fs.readFileSync(keyFile, 'utf8').trim();
	} else {
		key = crypto.randomBytes(32).toString('hex');
		fs.writeFileSync(keyFile, key, 'utf8');
		console.log('[hooks] Generated ENCRYPTION_KEY and saved to .encryption-key');
	}
	process.env.ENCRYPTION_KEY = key;
}

// pi-ai reads API keys from process.env via getEnvApiKey().
// SvelteKit doesn't expose .env vars on process.env directly,
// so proxy them here from $env/dynamic/private.
process.env.OPENCODE_API_KEY = env.OPENCODE_API_KEY;

export const handle = sequence(handleRemult);
