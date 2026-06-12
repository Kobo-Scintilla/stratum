import { browser } from '$app/environment';
import { remult } from 'remult';
import { AgentService } from '@stratum/shared/controllers/agent-service.js';
import { toast } from 'svelte-sonner';

export interface HeadroomInstallStore {
	readonly installingFeature: 'code' | 'ml' | null;
	readonly installLog: string;
	readonly headroomCodeInstalled: boolean;
	readonly headroomMlInstalled: boolean;
	installFeature(feature: 'code' | 'ml'): Promise<void>;
	checkFeatures(): Promise<void>;
	initialize(features: { codeInstalled: boolean; mlInstalled: boolean }): void;
}

let installingFeature = $state<'code' | 'ml' | null>(null);
let installLog = $state('');
let headroomCodeInstalled = $state(true);
let headroomMlInstalled = $state(true);

async function checkFeatures() {
	try {
		const features = await remult.call(AgentService.checkHeadroomFeatures, undefined);
		headroomCodeInstalled = features.codeInstalled;
		headroomMlInstalled = features.mlInstalled;
	} catch (e) {
		console.error('[headroom-install] failed to check features', e);
	}
}

async function installFeature(feature: 'code' | 'ml') {
	if (installingFeature) {
		toast.error('Another installation is already running');
		return;
	}
	installingFeature = feature;
	installLog = 'Connecting to installer...\n';
	const featureName = feature === 'code' ? 'AST Code Optimizer' : 'ML Compressor';
	toast.info(`Starting installation of ${featureName} in background...`);

	try {
		const apiHost = (remult.apiClient.url || 'http://localhost:3001/api').replace('/api', '');
		const response = await fetch(`${apiHost}/api/headroom/install?feature=${feature}`);
		if (!response.body) throw new Error('No response stream from server');
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			installLog += decoder.decode(value);
		}

		await checkFeatures();

		if (feature === 'code' ? headroomCodeInstalled : headroomMlInstalled) {
			toast.success(`${featureName} installed successfully!`, { duration: 5000 });
		} else {
			throw new Error('Installation completed but package check failed');
		}
	} catch (e) {
		installLog += `\nError during installation: ${e}\n`;
		toast.error(`${featureName} installation failed! Check settings for logs.`, { duration: 6000 });
	} finally {
		installingFeature = null;
	}
}

function initialize(features: { codeInstalled: boolean; mlInstalled: boolean }) {
	headroomCodeInstalled = features.codeInstalled;
	headroomMlInstalled = features.mlInstalled;
}

// Initial check on load
if (browser) {
	setTimeout(checkFeatures, 0);
}

export const headroomInstallStore: HeadroomInstallStore = {
	get installingFeature() {
		return installingFeature;
	},
	get installLog() {
		return installLog;
	},
	get headroomCodeInstalled() {
		return headroomCodeInstalled;
	},
	get headroomMlInstalled() {
		return headroomMlInstalled;
	},
	installFeature,
	checkFeatures,
	initialize
};
