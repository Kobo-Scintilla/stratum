import type { Handle } from '@sveltejs/kit';
import { getHarness } from '$lib/server/engine';
import '$lib/server/flue';

try {
	await getHarness();
} catch (err) {
	console.error('[Flue] Failed to initialize runtime:', err);
	process.exit(1);
}

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
