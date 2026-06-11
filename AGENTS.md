# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:

- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

---

## Project Overview & Architecture

This is a Turborepo monorepo using Bun workspaces:

- **`apps/frontend/`** — SvelteKit 5 UI (SSR + dashboard + chat)
- **`apps/gateway/`** — Hono + Remult + pi-ai backend (agent loop, SQLite, tools)
- **`packages/shared/`** — Remult entities + shared types

### Architecture & Data Flow

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

**Data Flow**: User sends message → frontend `POST /api/ask` → gateway `AgentService.ask()` → pi-ai `runStreamLoop` → LLM streaming → events update `ActiveStream` in DB → Remult SSE pushes changes to frontend live queries.

---

## Project-Wide Code Conventions & Style

| Convention      | Detail                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------- |
| Indentation     | Tabs                                                                                        |
| Quotes          | Single                                                                                      |
| Trailing commas | None                                                                                        |
| File naming     | `kebab-case` for files, `PascalCase` for classes/components, `camelCase` for functions/vars |
| Package Manager | Bun (`bun run dev`, `bun run build`, etc.)                                                  |
| TypeScript      | v6, strict mode, ESM modules, `experimentalDecorators: true`                                |

---

## Development Commands

```bash
# Start both gateway and frontend
bun run dev          # Runs turbo run dev

# Run individual components
cd apps/gateway && bun dev       # Hono server (port 3001)
cd apps/frontend && bun dev      # SvelteKit (port 5173)

# Linting & Formatting
bun run format       # prettier --write .
bun run lint         # prettier --check .

# Type-check
cd apps/frontend && bun run check
cd apps/gateway && bunx tsc --noEmit

# Build
bun run build        # turbo run build
```

---

## LLM Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- Push back on overcomplications. Name what's confusing.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked. No abstractions for single-use code.
- No error handling for impossible scenarios.
- Keep components focused and simple.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

- Don't modify adjacent code, comments, or formatting unless requested.
- Match existing style.
- Remove imports/variables/functions that your changes made unused.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

- State a brief plan before multi-step tasks:
  ```
  1. [Step] → verify: [check]
  2. [Step] → verify: [check]
  ```
- Write reproduction tests for bugs first, then implement the fix.

### Terse Communication (Caveman Mode)

Respond terse like smart caveman. All technical substance stays. Only fluff dies.

- **Rules**: Drop articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK.
- **Pattern**: `[thing] [action] [reason]. [next step].`
- **Intensity Level**: Default is **ultra** (abbreviate prose words, strip conjunctions, use arrows for causality).
- **Auto-Clarity**: Resume normal communication during security warnings, irreversible confirmations, or where fragment order risks technical ambiguity.

---

## Child DOX Index

- [apps/frontend](file:///home/cioky/Projects/app/apps/frontend/AGENTS.md) — SvelteKit 5 UI dashboard, chat interfaces, and stores.
- [apps/gateway](file:///home/cioky/Projects/app/apps/gateway/AGENTS.md) — Hono and Remult gateway backend server.
  - [apps/gateway/src/agent-runtime](file:///home/cioky/Projects/app/apps/gateway/src/agent-runtime/AGENTS.md) — The pi-ai loop, tool runner, context builder, and Headroom compression.
- [packages/shared](file:///home/cioky/Projects/app/packages/shared/AGENTS.md) — Database entity definitions and shared Typescript interfaces.
