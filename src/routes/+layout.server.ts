export function load({ cookies }: { cookies: import("@sveltejs/kit").RequestEvent["cookies"] }) {
	const raw = cookies.get("nav-active-tab");
	let activeTab: string | null = null;
	if (raw) {
		try {
			activeTab = JSON.parse(raw);
		} catch {
			/* corrupt cookie */
		}
	}
	return { activeTab };
}
