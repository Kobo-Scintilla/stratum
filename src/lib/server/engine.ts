import { dev } from '$app/environment';
import { OPENCODE_API_KEY } from '$env/static/private';
import { configureProvider } from '@flue/runtime';
import { configureFlueRuntime } from '@flue/runtime/internal';

let initPromise: Promise<void> | null = null;

export function getHarness(): Promise<void> {
	if (!initPromise) initPromise = _init();
	return initPromise;
}

async function _init(): Promise<void> {
	configureProvider('opencode-go', {
		apiKey: OPENCODE_API_KEY
	});

	configureFlueRuntime({
		target: 'node',
		devMode: dev
	});
}
