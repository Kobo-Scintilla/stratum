# Purpose

SvelteKit 5 UI providing the chat interface, session history, provider configuration, and dashboard.

# Ownership

- Frontend Dev Team / Frontend Agent

# Local Contracts

- Connection: Calls gateway API via Remult client at `http://localhost:3001/api`.
- Theme & Styling: Soothing AI Slate & Neon Teal dark theme using Tailwind CSS v4, derived from OKLCH base colors: text oklch(0.97 0.005 260.0), background oklch(0.08 0.005 260.0), primary oklch(0.74 0.13 185.0), secondary oklch(0.60 0.12 260.0).
- Framework Mode: Svelte 5 Runes mode only. No legacy Svelte 4 APIs.
- Loaders: Use a consistent, clean CSS/SVG spinning circle loader for component loading states instead of pulsing skeletons.

# Work Guidance

- **Components**: Group custom widgets under `src/lib/components/` (e.g. `chat/`, `sidebar/`). Use `src/lib/components/ui/` for shadcn-svelte primitives.
- **Page Shape**: Keep route pages thin. Extract large page sections into focused components under `src/lib/components/`; pages should orchestrate loading, live sync, navigation, and callbacks.
- **Runes**: Always use `$state`, `$derived`, `$effect`, and `$props` for state management and props.
- **Stores**: Use Svelte 5 runes-based files under `src/lib/stores/` for client-side state.
- **Remult live sync**: Use Remult `liveQuery` for realtime entity lists such as chat messages, active streams, and session settings; return the unsubscribe function from `$effect` cleanup.
- **Clean Code**: Prefer readable, maintainable code over dense one-file logic or clever type gymnastics. Avoid unnecessary `any`, oversized props, and duplicated UI blocks.
- **Path Aliases**: Use `$lib` for `src/lib/` and `@opaius/shared` for the shared library package.
- **Icons & Typography**: Use Remixicon Svelte + Hugeicons, and Outfit Variable font.
- **Utility**: Use the `cn()` function from `$lib/utils.ts` for styling classes combining.

# Verification

- Run type checking and UI sync: `bun run check` (runs svelte-kit sync and svelte-check) inside the `apps/frontend` directory.
- Run formatter: `bun run format` (runs Prettier).

# Child DOX Index

_No child DOX indexes for this application._
