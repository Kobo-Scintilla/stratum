# Research Report: Architecture Steals for Cioky's Agent Platform

Date: 2026-06-05
Sources: OhMyPie (omp), pi-hashline-readmap, Flue (@flue/runtime), RTK, OmniRoute

---

## 1. OhMyPie (omp) — Parallel Tool Execution

**Repo:** github.com/can1357/oh-my-pi
**Core engine:** ~27k lines Rust, TypeScript SDK layer

### How parallel execution works

OhMyPie uses a **`task` tool** — not a meta-tool, but a dedicated subagent fan-out mechanism:

```
task fans out into isolated worktrees
→ each worker runs its own tool surface
→ final yield is a schema-validated object
→ parent reads directly — no prose to parse, no merge conflicts
```

**Key details:**
- Workers can be workspace-isolated (separate worktree per worker)
- Returns typed results — validation schema, not natural language
- The same `task` tool is available to the LLM during prompts, so the AI itself can delegate parallel work
- `task` is a separate tool in the 32-tool surface, not a meta-tool wrapping others

### How the sandbox works (eval)

OhMyPie's `eval` tool is what Cioky described perfectly:
- Runs **persistent Python AND a Bun (JavaScript/TypeScript) worker**
- Either kernel can call back into the agent's own tools over a **loopback bridge**
- "The agent loads a CSV with `tool.read` from inside Python, charts it from JavaScript, and never leaves the cell."

**This is the exact pattern you want.** The sandbox can call `read`, `search`, `task` — the same tools the agent uses — but from inside code execution.

### Tool discovery
- 32 tools total, but you can pin the active set with `--tools read,edit,bash,...`
- Hidden tools stay indexed — `search_tool_bm25` pulls them back in mid-session when `tools.discoveryMode` triggers

---

## 2. Hash Line Edits — THE BEST IMPLEMENTATION

### Winner: pi-hashline-readmap (by coctostan)

**Repo:** github.com/coctostan/pi-hashline-readmap
**Why it wins:** It's the most mature, combined 5 tools into one package, and has ALL the features you want.

**Core mechanism: `LINE:HASH` anchors**
```
read({ path: "src/example.ts" })
→ "45:4bf|export function createDemoDirectory(): UserDirectory {"

edit({
  path: "src/example.ts",
  edits: [{
    set_line: { anchor: "45:4bf", new_text: "export function buildDemoDirectory(): UserDirectory {" }
  }]
})
```

**Hash algorithm:** xxHash32 on whitespace-stripped content → **whitespace-insensitive**. Indentation changes don't affect hash. References robust against reformatting.

**Stale-anchor detection:** Before writing, `edit` verifies the anchor against current file content. If file changed, reports mismatch instead of silently editing wrong line. Error shows updated `LINE:HASH` refs with `>>>` markers. Copy new refs, retry.

**What it replaces:** stock `read`, `edit`, `grep`, `ls`, `find` — all upgraded with hashline support.

### Critical features you need:

| Feature | What it does |
|---|---|
| **set_line** | Replace single line by `LINE:HASH` anchor |
| **replace_lines** | Replace a range of lines |
| **insert_after** | Insert after a specific hashline |
| **replace (fuzzy)** | Substring replace — no hashes needed, fallback |
| **replace_symbol** | Swap entire function/class/method by NAME — no anchors needed! Uses tree-sitter |
| **read with symbol** | Read just one function: `read({ path: "file.ts", symbol: "createDemo" })` |
| **read with map** | Structural map appended when large reads are truncated |
| **grep with scope** | `grep({ pattern: "...", scope: "symbol" })` — returns only enclosing symbol block |
| **ast_search** | Structural code queries (tree-sitter pattern matching) |
| **write** | Creates dirs automatically, returns hashline output for immediate refinement |

**The fluid workflow you want:**
1. `grep({ pattern: "auth", scope: "symbol" })` → finds function + returns anchored matches
2. `read({ path, symbol: "authenticate" })` → reads just that function, returns hashline anchors
3. `edit({ path, edits: [{ set_line: { anchor: "12:abc", new_text: "..." } }] })` → edits directly

**All from the same anchor reference. No extra lookups.**

### Bash compression (RTK)
Post-processes bash results — route-specific compression for:
- Test runners, builds, compilers, Git, linters, Docker, package managers, HTTP clients
- Configurable: `PI_RTK_BYPASS=1` to disable for a specific command
- Context guard: very large raw output replaced with recoverable preview

### Compare: OhMyPie's native edit
- Also hashline patches with content-hash anchors
- Stale-anchor recovery (same approach)
- 61% fewer output tokens for Grok 4 Fast
- BUT: less integrated than pi-hashline-readmap (no symbol-aware read, no replace_symbol)

### Compare: Direct
- Not as well documented publicly
- pi-hashline-readmap is the most mature, actively maintained, and well-documented option

**Verdict: Steal pi-hashline-readmap's architecture.** It already combines search + edit + read + symbol awareness + terminal compression in one fluid system.

---

## 3. Flue (@flue/runtime) — Sandbox Architecture

**Repo:** github.com/withastro/flue
**Creator:** Fred K Schott (created Astro)
**Current version:** ^0.9.1 (already in your package.json)

### Architecture overview

```
┌──────────────────────────────────┐
│         Flue Framework           │
│  ┌────────────────────────────┐  │
│  │        Harness             │  │
│  │  Model defaults + Tools    │  │
│  │  Sandbox + Filesystem      │  │
│  │  Sessions + Skills         │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │      Sandbox (3 modes)     │  │
│  │  ┌──────────────────────┐  │  │
│  │  │ Virtual (just-bash)  │  │  │
│  │  │ Fast, no container   │  │  │
│  │  ├──────────────────────┤  │  │
│  │  │ Local()              │  │  │
│  │  │ Host FS access       │  │  │
│  │  ├──────────────────────┤  │  │
│  │  │ Daytona containers   │  │  │
│  │  │ Full Linux env       │  │  │
│  │  └──────────────────────┘  │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### Key insight for your architecture

Flue's `session.task()` is **exactly** what you want for delegation:

```typescript
const research = await session.task('Research the auth flow', {
  cwd: '/workspace/project',
  agent: 'researcher',
});
const answer = await session.prompt(
  `Use this research: ${research.text}`
);
```

- Tasks share the same sandbox/filesystem
- Get their own message history
- Can discover AGENTS.md + skills from their working directory
- Same `task` tool available to the LLM during prompts

### Sandbox customization
```typescript
import { Bash, InMemoryFs } from 'just-bash';
const fs = new InMemoryFs();
const agent = createAgent(() => ({
  sandbox: () => new Bash({ fs, cwd: '/workspace', python: true }),
  model: 'anthropic/claude-sonnet-4-6',
}));
```

### Database & persistence
- On Cloudflare: backed by Durable Objects — persists across requests
- On Node: in-memory by default, but you can provide a custom store
- **You could plug your Remult/SQLite here as the custom store** → single source of truth

### Deployment model
- `flue build --target node` → single bundled .mjs
- `flue build --target cloudflare` → Cloudflare Workers + Durable Objects
- This maps to your SQLite → D1 swap plan perfectly

---

## 4. Headroom / RTK Compression

### What RTK does
- Route-specific compression for command output types:
  - Test output, build logs, git diffs, Docker output, linter output
  - Package manager output, HTTP client output, file listings
- Compresses in layers: first compress the type-specific parts, then general compression
- Recovery mechanism: compressed output can be replaced with preview + recovery link

### What pi-hashline-readmap does with RTK
- `details.rtkCompaction` metadata field on bash results
- `PI_RTK_BYPASS=1` env var to disable per-command
- Context guard: very large raw output replaced with recoverable preview
- ANSI stripped always; anti-pattern hints still apply

### Your approach: Combine headroom + search pattern
Your instinct is right. The two-layer approach works:
1. **Headroom** compresses structured data (JSON arrays, known formats) — reversible
2. **Search pattern** for what headroom can't compress efficiently — intent-based retrieval

**Missing piece:** pi-hashline-readmap's approach handles this by combining RTK compression + `read` symbol maps + `grep` symbol scoping. When the output can't be compressed, it limits context via structural awareness.

---

## 5. Summary: The Pieces Fit Together

### Your proposed tool set matches known patterns

| Your Tool | Closest Production Implementation |
|---|---|
| **Edit** (hashline) | pi-hashline-readmap's edit with `LINE:HASH` anchors |
| **Read** (intent + AST) | pi-hashline-readmap's `read({ symbol, map, bundle })` |
| **Terminal** (RTK compress) | pi-hashline-readmap's bash RTK + OhMyPie's native bash |
| **Execute Code** (JS sandbox) | OhMyPie's `eval` (Python+Bun loopback) + Flue's `session.task()` |
| **Search** (intent-based) | OhMyPie's `search_tool_bm25` + pi-hashline-readmap's `grep({ scope: "symbol" })` |
| **Parallel delegation** | OhMyPie's `task` tool + Flue's `session.task()` |
| **Intent system** | **Novel** — closest analog is `grep({ scope: "symbol" })` + `read({ symbol })` |

### Your edge over existing tools

1. **Intent parameter on every tool** — no one does this explicitly. Closest is OhMyPie's `search_tool_bm25` which uses BM25 to find tools by their descriptions, not content.
2. **One DB for everything** — everyone has their own local SQLite. Using Remult + a single database is genuinely novel for agent tooling.
3. **Edge deployment (SQLite → D1)** — Flue does this for sessions but not for tool data. Your approach of routing ALL tool state through one DB makes this work.
4. **Fluid search → edit pipeline** — pi-hashline-readmap comes closest but your "intent → search → hashline → edit" workflow with automatic dedup is not done anywhere.

### What to steal right now

1. **pi-hashline-readmap's LINE:HASH anchor system** — fork the concept. xxHash32 + whitespace stripping + stale detection + replace_symbol.
2. **OhMyPie's eval loopback bridge** — Python/JS workers calling agent tools from inside code execution.
3. **Flue's task/subagent model** — `session.task()` with shared sandbox + separate history.
4. **OhMyPie's RTK route-specific compression** — different compression strategies for test/git/build/docker output.

### Your existing project at `/root/dev/app`

You already have:
- SvelteKit + Tailwind v4 + shadcn-svelte
- `@flue/runtime` ^0.9.1 in dependencies
- Remult (`remult`) for API/ORM
- `better-sqlite3` for database
- `fallow` for dead code detection
- Agent service (`AgentService.ts`), entities (`FlueSession`, `ChatMessage`, `KnowledgeStore`, `ActiveStream`)
- Server tools: `search.ts`, `execute.ts`, `compress.ts`, `handoff.ts`, `index.ts`
- Engine (`engine.ts`), Headroom integration (`headroom.ts`), Flue integration (`flue.ts`)
- FTS5 search (`fts5.ts`)
- Test suite for tools

**You're already further along than you think.** The architecture is sound. Now it's about wiring the right patterns into your existing tool surface.
