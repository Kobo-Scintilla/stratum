# Purpose

Defines shared data structures, database entities, and TypeScript types used by both the frontend and gateway.

# Ownership

- Monorepo Core / Shared Package Maintainer

# Local Contracts

- All entities must be compatible with Remult decorator-based ORM.
- Entities are compiled and exported via `package.json` for consumption by `apps/frontend` and `apps/gateway`.
- Exports entities: `ChatMessage`, `ActiveStream`, `ProviderSetting`, `ChatSessionSettings`, `AppSettings`.

# Work Guidance

- Add/modify fields or validation rules in `src/entities/`.
- Declare shared TypeScript interfaces in `src/types.ts`.
- Keep entity schemas synchronized with DB migrations/alterations in `apps/gateway/src/api.ts`.
- Add `headroomTokensSaved` and `headroomRatio` to `ChatMessage` to record context compression history.
- Add `title` and `pinned` to `ChatSessionSettings` to persist session names and pinning status.
- Ensure all symbols are exported in `src/index.ts`.

# Verification

- Build shared package and monorepo: `bun run build`.

# Child DOX Index

_No child DOX indexes for this package._
