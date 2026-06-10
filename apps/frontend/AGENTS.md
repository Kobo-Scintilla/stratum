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

Code/commits/PRs: write normal. "stop caveman" or "normal mode": revert. Level persist until changed or session end.

---

# Repository Guidelines

## Project Overview

AI chat dashboard built with SvelteKit 5 + Flue agent runtime. Users converse with LLM agents in sessions; messages persisted to SQLite via Remult ORM. The app uses a dark petroleum/verdigris theme, shadcn-svelte UI, and Tailwind CSS v4.

## Architecture & Data Flow

```
Browser (SvelteKit frontend)
  │
  ▼ load() / form actions / fetch
SvelteKit server
  ├── hooks.server.ts  ──  Env proxy ($env/dynamic/private → process.env), Remult handler
  ├── api/[...remult]  ──  Remult CRUD REST (entities + controllers)
  │
  ├── $lib/server/
  │   └── api.ts       ──  Remult API setup (SQLite, entities, admin UI)
  │
  ├── $lib/shared/
  │   ├── types.ts          ──  Agent event types
  │   ├── services/
  │   │   └── agent-service.ts  ──  Remult controller: ask(), recoverMessages()
  │   ├── stores/
  │   │   ├── chat.svelte.ts    ──  Chat session state (createChatSession)
  │   │   └── create-query.svelte.ts  ──  createQuery rune helper
  │   ├── entities/
  │   │   ├── active-stream.ts  ──  ActiveStream entity
  │   │   └── chat-message.ts   ──  ChatMessage entity
  │   └── components/
  │       ├── chat/             ──  Chat UI components (ChatInput, ChatStream, ...)
  │       └── sidebar-*.svelte  ──  Sidebar components
  │
  └── routes/
      ├── +layout.svelte    ──  Root layout, nav state init
      ├── dashboard/        ──  Dashboard layout (sidebar + content)
      └── api/[...remult]   ──  Remult REST endpoint catch-all

tools-archive/   ──  Flue agent tools (execute, compress, search, handoff)

SQLite (db.sqlite)
  └── chatMessages, activeStreams  ──  Remult-managed tables
      indexedContent, compressedArtifact  ──  Knowledge store
      chunks_fts (FTS5)     ──  Full-text search virtual table
```

**Data flow**: User sends message → `AgentService.ask()` → pi-ai `runAgentLoop` → LLM streaming → events update `ActiveStream` in DB → live queries push to UI.

**Two SQLite handles**: `api.ts` owns the primary connection (Remult entities); `execute.ts`/`search.ts` open a second for FTS5 MATCH queries.

## Key Directories

| Path                       | Purpose                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `src/lib/server/`          | Server-only modules: Flue runtime init, agent config, Remult API setup                    |
| `src/lib/shared/`          | Shared code: Remult entities, AgentService, chat session, types, FlueSessionStore         |
| `src/lib/shared/entities/` | Remult entity classes (ActiveStream, ChatMessage, FlueSession)                            |
| `src/lib/stores/`          | Svelte 5 runes-based state (nav-state, persisted to localStorage + cookie)                |
| `src/lib/components/`      | Svelte 5 components (app-sidebar, sidebar-nav, sidebar-session-list + shadcn-svelte UI)   |
| `src/lib/components/ui/`   | shadcn-svelte UI primitives (button, input, sidebar, sheet, tooltip, separator, skeleton) |
| `src/lib/hooks/`           | Svelte 5 runes hooks (IsMobile media query)                                               |
| `src/routes/`              | SvelteKit routes (layout, dashboard, Remult API catch-all)                                |
| `tools-archive/`           | Custom Flue agent tools (execute, compress, search/index, handoff)                        |
| `tools-archive/__tests__/` | Tool unit tests and integration tests                                                     |

## Development Commands

```bash
bun run dev       # Start dev server (vite dev --host 0.0.0.0)
bun run build     # Production build (vite build)
bun run preview   # Preview production build
bun run check     # svelte-kit sync + svelte-check (type-check)
bun run lint      # prettier --check .
bun run format    # prettier --write .
bun run prepare   # svelte-kit sync (run after pull/clone)
```

Test files live in `tools-archive/__tests__/` and use `node:test`:

```bash
bun tools-archive/__tests__/tools.test.ts
bun tools-archive/__tests__/execute_auto_index.test.ts
bun tools-archive/__tests__/new-wiring.test.ts
```

## Code Conventions & Common Patterns

### Svelte 5 Runes (required — no legacy mode)

```svelte
<script lang="ts">
	let { children, data } = $props(); // component props
	let count = $state(0); // reactive state
	let doubled = $derived(count * 2); // derived
	$effect(() => {
		/* auto-track */
	}); // side effects
</script>
```

Runes mode forced via `svelte.config.js` (`runes: ({ filename }) => ...`).

### Remult Entities

Decorator-based ORM with auto-generated REST + live queries:

```ts
@Entity('chatMessages', { allowApiCrud: true })
export class ChatMessage {
	@Fields.id()
	id!: string;

	@Fields.string()
	role: 'user' | 'assistant' | 'tool' = 'user';
	// ...
}
```

- `remult.repo(Entity)` for type-safe CRUD
- `remult.repo(Entity).liveQuery({ where, orderBy }).subscribe(...)` for real-time UI
- Controller methods via `BackendMethod` decorator on classes in `AgentService.ts`

### Global Singletons for Cross-Module Access

```ts
// app.d.ts
declare global {
	var flue: FlueBridge | undefined;
	var remultApi: { withRemult(event, what): Promise<void> } | undefined;
}
```

Set at module import time (`server/flue.ts`, `server/api.ts`). Used by tools and services to bridge into Flue/Remult runtime context.

### `withRemult` Context Wrapper

Any async code calling `remult.repo()` outside a request cycle must wrap:

```ts
globalThis.remultApi.withRemult(undefined, async () => {
  await remult.repo(Entity).insert({...});
});
```

Used in `FlueSessionStore`, `execute.ts`, `compress.ts`, `search.ts`.

### Path Aliases

- `$lib` → `src/lib/` (all imports: `$lib/server/engine`, `$lib/shared/types`, etc.)
- `$app/*` → SvelteKit environment modules (`$app/environment`, `$app/forms`, etc.)

### Naming & Formatting

| Convention      | Detail                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------- |
| Indentation     | Tabs                                                                                        |
| Quotes          | Single                                                                                      |
| Trailing commas | None                                                                                        |
| Print width     | 100                                                                                         |
| File naming     | `kebab-case` for files, `PascalCase` for classes/components, `camelCase` for functions/vars |
| Svelte files    | `feature-name.svelte`, grouped in `ui/` for primitives                                      |
| Decorator order | `@Entity` on class, `@Fields.*` on fields                                                   |

### CSS / Styling

- Tailwind CSS v4 (CSS-based config, no `tailwind.config.js`)
- `@import 'tailwindcss'` in `layout.css`
- Utility classes + custom CSS properties via `@theme inline { }`
- `cn()` utility from `$lib/utils.ts` for conditional classes (`clsx` + `tailwind-merge`)
- shadcn-svelte "maia" style with remixicon icon library
- Color scheme: oklch-based petroleum/verdigris (dark-only)
- Custom scrollbars, grid background on body, glow animations

### Tool Patterns (tools-archive/)

Each tool:

1. Exported via `defineTool({ name, description, params, execute })` from `@flue/runtime`
2. Lazy-imports `api.ts` via `ensureRemult()` when `globalThis.remultApi` is absent
3. Wraps Remult ops in `runInRemultContext(fn)`
4. Barrel-exported from `tools-archive/index.ts`

## Important Files

| File                                       | Purpose                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `svelte.config.js`                         | SvelteKit config (Node adapter, runes mode forced)                                                                  |
| `vite.config.ts`                           | Vite config (Tailwind CSS v4 plugin, SSR noExternal for hugeicons)                                                  |
| `tsconfig.json`                            | TS strict mode, experimentalDecorators, extends `.svelte-kit/tsconfig.json`                                         |
| `.prettierrc`                              | Prettier: tabs, single quotes, no trailing commas, 100 width                                                        |
| `src/hooks.server.ts`                      | Server init: bootstraps encryption key, wires Remult handler                                                        |
| `src/lib/server/api.ts`                    | Remult API: SQLite connection, entity registration, admin UI                                                        |
| `src/lib/shared/services/agent-service.ts` | Main Remult controller: `ask()`, `recoverMessages()`, `listSessions()` — uses pi-ai directly                        |
| `src/lib/shared/entities/active-stream.ts` | ActiveStream entity (streaming state during agent turns)                                                            |
| `src/lib/shared/entities/chat-message.ts`  | ChatMessage entity (persisted messages)                                                                             |
| `src/lib/shared/types.ts`                  | Agent event types (`text_delta`, `tool_call`, `error`, etc.)                                                        |
| `src/lib/stores/chat.svelte.ts`            | Svelte 5 runes chat session (createChatSession)                                                                     |
| `tools-archive/`                           | Flue agent tools (execute, compress, search/index, handoff)                                                         |

## API Key Management (Sidebar Providers)

API keys are managed through the sidebar Providers UI — stored encrypted in SQLite via `ProviderSetting` entity, never in `.env` or hardcoded.

On each `ask()` request, `agent-service.ts` reads all configured providers from DB, decrypts their keys, and sets `process.env` for pi-ai to pick up via `getEnvApiKey()`. This way keys are managed at runtime through the UI, not at deploy time.

## Runtime / Tooling Preferences

- **Runtime**: Bun
- **Package manager**: Bun
- **TypeScript**: v6, strict mode, `experimentalDecorators: true` (for Remult decorators)
- **Module system**: ESM (`"type": "module"`)
- **Module resolution**: bundler
- **Path aliases**: `$lib` → `src/lib/` (SvelteKit convention)
- **Linting/formatting**: Prettier only (no ESLint — `.prettierrc` and `.prettierignore`)
- **Static analysis**: Fallow (cyclomatic ≤20, cognitive ≤15, gate: new-only)
- **CSS framework**: Tailwind CSS v4 (import-based config, Vite plugin)
- **UI library**: shadcn-svelte (maia style) + bits-ui
- **Icons**: Lucide Svelte + Remixicon Svelte
- **Font**: Outfit Variable

## Testing & QA

- **Framework**: Node.js built-in `node:test` + `node:assert/strict`
- **Runner**: `bun <test-file>` (natively runs TypeScript + ESM)
- **No test runner config** — run test files directly
- Tests live in `tools-archive/__tests__/` alongside the code they test
- Test patterns: `describe`/`it` blocks, `assert.strictEqual`/`assert.ok`/`assert.rejects`
- Tests create/truncate `db.sqlite` — must run from project root
- No UI/component testing yet (no Playwright, no Vitest)
- No coverage thresholds defined

### Running tests

```bash
bun tools-archive/__tests__/tools.test.ts
bun tools-archive/__tests__/execute_auto_index.test.ts    # needs db.sqlite
bun tools-archive/__tests__/new-wiring.test.ts            # needs db.sqlite
bun tools-archive/__tests__/handoff.test.ts
bun tools-archive/__tests__/debug_index.test.ts
bun tools-archive/__tests__/compression-benchmark.ts
```
