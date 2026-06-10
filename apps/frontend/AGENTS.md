# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

Respond terse like smart caveman. All technical substance stay. Only fluff die.

## Persistence

ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift. Still active if unsure. Off only: "stop caveman" / "normal mode".

Default: **ultra**. Switch: `/caveman lite|full|ultra`.

## Rules

Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). Technical terms exact. Code blocks unchanged. Errors quoted exact.

Pattern: `[thing] [action] [reason]. [next step].`

Not: "Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by..."
Yes: "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"

## Intensity

| Level     | What change                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **lite**  | No filler/hedging. Keep articles + full sentences. Professional but tight                                                                                                                                          |
| **full**  | Drop articles, fragments OK, short synonyms. Classic caveman                                                                                                                                                       |
| **ultra** | Abbreviate prose words (DB/auth/config/req/res/fn/impl), strip conjunctions, arrows for causality (X → Y), one word when one word enough. Code symbols, function names, API names, error strings: never abbreviate |

Example — "Why React component re-render?"

- lite: "Your component re-renders because you create a new object reference each render. Wrap it in `useMemo`."
- full: "New object ref each render. Inline object prop = new ref = re-render. `useMemo`."
- ultra: "Inline obj prop → new ref → re-render. `useMemo`."

Example — "Explain database connection pooling."

- lite: "Connection pooling reuses open connections instead of creating new ones per request. Avoids repeated handshake overhead."
- full: "Pool reuse open DB connections. No new connection per request. Skip handshake overhead."
- ultra: "Pool = reuse DB conn. Skip handshake → fast under load."

## Auto-Clarity

Drop caveman when:

- Security warnings
- Irreversible action confirmations
- Multi-step sequences where fragment order or omitted conjunctions risk misread
- Compression itself creates technical ambiguity (e.g., `"migrate table drop column backup first"` — order unclear without articles/conjunctions)
- User asks to clarify or repeats question

Resume caveman after clear part done.

Example — destructive op:

> **Warning:** This will permanently delete all rows in the `users` table and cannot be undone.
>
> ```sql
> DROP TABLE users;
> ```
>
> Caveman resume. Verify backup exist first.

## Boundaries

Code/commits/PRs: write normal. "stop caveman" / "normal mode": revert. Level persist until changed or session end.

---

# Repository Guidelines

## Project Overview

Turborepo monorepo (bun workspaces):
- **`apps/frontend/`** — SvelteKit 5 UI (SSR + dashboard + chat)
- **`apps/gateway/`** — Hono + Remult + pi-ai backend (agent loop, SQLite, tools)
- **`packages/shared/`** — Remult entities + shared types

Users converse with LLM agents in sessions; messages persisted to SQLite via Remult ORM on the gateway. Frontend connects to gateway via Remult API client at `http://localhost:3001/api`. Dark petroleum/verdigris theme, shadcn-svelte UI, Tailwind CSS v4.

## Architecture & Data Flow

```
Browser (SvelteKit frontend)
  │
  │ remult.apiClient.url = 'http://localhost:3001/api'
  │ fetch() for BackendMethods
  ▼
Gateway (Hono + Remult + pi-ai)
  ├── api.ts       ── Remult API (bun:sqlite, entities, controllers)
  ├── encryption   ── AES-256-GCM key encrypt/decrypt
  ├── agent-service.ts  ── @BackendMethod controller: ask(), recoverMessages()
  └─ agent-runtime/     ── pi-ai loop, context building, tool execution
       └── tools/        ── Agent tool definitions (get-time, etc.)
       

SQLite (db.sqlite at repo root)
  ├── chatMessages
  ├── activeStreams
  └── providerSettings
```

**Data flow**: User sends message → frontend `POST /api/ask` → gateway `AgentService.ask()` → pi-ai `runStreamLoop` → LLM streaming → events update `ActiveStream` in DB → Remult SSE pushes changes to frontend live queries.

## Key Directories

| Path (apps/frontend/)        | Purpose                                                                |
| ---------------------------- | ---------------------------------------------------------------------- |
| `src/routes/`                | SvelteKit routes (layout, dashboard)                                   |
| `src/lib/stores/`            | Svelte 5 runes state (chat-session, nav-state, providers-state)        |
| `src/lib/components/`        | UI components (sidebar, chat, shadcn-svelte)                           |
| `src/lib/components/ui/`     | shadcn-svelte primitives (button, input, sidebar, dialog, ...)         |
| `src/hooks.server.ts`        | Server init: bootstrap encryption key, set remult.apiClient.url        |

| Path (apps/gateway/)         | Purpose                                                                |
| ---------------------------- | ---------------------------------------------------------------------- |
| `src/index.ts`               | Hono server entry (port 3001, CORS, routes)                            |
| `src/api.ts`                 | Remult API setup (bun:sqlite, entities, controllers, admin)            |
| `src/agent-service.ts`       | @BackendMethod controller (ask, provider CRUD, sessions)               |
| `src/agent-runtime/`         | pi-ai agent loop, context builder, tool definitions                    |
| `src/encryption.ts`          | AES-256-GCM server-side encryption for provider API keys               |
| `src/flue-session-store.ts`  | Flue agent session persistence (if used)                               |

| Path (packages/shared/)      | Purpose                                                                |
| ---------------------------- | ---------------------------------------------------------------------- |
| `src/entities/`              | Remult entity classes (ChatMessage, ActiveStream, ProviderSetting)     |
| `src/types.ts`               | Agent event types shared between gateway and frontend                  |

## Development Commands

```bash
# Root — starts both gateway + frontend
bun run dev          # turbo run dev

# Or individually:
cd apps/gateway && bun dev       # Hono server (port 3001)
cd apps/frontend && bun dev      # SvelteKit (port 5173)

# Type-check
cd apps/frontend && bun run check       # svelte-kit sync + svelte-check
cd apps/gateway && bunx tsc --noEmit    # gateway type check

# Build
bun run build        # turbo run build

# Utils
bun run format       # prettier --write .
bun run lint         # prettier --check .
```

## Code Conventions & Common Patterns

### Svelte 5 Runes (required — no legacy mode)

```svelte
<script lang="ts">
	let { children, data } = $props();
	let count = $state(0);
	let doubled = $derived(count * 2);
	$effect(() => { /* auto-track */ });
</script>
```

Runes mode forced via `svelte.config.js`.

### Remult Entities (packages/shared/)

Decorator-based ORM with auto-generated REST + live queries:

```ts
@Entity('chatMessages', { allowApiCrud: true })
export class ChatMessage {
	@Fields.id()
	id!: string;

	@Fields.string()
	role: 'user' | 'assistant' | 'tool' = 'user';
}
```

- `remult.repo(Entity)` for type-safe CRUD
- `remult.repo(Entity).liveQuery({ where, orderBy }).subscribe(...)` for real-time SSE updates
- Frontend imports entities from `@opaius/shared/entities/*.js`
- Gateway runs `@BackendMethod` controllers registered in `api.ts`

### Path Aliases

- `$lib` → `apps/frontend/src/lib/` (SvelteKit, configured in `.svelte-kit/tsconfig.json`)
- `@opaius/shared` → `../../packages/shared/src` (configured in `svelte.config.js` `kit.alias`)
- `@opaius/shared/entities/*` → resolved via `package.json` exports field

### Naming & Formatting

| Convention      | Detail                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------- |
| Indentation     | Tabs                                                                                        |
| Quotes          | Single                                                                                      |
| Trailing commas | None                                                                                        |
| File naming     | `kebab-case` for files, `PascalCase` for classes/components, `camelCase` for functions/vars |
| Svelte files    | `feature-name.svelte`, grouped in `ui/` for primitives                                      |

### CSS / Styling

- Tailwind CSS v4 (CSS-based config, no `tailwind.config.js`)
- `@import 'tailwindcss'` in `layout.css`
- `cn()` utility from `$lib/utils.ts` for conditional classes (`clsx` + `tailwind-merge`)
- shadcn-svelte "maia" style with remixicon icons
- Color scheme: oklch-based petroleum/verdigris (dark-only)

## Important Files

| File (apps/frontend/)                               | Purpose                                                   |
| --------------------------------------------------- | --------------------------------------------------------- |
| `svelte.config.js`                                  | SvelteKit config (adapter-node, alias for @opaius/shared) |
| `vite.config.ts`                                    | Tailwind plugin, SSR noExternal for hugeicons             |
| `tsconfig.json`                                     | Extends `.svelte-kit/tsconfig.json`, experimentalDecorators |
| `src/hooks.server.ts`                               | Bootstraps encryption key, sets remult.apiClient.url      |
| `src/lib/stores/chat-session.svelte.ts`             | Chat session state + gateway API calls                    |

| File (apps/gateway/)                                | Purpose                                                   |
| --------------------------------------------------- | --------------------------------------------------------- |
| `src/index.ts`                                      | Hono server entry (CORS, port 3001)                       |
| `src/api.ts`                                        | Remult API (bun:sqlite, entities, controllers)            |
| `src/agent-service.ts`                              | All @BackendMethod controllers                            |
| `src/encryption.ts`                                 | AES-256-GCM encrypt/decrypt                               |

| File (packages/shared/)                             | Purpose                                                   |
| --------------------------------------------------- | --------------------------------------------------------- |
| `src/entities/active-stream.ts`                     | ActiveStream entity (streaming state)                     |
| `src/entities/chat-message.ts`                      | ChatMessage entity (persisted messages)                   |
| `src/entities/provider-setting.ts`                  | ProviderSetting entity (encrypted API keys)               |
| `src/types.ts`                                      | Agent event types                                         |

## API Key Management

Keys managed through sidebar Providers UI — stored encrypted in SQLite via `ProviderSetting` entity. On each `ask()` request, gateway reads all configured providers, decrypts keys via `encryption.ts`, sets `process.env` for pi-ai to find via `getEnvApiKey()`.

## Runtime / Tooling Preferences

- **Runtime**: Bun (all commands via `bun`, never `npx`/`pnpm`/`npm`)
- **Monorepo**: Turborepo + bun workspaces
- **TypeScript**: v6, strict, `experimentalDecorators: true`
- **Module**: ESM (`"type": "module"` everywhere)
- **Module resolution**: bundler (frontend), NodeNext (gateway/shared)
- **Path aliases**: `$lib` (SvelteKit), `@opaius/shared` (workspace package)
- **Formatting**: Prettier only (tabs, single quotes, no trailing commas)
- **CSS**: Tailwind CSS v4
- **UI**: shadcn-svelte (maia style) + bits-ui
- **Icons**: Remixicon Svelte + Hugeicons
- **Font**: Outfit Variable
- **Database**: bun:sqlite via `remult/remult-bun-sqlite`
