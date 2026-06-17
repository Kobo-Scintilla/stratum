export function load({ cookies, locals }: { cookies: import('@sveltejs/kit').Cookies; locals: App.Locals }) {
	const raw = cookies.get('nav-active-tab');
	let activeTab: string | null = null;
	if (raw) {
		try {
			activeTab = JSON.parse(raw);
		} catch {
			/* corrupt cookie */
		}
	}
	return { activeTab, user: locals.user ?? null };
}
