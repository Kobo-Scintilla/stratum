# Cioky's Agent Platform — Architecture Plan

## Core Vision

Build a sandboxed AI agent platform using **Flue's sandboxing** as the foundation. Key insight: sandbox AI agents wherever needed → route heavy computation to larger containers → users get personal "OpenClaw" without managing infrastructure → edge-deployed for speed.

**Value prop:** Platform, not VPS. Users install plugins, get their own agent. No server management.

---

## Guiding Principle

**Compress → Search → Retrieve (only what's needed)**

Every tool output follows this pipeline:
1. Compress with Headroom (reversible)
2. If compression is inefficient → fall back to search-intent pattern
3. Retrieve only the segments the AI actually needs

---

## Core Tools (the only 3 primitives)

| Tool | Mechanism |
|---|---|
| **Edit** | Hash line edits (steal best impl from OpenCode/OhMyPie/Direct) |
| **Read** | Intent-aware file reads + AST extraction for code files |
| **Terminal** | Headroom RTK compression for terminal output |
| **Execute Code** | JS sandbox (Flue) with exposed tool schemas + delegation |

Everything else (delegation, parallel tasks, multi-tool orchestration) happens **inside** Execute Code using JavaScript.

---

## Intent System (key innovation)

Every tool call carries an **intent** — a search query that pre-identifies what the AI needs from the output.

**Flow:** Tool called with intent → system already knows what AI is looking for → returns only relevant segments → fewer round trips.

**Example — Read file:**
- AI reads file with intent="find the authenticate function"
- System uses AST to extract only that function from the code
- Saves tokens on files with 20-30 functions

**Example — Search tool fallback:**
- Intent misses something → Search tool runs on original content
- Search only outputs text NOT already in context (no duplication)
- Full content retrieval available but returns only diff (rest already in context)

---

## Compression Strategy (layered)

1. **Headroom for structured data** → arrays, JSON → reversible compression
2. **Search pattern for unstructured** → what Headroom can't compress efficiently
3. **JSON tool output** → tuned decompression (not raw JSON in context)
4. **Execute Code sub-tools** → each sub-tool output compressed individually (not whole message)
5. **Terminal output** → Headroom RTK compression

**Watch out:** Sub-tool compression inside Execute Code limits AI context. Must have search fallback for when AI needs full output (string searches, etc.)

---

## Database Architecture

**Single source of truth. Remote everything.**

| Layer | Tech | Why |
|---|---|---|
| **Primary DB** | SQLite (via better-sqlite3) | Local dev |
| **Edge swap** | D1 adapter | Cloudflare Workers deployment |
| **Memory** | Mnemosyne | Fast benchmarks |
| **ORM** | Remult | Single model definition → HTTP API |
| **Persistence rule** | All tools use the *same* DB | No tool-local SQLite (Headroom, Mnemosyne must use central DB) |

**Design for distributed:** If every tool uses the central DB, swapping SQLite → D1 means the whole system becomes distributed automatically.

---

## Hash Line Edits (research targets)

Need to investigate 3 implementations:
- **OpenCode** plugin — hash-based line editing
- **OhMyPie** — hash line edits
- **Direct** — hash line edits

**Why:** Combined with search → AI searches for what it needs → has the hashline → edits directly. Fluid workflow.

---

## Parallel Tool Execution (research)

How does **OhMyPie** handle parallel tools? Meta-tool calling sub-tools? This pattern is what Cioky wants to replicate inside Execute Code.

---

## Tool Schemas inside Execute Code

Rather than making tools as schemas the AI picks from, expose them inside the JS sandbox:
- AI writes code to call tools
- Can orchestrate: sequential, parallel, whatever
- Delegation happens in code → context efficient
- Each sub-tool output compressed individually

---

## Key Constraints

1. **No AI coding for me** — I (Cioky) build the UI myself
2. **Steal architecture** — don't reinvent, combine best patterns
3. **One DB to rule them all** — remote everything
4. **Round trips minimized** — intent system + search fallback
5. **Edge-ready** — SQLite → D1 swap

---

---

## Multi-Agent Architecture (v2 — 2026-06-05)

### Agent Types

| Agent | Model Cost | Tools | Role |
|---|---|---|---|
| **Observer** | Cheapest possible | None (or verify-only) | Heartbeat-only. Minimal context. Monitors other agents, alerts user on failure. NOT orchestrator. |
| **Production Orchestrator** | Smartest | Full toolset | Orchestrates project-level work. Business/production focused. Can call agent-creator. |
| **Personal Agent** | Dumb/cheap | Execute code + search only | Daily chat companion (like current Hermes). Can have own subagents for research. Isolated but can ping orchestrator for updates. |
| **Agent Creator** | Smartest model | Instructions + tool schemas | Creates new agent personalities at runtime. Given a task description, builds context-efficient prompts + selects tools. Ships with pre-built agents but can invent combined personalities. |

### Canvas Visualization

Hierarchical view top-to-bottom + sibling view left-to-right:
```
        ┌──────────────────┐
        │   Orchestrator    │
        │  (production)     │
        └──────┬──────┬────┘
          ┌────┘      └────┐
     ┌────┴────┐     ┌────┴────┐
     │Researcher│     │  Agent  │
     │  (x10)  │     │ Creator │
     └─────────┘     └─────────┘
                          │
                     ┌────┴────┐
                     │ NewAgent │
                     │ (dynamic)│
                     └─────────┘

Sibling agents talk to each other. User sees every agent's state in real-time.
```

### Observer Pattern

Not every agent has a heartbeat. **Only one Observer** — separate process, separate model:
- Minimal context, minimal tools
- No orchestration duties
- Just: verify agents are running → if not, figure out why → send message to user / ping / alert
- Cron-triggered or interval-based

### Cron Job Visibility

Users see every cron job:
- What code runs
- What happened last run
- Current state
- Inspired by how E2B exposes execution

Every cron job is visible in the canvas, not hidden in config.

### Runtime Agent Creation (the novel part)

Orchestrator calls Agent Creator when it needs a new personality:
1. Agent Creator receives: task description, constraints, required tools
2. Responds with: agent definition (instructions, tool selection, model choice, context budget)
3. Orchestrator instantiates it via an in-memory agent registry
4. New agent appears in the canvas hierarchy

Pre-built agents ship by default. Agent Creator handles the edge cases where no pre-built fits.

### Architecture Decision: Flue as Foundation

**Verdict (2026-06-05): Flue stays. It's the best fit.**

Why:
- Only TypeScript framework with native Cloudflare Workers + Durable Objects
- Multiple harnesses per workflow → maps to multiple orchestrator types
- `defineAgentProfile()` for static subagents
- `session.task()` for delegation
- Already integrated (Remult, 4 custom tools, Bifrost routing)
- Veld frontend can share Cloudflare instance

What Flue doesn't provide (Cioky builds):
- Runtime agent creation (custom tool + in-memory registry)
- Observer heartbeat (workflow + cron trigger)
- Canvas hierarchy UI (SvelteKit pipes agent events)
- Cron job visibility (Remult entity + UI)
- Hashline edits (port pi-hashline-readmap ~500 LOC)

### Research Log

**2026-06-05:** OhMyPie parallel tools use `task` tool with fan-out subagents. Hashline edits winner = pi-hashline-readmap (LINE:HASH anchors, xxHash32, stale detection, replace_symbol). Flue verified as right foundation. Full report at `RESEARCH-report.md`.
