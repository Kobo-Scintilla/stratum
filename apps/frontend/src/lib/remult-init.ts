import { Remult, remult } from 'remult';
import { createSubscriber } from 'svelte/reactivity';

export function initRemultSvelteReactivity() {
	// Auth reactivity (remult.user, remult.authenticated(), ...)
	{
		let update = () => {};
		const s = createSubscriber((u) => {
			update = u;
		});
		remult.subscribeAuth({
			reportObserved: () => s(),
			reportChanged: () => update()
		});
	}
	Remult.entityRefInit = (x) => {
		let update = () => {};
		const s = createSubscriber((u) => {
			update = u;
		});
		x.subscribe({
			reportObserved: () => s(),
			reportChanged: () => update()
		});
	};
}
