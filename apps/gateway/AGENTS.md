# Purpose

Hono + Remult backend providing the REST endpoints, live query database sync, and agent execution control.

# Ownership

- Gateway Backend Dev Team / Gateway Backend Agent

# Local Contracts

- Port: Runs on port `3001`.
- Database: Interacts with `db.sqlite` at the repo root using `remult/remult-bun-sqlite`.
- API Security: Key management is encrypted via AES-256-GCM server-side (`encryption.ts`).
- Workspace: Agent tools (read, write, edit, search, bash) are restricted/scoped to `~/.stratum/workspace`.
- Headroom: Auto-managed proxy resides in `~/.stratum/headroom-venv`.
- CORS: Restricts origin to `http://localhost:5173`.


# Work Guidance

- Register Remult entities and controllers in `src/api.ts`.
- Expose controller routes or CRUD endpoints via `@BackendMethod` in `src/agent-service.ts`.
- Manage CORS and health check endpoints in `src/index.ts`.
- Securely encrypt and decrypt keys using the functions in `src/encryption.ts`.

# Verification

- Run type checking: `bunx tsc --noEmit` inside the `apps/gateway` directory.

# Child DOX Index

- [src/agent-runtime](file:///home/cioky/Projects/app/apps/gateway/src/agent-runtime/AGENTS.md) — The pi-ai loop, tool runtime, context builder, and Headroom module (`headroom/` directory).
