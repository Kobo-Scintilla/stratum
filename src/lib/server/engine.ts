import { registerProvider } from '@flue/runtime';
import { configureFlueRuntime } from '@flue/runtime/internal';
import { flue } from './flue';

let initialized = false;

export async function getHarness() {
	if (initialized) return;

	const bifrostUrl = process.env.BIFROST_URL || 'http://bifrost:8080';
	const headroomUrl = process.env.HEADROOM_URL || 'http://headroom:8787';

	let useHeadroom = false;
	if (process.env.HEADROOM_URL) {
		try {
			const res = await fetch(`${headroomUrl}/healthz`, { signal: AbortSignal.timeout(1000) });
			useHeadroom = res.ok;
			if (!useHeadroom) console.warn(`[Flue] HEADROOM_URL set but healthz returned ${res.status}; falling back to Bifrost direct`);
		} catch (err) {
			console.warn(`[Flue] HEADROOM_URL set but unreachable (${(err as Error).message}); falling back to Bifrost direct`);
		}
	}

	const baseUrl = useHeadroom ? `${headroomUrl}/v1` : `${bifrostUrl}/v1`;
	console.log(`[Flue] LLM path: ${useHeadroom ? `Headroom→Bifrost via ${headroomUrl}` : `Bifrost direct via ${bifrostUrl}`}`);

	registerProvider('bifrost', {
		api: 'openai-completions',
		baseUrl,
		apiKey: 'none'
	});

	configureFlueRuntime({
		target: 'node',
		devMode: true
	});

	globalThis.flue = flue;

	initialized = true;
}
