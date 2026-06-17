import { env } from '$env/dynamic/private';
import { remult } from 'remult';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { redirect } from '@sveltejs/kit';

if (!env.ENCRYPTION_KEY) {
	const keyFile = './.encryption-key';
	let key;
	if (fs.existsSync(keyFile)) {
		key = fs.readFileSync(keyFile, 'utf8').trim();
	} else {
		key = crypto.randomBytes(32).toString('hex');
		fs.writeFileSync(keyFile, key, 'utf8');
	}
	process.env.ENCRYPTION_KEY = key;
}

const GATEWAY_URL = env.GATEWAY_URL || 'http://localhost:3001';
const AUTH_URL = GATEWAY_URL + '/api/auth';
const PROTECTED = ['/dashboard'];

async function checkSession(cookie: string | null): Promise<{ user: { id: string; name: string; email: string } } | null> {
	if (!cookie) return null;
	try {
		const r = await (globalThis.fetch as typeof fetch)(AUTH_URL + '/get-session', {
			headers: { cookie, accept: 'application/json' },
		});
		if (!r.ok) return null;
		const body = await r.json();
		return body?.user ? body : null;
	} catch {
		return null;
	}
}

export const handle = async ({ event, resolve }) => {
	remult.apiClient.url = GATEWAY_URL + '/api';
	remult.apiClient.httpClient = event.fetch;

	const cookie = event.request.headers.get('cookie');
	const path = new URL(event.request.url).pathname;

	// Resolve session from gateway (single fetch, cached by cookie)
	const session = await checkSession(cookie);
	event.locals.user = session?.user ?? null;

	const prot = PROTECTED.some(p => path.startsWith(p));
	const login = path === '/login';
	if (prot && !session) redirect(303, '/login');
	if (login && session) redirect(303, '/dashboard');

	return await resolve(event);
};
