import { getContext, setContext } from 'svelte';
import { remult } from 'remult';
import { AgentService } from '@opaius/shared/controllers/agent-service.js';
import { browser } from '$app/environment';
import { persistedState } from 'svelte-persisted-state';
import { Folder01Icon, Settings02FreeIcons, ApiIcon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/svelte';

export type TabId = 'sessions' | 'providers' | 'settings';

export type NavItem = {
	id: TabId;
	title: string;
	icon: IconSvgElement;
};

export const navTopItems: NavItem[] = [
	{ id: 'sessions', title: 'Sessions', icon: Folder01Icon },
	{ id: 'providers', title: 'Providers', icon: ApiIcon }
];

export const navBottomItems: NavItem[] = [
	{ id: 'settings', title: 'Settings', icon: Settings02FreeIcons }
];

const KEY_TAB = 'nav-active-tab';
const CONTEXT_KEY = Symbol('dashboard-state');

function writeTabCookie(value: unknown) {
	if (!browser) return;
	document.cookie = `${KEY_TAB}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export class DashboardState {
	private _activeTabState;

	sessions = $state<any[]>([]);
	sessionsLoading = $state(false);

	providers = $state<any[]>([]);
	providersLoading = $state(false);

	configured = $state<any[]>([]);
	configuredLoading = $state(false);

	defaults = $state<any>(null);

	constructor(initial: {
		activeTab: string | null;
		sessions: any[];
		providers: any[];
		configured: any[];
		defaults: any;
	}) {
		this._activeTabState = persistedState<TabId | null>(
			KEY_TAB,
			(initial.activeTab as TabId) ?? 'sessions',
			{
				storage: 'local',
				syncTabs: true
			}
		);
		this.sessions = initial.sessions;
		this.providers = initial.providers;
		this.configured = initial.configured;
		this.defaults = initial.defaults;
	}

	get activeTab() {
		return this._activeTabState.current;
	}

	set activeTab(v: TabId | null) {
		this._activeTabState.current = v;
		writeTabCookie(v);
	}

	toggleTab(id: TabId) {
		this.activeTab = this.activeTab === id ? null : id;
	}

	get enabledProviders() {
		return new Set(this.configured.filter((c) => c.enabled && c.hasKey).map((c) => c.id));
	}

	async refreshSessions() {
		this.sessionsLoading = true;
		try {
			this.sessions = await remult.call(AgentService.listSessions, undefined);
		} catch (err) {
			console.error('[DashboardState] refreshSessions failed:', err);
		} finally {
			this.sessionsLoading = false;
		}
	}

	async refreshProviders() {
		this.providersLoading = true;
		this.configuredLoading = true;
		try {
			const [p, c] = await Promise.all([
				remult.call(AgentService.getProvidersInfo, undefined),
				remult.call(AgentService.getConfiguredProviders, undefined)
			]);
			this.providers = p;
			this.configured = c;
		} catch (err) {
			console.error('[DashboardState] refreshProviders failed:', err);
		} finally {
			this.providersLoading = false;
			this.configuredLoading = false;
		}
	}

	toggleProviderEnabledLocal(id: string, enabled: boolean) {
		const found = this.configured.find((c) => c.id === id);
		if (found) {
			found.enabled = enabled;
		} else {
			this.configured.push({ id, enabled, hasKey: false });
		}
	}
}

export function createDashboardState(initial: ConstructorParameters<typeof DashboardState>[0]) {
	const state = new DashboardState(initial);
	setContext(CONTEXT_KEY, state);
	return state;
}

export function useDashboardState() {
	return getContext<DashboardState>(CONTEXT_KEY);
}
