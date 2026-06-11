# Purpose

Manages the core pi-ai agent execution loop, tool definitions, prompt context building, and Headroom context compression.

# Ownership

- Agent Core Dev Team / Agent Runtime Agent

# Local Contracts

- Implements the agent loop using `@earendil-works/pi-ai` SDK.
- Manages real-time active streaming states (`ActiveStream`) in the SQLite database and handles tool callbacks.
- Integrates optional Headroom context compression via `headroom/` module (index, proxy, format-bridge).
- Headroom uses session override first, then `AppSettings.defaultHeadroomEnabled`, then `true`; passes the selected model and optional token budget to the proxy.
- Headroom proxy URL is read from `HEADROOM_BASE_URL` first, then `HEADROOM_URL`, then the local default port.
- Persists headroom compression stats directly on historical `ChatMessage` records.

# Work Guidance

- **Tools**: Add new tool definitions under `tools/` and register them in `agent-tools.ts`.
- **Headroom**: Configure proxy processes, auto-installation, model/token-budget forwarding, and OpenAI format mapping in `headroom/` directory (`index.ts`, `proxy.ts`, `format-bridge.ts`).
- **Streaming**: Handle server-sent event (SSE) updates, tool call starts/ends, and token usages in `agent-stream.ts`.

# Verification
- Run gateway TypeScript compilation: `bunx tsc --noEmit` from the `apps/gateway` directory.
- Run focused Headroom tests: `bun test src/agent-runtime/headroom/__tests__/headroom.test.ts` from the `apps/gateway` directory.

# Child DOX Index

_No child DOX indexes for this directory._
