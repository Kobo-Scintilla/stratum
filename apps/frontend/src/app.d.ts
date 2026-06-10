// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	var remultApi:
		| { withRemult(event: undefined, what: () => Promise<void>): Promise<void> }
		| undefined;
}

export {};
