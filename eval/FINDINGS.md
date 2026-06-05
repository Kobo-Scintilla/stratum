# Eval findings — 5-task head-to-head, 3 modes

**Run:** `2026-06-05T10-41-02Z` · model `b-opencodezen/deepseek-v4-flash-free` · 5 tasks × 3 modes

## Headline

| Mode | Success | Mean in_tok | Mean out_tok | Mean wall_ms |
|---|---|---|---|---|
| with-tools (execute / compress / search / index) | 4/5 (80%) | 21,279 | 1,110 | 19,469 |
| node-tools (shell / read_file / write_file) | 5/5 (100%) | 2,547 | 204 | 3,560 |
| no-tools (raw text only) | 2/5 (40%) | 134 | 1,682 | 17,863 |

`node-tools` wins on every metric. `with-tools` is 8× more expensive on input tokens than `node-tools` and *loses* one task to a tool-loop failure.

## Per-task breakdown

| Task | with-tools | node-tools | no-tools |
|---|---|---|---|
| small-lookup (lines in pkg.json) | PASS, 4K in, 2 tool calls | PASS, 2.1K in, 1 call | FAIL (answered 12 — model fabricated) |
| package-name ("name" field) | PASS, 7.5K in, 4 calls | PASS, 2.1K in, 1 call | PASS (model already knew "app") |
| dev-deps-count (count entries) | PASS, 38.8K in, 15 calls | PASS, 4.2K in, 2 calls | FAIL (answered 0) |
| has-svelte5 (svelte ≥ 5.55?) | **FAIL**, 48K in, 20 calls (hit turn cap) | PASS, 2.1K in, 1 call | FAIL (answered NO) |
| pkg-type ("type" field) | PASS, 8K in, 4 calls | PASS, 2.1K in, 1 call | PASS (model already knew "module") |

## What this is telling us

1. **The with-tools `execute` tool has a confusing schema.** The model tried `{"command": "cat package.json"}` (node-tools shape) on the with-tools surface and got empty errors back. It then tried `{language, code}` for a while, then `{}` empty, then back to `command`. The `execute` tool's parameters (`{language, code, intent, timeout}`) are not what a generic model guesses. The `shell` tool's parameters (`{command, timeout}`) are.

2. **The tool surface is too rich for simple shell tasks.** The model has 4 tools (execute, compress, search, index) when 90% of calls it actually needs is one. It explored `search` and `index` and `compress` on `has-svelte5` even though they have no business in that task. The compress() call in particular (`{"content":"test"}` — completely empty args) shows the model is grasping at straws.

3. **The auto-indexing / FTS5 / compress features are not paying for themselves on these tasks.** The tasks are all small-file reads. The "index large output" feature only matters when output is >5KB. None of these tasks trigger that path. We're paying the cost of the rich tool surface in tokens without ever using the rich behavior.

## What would actually demonstrate the design's value

The current task suite is too small and too file-heavy. To show the headroom + ctx-mode value proposition, we need tasks where:

- Output is genuinely large (>5KB) so auto-indexing kicks in
- The model needs to *recall* something from earlier in the session (compress + search)
- The model needs to find a specific section in a 50MB log (search-by-intent)

Add three more tasks:

4. **log-disk-errors** (large): "How many ERROR lines containing 'disk' in /tmp/eval-big.log?" — 50MB log, 100 hits. node-tools: `grep -c` reads the file. with-tools: `execute` should auto-index the 50MB output, then `search('disk error')` should return 100 BM25 hits. **This is where the rich tool surface should win** because node-tools has to return the whole grep output (10KB cap = silent truncation at ~250 lines).

5. **recall-rate-limit** (search-heavy): seed IndexedContent with 3 chunks, ask "what did the user say about the API rate limit?" — node-tools has no way to find this; with-tools can `search('rate limit')` and get a BM25 hit.

6. **multi-step-refactor** (multi-step): "Find all .ts files in src/ that import from 'remult' AND have a TODO comment" — node-tools runs two greps and a python join. with-tools can `execute(grep1)`, `compress(['found N files matching remult'])`, `execute(grep2)`, then `search('TODO')` to cross-reference.

## Concrete fixes the eval is pointing at

- **`execute` tool should accept `{command}` as a shorthand for `{language: 'shell', code: command}`.** It's a footgun that the model has to know the difference. Or, better: rename the tool and parameters so it's obvious. `shell({command, timeout})` is what every model tries first.
- **The system prompt for with-tools is too permissive.** The model explores tools that aren't relevant. Either constrain via `tool_choice` (only allow the right tool per task, but that's a static config) or trim the tool surface to `execute` (no `compress`/`search`/`index` until the model signals it needs them).
- **The 20-turn safety cap is too low for the with-tools path** (got hit on has-svelte5 with no real progress). Either raise it to 50 or make the system prompt say "use a SINGLE tool call when possible."

## Next steps

1. Add the 3 large/search/multi-step tasks to the suite.
2. Fix `execute` to accept `command` shorthand.
3. Re-run.
