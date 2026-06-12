<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/Kobo-Scintilla/stratum/raw/main/apps/frontend/static/logo.png">
    <img src="https://github.com/Kobo-Scintilla/stratum/raw/main/apps/frontend/static/logo.png" alt="Stratum" width="120">
  </picture>
</p>

<h1 align="center">Stratum</h1>

<p align="center">
  <b>Agentic runtime & chat dashboard by <a href="https://github.com/Kobo-Scintilla">Kobo Scintilla</a></b><br>
  <i>SvelteKit 5 · Hono · Remult · pi-ai · Headroom</i>
</p>

<p align="center">
  <a href="#-whats-done"><img src="https://img.shields.io/badge/status-active-22d3ee?style=flat-square" alt="Status"></a>
  <a href="#-work-in-progress"><img src="https://img.shields.io/badge/WIP-7_items-a78bfa?style=flat-square" alt="WIP"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-non--commercial-34d399?style=flat-square" alt="License"></a>
</p>

---

Stratum is a hybrid human–AI development runtime. Chat UI + agent loop + tool sandbox + context compression + reversibility safety gates.

---

## 🧱 System Architecture

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/Kobo-Scintilla/stratum/raw/main/docs/architecture.svg">
    <img src="https://github.com/Kobo-Scintilla/stratum/raw/main/docs/architecture.svg" alt="Stratum Architecture" width="100%">
  </picture>
</p>

- **Frontend** — SvelteKit 5. Chat UI, session list, provider manager, settings. Dark petroleum/teal theme. Live queries via Remult SSE.
- **Gateway** — Hono HTTP server on port 3001. Remult REST + admin UI. Agent lifecycle, encryption, CORS.
- **Agent Runtime** — pi-ai `streamSimple` loop. Text deltas, tool round-trips, thinking markers, errors.
- **Headroom** — Optional context compression via `headroom-ai[proxy]`. Auto Python venv. Per-session config.
- **Git Checkpoints** — Auto-commit workspace before tool exec. One-click rollback in UI.

---

## 🗄️ Data Model

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/Kobo-Scintilla/stratum/raw/main/docs/data-model.svg">
    <img src="https://github.com/Kobo-Scintilla/stratum/raw/main/docs/data-model.svg" alt="Data Model" width="100%">
  </picture>
</p>

Five Remult entities. SQLite with WAL mode. Indexed on `sessionId` and `sortOrder`.

---

## ✅ What's Done

### Chat Dashboard
- Message list — streaming, thinking blocks, tool call cards, Markdown
- Session sidebar — list, create, rename, pin, delete
- Provider sidebar — search 30+ providers, add custom, set API key, enable/disable
- Settings panel — default model, thinking level, Headroom toggles, title summary
- Live query SSE sync — real-time UI
- Mobile-responsive sidebar sheet
- Dark theme (AI Slate + Neon Teal + Verdigris)
- Token usage stats per message

### Agent Execution
- pi-ai streaming loop with multi-turn tool execution
- Tool sandbox: `read`, `write`, `edit`, `bash`, `search` (grep+find), `get_time`
- All tools scoped to `~/.stratum/workspace`
- Tool call round-trips: LLM → tool → result → LLM → done
- Throttled SSE updates (100ms) to ActiveStream in DB

### Headroom Compression
- Auto Python detection, venv creation, `headroom-ai[proxy]` install
- Spawn proxy, health check polling, graceful SIGTERM
- pi-ai ↔ Headroom message format bridge
- Session-level overrides: enabled, code AST, kompress model, CCR
- Streaming install UI via SSE
- Compression stats saved to ActiveStream + ChatMessage

### RBAG Safety Gates (Git Checkpoints)
- `createCheckpoint()` — git init, commit dirty state
- `rollbackToCheckpoint()` — hard reset + clean, restore user dirty state
- `completeCheckpoint()` — soft reset, merge user + agent changes
- Integrated in `runStreamLoop()`: checkpoint before tools, finalize on new turn
- `[Rollback Changes]` button in ChatMessage UI
- Tests: 4 cases (clean, dirty, rollback, complete)

### Provider Management
- 30+ built-in: OpenAI, Anthropic, Google, Groq, DeepSeek, Mistral, OpenRouter, etc.
- Custom providers — baseUrl, apiType, model list
- AES-256-GCM key encryption with scrypt
- Per-provider enable/disable

### Thinking / Reasoning
- Levels: off / minimal / low / medium / high / xhigh
- Stream parsing for `<|THINK_START|>` / `<|THINK_END|>`
- Thought filtering
- `AgentActivity` component — thinking + tool call display
- Collapsible thinking blocks

---

## 🚧 Work In Progress

| Feature | What it will do |
|---------|----------------|
| **Mnemosyne Tiered Memory** | 4 scoped layers: Global → Project → Agent-Type → Session. Currently only session history exists. |
| **Subagent DAG** | Parent-child delegation tree, branching execution, shared learning pool. Registry exists but only one agent. |
| **Mirage VFS** | Mount Gmail, Slack, GitHub, Postgres as virtual directories under `/mount/mirage/`. Agents use `read`/`write`/`grep`. |
| **Electrobun Desktop** | Native desktop shell. System tray, global hotkeys, shell hooks. |
| **SSHFS Remote Sync** | Mount remote VMs via SSH. Real-time file sync. |
| **DeepResearch Mode** | Crawling agents for concurrent web search, API doc indexing, code ingestion. |
| **Subagent Kanban UI** | Visual branching graph + Kanban board. |

---

## 📁 Monorepo Structure

```
stratum/
├── apps/
│   ├── frontend/        # SvelteKit 5 UI
│   │   ├── src/lib/components/     # Chat, sidebar, UI
│   │   ├── src/lib/stores/         # Svelte 5 runes
│   │   ├── src/lib/server/         # Encryption
│   │   ├── src/routes/             # Dashboard, API
│   │   └── static/                 # Logo, favicon
│   ├── gateway/          # Hono + Remult + pi-ai
│   │   └── src/
│   │       ├── agent-runtime/      # Loop, tools, headroom, checkpoints
│   │       ├── agent-service.ts    # Remult controller
│   │       ├── api.ts              # Remult API
│   │       ├── encryption.ts       # AES-256-GCM
│   │       └── index.ts            # Hono entry
├── packages/
│   └── shared/          # Entities & types
├── docs/
│   ├── architecture.svg
│   ├── agent-loop.svg
│   └── data-model.svg
├── build/
├── turbo.json
└── package.json
```

---

## 🚀 Quick Start

```bash
# Prerequisites: bun, node 20+, python3 (for Headroom)

bun install
bun run dev                    # Gateway :3001 + SvelteKit :5173
cd apps/gateway && bun dev     # Gateway only
cd apps/frontend && bun dev    # Frontend only
bun run build
cd apps/gateway && bun test
```

**Environment:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `GATEWAY_PORT` | `3001` | Gateway port |
| `DATABASE_URL` | `db.sqlite` | SQLite path |
| `ENCRYPTION_KEY` | (auto) | AES-256-GCM for keys |
| `HEADROOM_BASE_URL` | `http://127.0.0.1:5050` | Headroom proxy |
| `STRATUM_WORKSPACE_DIR` | `~/.stratum/workspace` | Tool sandbox |

---

## 🧪 Tests

```bash
cd apps/gateway && bun test
# src/agent-runtime/__tests__/git-checkpoint.test.ts
# src/agent-runtime/headroom/__tests__/headroom.test.ts
```

---

<p align="center">
  <sub>Built by <a href="https://github.com/Kobo-Scintilla">Kobo Scintilla</a> · Pre-alpha · 2026</sub>
</p>
