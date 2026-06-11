import { env } from '$env/dynamic/private';
import { remult } from 'remult';
import fs from 'node:fs';
import crypto from 'node:crypto';

// ── Bootstrap encryption key ────────────────────────────────────
if (!env.ENCRYPTION_KEY) {
	const keyFile = './.encryption-key';
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
export const handle = async ({ event, resolve }) => {
	// Configure Remult client for SSR using SvelteKit's patched fetch so it
	// doesn't trigger "Avoid calling fetch eagerly" warnings.
	remult.apiClient.url = 'http://localhost:3001/api';
	remult.apiClient.httpClient = event.fetch;
	return await resolve(event);
};
