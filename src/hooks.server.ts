import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';
import { api as handleRemult } from '$lib/server/api';

// pi-ai reads API keys from process.env via getEnvApiKey().
// SvelteKit doesn't expose .env vars on process.env directly,
// so proxy them here from $env/dynamic/private.
process.env.OPENCODE_API_KEY = env.OPENCODE_API_KEY;

export const handle = sequence(handleRemult);
