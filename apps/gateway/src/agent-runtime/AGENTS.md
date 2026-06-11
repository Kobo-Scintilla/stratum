# Purpose

Manages the core pi-ai agent execution loop, tool definitions, prompt context building, and Headroom context compression.

# Ownership

- Agent Core Dev Team / Agent Runtime Agent

# Local Contracts

- Implements the agent loop using `@earendil-works/pi-ai` SDK.
- Manages real-time active streaming states (`ActiveStream`) in the SQLite database and handles tool callbacks.
- Integrates optional Headroom context compression via `headroom-manager.ts`.
- Persists headroom compression stats directly on historical `ChatMessage` records.

# Work Guidance

- **Tools**: Add new tool definitions under `tools/` and register them in `agent-tools.ts`.
- **Context**: Build system prompts and session history messages in `agent-context.ts`.
- **Streaming**: Handle server-sent event (SSE) updates, tool call starts/ends, and token usages in `agent-stream.ts`.
- **Headroom**: Configure proxy processes, auto-installation, and OpenAI format mapping in `headroom-manager.ts`.

# Verification

- Run gateway TypeScript compilation: `bunx tsc --noEmit` from the `apps/gateway` directory.

# Child DOX Index

_No child DOX indexes for this directory._
