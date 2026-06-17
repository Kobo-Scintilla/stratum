# Purpose

SvelteKit 5 UI providing chat interface, session history, provider configuration, dashboard, and multi-user auth.

# Ownership

- Frontend Dev Team / Frontend Agent

# Local Contracts

- Connection: Calls gateway API via Remult client at `http://localhost:3001/api`.
- Auth: better-auth (email/password) via `$lib/auth-client.ts` — wraps `better-auth/svelte`.
- Login: `/login` — sign-in/sign-up form using `authClient.signIn.email()` / `authClient.signUp.email()`.
- Session: `authClient.useSession()` returns nanostores Atom; subscribe to get reactive user data.
- Colors: text oklch(0.97 0.005 260.0), background oklch(0.12 0.02 260.0), primary oklch(0.74 0.13 185.0), secondary oklch(0.60 0.12 260.0).
- Framework Mode: Svelte 5 Runes mode only. No legacy Svelte 4 APIs.
- Loaders: Use a consistent, clean CSS/SVG spinning circle loader for component loading states instead of pulsing skeletons.

# Work Guidance

- **Components**: `src/lib/components/` `src/lib/components/ui/`
- **Page Shape**: Routes thin. Sections in `src/lib/components/`; orchestrate loading, live sync, navigation, callbacks.
- **Runes**: use `$state`, `$derived`, `$effect`, and `$props` for state management and props.
- **Stores**: Use Svelte 5 runes-based files under `src/lib/stores/` client-side state.
- **Remult live sync**: `createLiveQuery` rune for real-time entity synchronization. Avoid manual `$effect` subscriptions.
- **Auth client**: Import `authClient` from `$lib/auth-client.js`. Available methods: `signIn`, `signUp`, `signOut`, `useSession`.
- **Route guard**: Root `+layout.svelte` checks session and redirects to `/login` for protected routes.
- **Session visibility**: `SidebarSessionList` shows lock/globe icon. Click calls `AgentService.toggleSessionVisibility`.
- **Clean Code**: Prefer readable, maintainable code over dense one-file logic or clever type gymnastics. Avoid unnecessary `any`, oversized props, and duplicated UI blocks.

# Verification

- Run `bun run check` in the `apps/frontend` directory.

# Child DOX Index

(none)
