import type { Handle } from '@sveltejs/kit';
import { getHarness } from '$lib/server/engine';

// Initialize Flue engine at server startup
await getHarness();

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
