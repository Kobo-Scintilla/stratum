import { createAuthClient } from "better-auth/svelte";
import { browser } from "$app/environment";

const baseURL = browser
	? `${window.location.protocol}//${window.location.hostname}:3001`
	: "http://localhost:3001";

export const authClient = createAuthClient({
	baseURL,
	fetchOptions: {
		credentials: "include",
	},
});

// Re-export commonly used methods
export const { signIn, signUp, signOut, useSession } = authClient;
