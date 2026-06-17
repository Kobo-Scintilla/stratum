# Purpose

Shared Remult entity definitions and types used by both gateway and frontend.

# Ownership

- Shared Package Team / Shared Package Agent

# Local Contracts

- Entities use Remult decorators (`@Entity`, `@Fields`, etc.).
- All entities use `allowApiCrud: true` — API-level auth is enforced by gateway Remult config.
- Controllers mirror gateway BackendMethods with `clientOnly()` stubs for frontend type safety.

## Entities

| Entity | Table | Key Fields |
|--------|-------|------------|
| `ChatMessage` | `chatMessages` | sessionId, ownerId, role, content, sortOrder, usage/cost fields, checkpointHash |
| `ChatSessionSettings` | `chatSessionSettings` | id (sessionId), ownerId, visibility (private\|shared), model config, title, pinned |
| `ActiveStream` | `activeStreams` | sessionId, prompt, text, isGenerating, segments, toolCalls |
| `ProviderSetting` | `providerSettings` | id, apiKey (encrypted), enabled, baseUrl, apiType, models |
| `AppSettings` | `appSettings` | id (always '_defaults'), default model config, title summary model |
| `BuddyMessage` | `buddyMessages` | fromUserId, toUserId, content, createdAt, read |

## Controllers

| Controller | Key Methods |
|------------|-------------|
| `AgentService` | ask, listSessions, deleteSession, renameSession, togglePinSession, toggleSessionVisibility, provider management, headroom features |

# Work Guidance

- Add new entities to `src/entities/` and re-export from `src/index.ts`.
- Add new BackendMethod stubs to `src/controllers/agent-service.ts`.
- After modifying entities, run `bunx tsc --noEmit` in gateway and `bun run check` in frontend.

# Child DOX Index

(none)
