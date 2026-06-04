import { registerProvider } from '@flue/runtime';
import { configureFlueRuntime } from '@flue/runtime/internal';
import { flue } from './flue';

let initialized = false;

export async function getHarness() {
	if (initialized) return;

	const bifrostUrl = process.env.BIFROST_URL || 'http://bifrost:8080';

	registerProvider('bifrost', {
		api: 'openai-completions',
		baseUrl: `${bifrostUrl}/v1`,
		apiKey: 'none'
	});

	configureFlueRuntime({
		target: 'node',

		devMode: true
	});

	globalThis.flue = flue;

	initialized = true;
	console.log('[Flue] Harness initialized successfully with Bifrost provider at:', bifrostUrl);
}
