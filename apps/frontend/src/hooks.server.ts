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

// Point Remult client to gateway for SSR
remult.apiClient.url = 'http://localhost:3001/api';

export const handle = async ({ event, resolve }) => {
	return await resolve(event);
};
