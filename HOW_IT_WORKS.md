# How this system actually works

Personal reading notes. This is not the talk script (`DEMO_SCRIPT.md`) and not the engineering constitution (`AGENTS.md`). It is a walkthrough of what is in the repo *right now*, so you can explain it without flipping through six files.

---

## 1. What you built, in one sentence

Three independent coding agents, same five tools, same local model — wrapped in **nothing**, then **validation + a human gate**, then **the same gate with tools moved into an MCP process**.

The club talk is not “look at a chatbot.” It is:

> Small local models will call tools. A schema on the request is not a runtime. If you do not check arguments and do not pause dangerous calls, the model is already executing on your machine.

---

## 2. The one idea that unlocks everything

All three demos are the **same loop**:

```text
user message
    → call the LLM (with a tools schema)
        → if it returned tool_calls:
              run those tools
              append the results as role: "tool"
              go back to the LLM
        → if it returned only text:
              that is the final answer, stop
```

That *is* an agent loop (ReAct / tool-use). Cap is **8 rounds**.

What changes across 01 / 02 / 03 is **what happens between “the model asked for a tool” and “the tool actually ran.”**

| | Demo 1 Naive | Demo 2 Hardened | Demo 3 MCP |
| :--- | :--- | :--- | :--- |
| Schema sent *to* the model | Yes (OpenAI `tools`) | Yes | Yes (discovered from MCP, then converted) |
| Runtime check *before* execute | `JSON.parse` only | Zod `safeParse` | `JSON.parse` only |
| If args are invalid | Tool still runs (or crashes) | Error fed back, model retries (max 2), then circuit breaker | Tool still dispatched to MCP (MCP may error) |
| Human approval | Never | `write`/`edit`/`bash` pause | Same pause, **before** MCP `tools/call` |
| Where tools live | Nest `ToolsService` | Nest `ToolsService` | Separate `mcp-server` process over stdio |

MCP is **not** “even more validation.” It is “the tools are no longer in the Nest process.”

---

## 3. How a click becomes a file change

Take Demo 1. You type in the browser on port **5173**.

1. React `POST`s to `http://localhost:3001/api/chat/stream` with the chat history plus the model URL/name from the header.
2. Nest sets SSE headers (`text/event-stream`) and enters `runAgentLoop`.
3. Nest reads `prompts/system-prompt.txt` and `prompts/tools-schema.txt` **on every call** (hot-reloadable on stage).
4. Nest `POST`s to your local OpenAI-compatible server (LM Studio default `http://localhost:1234/v1`) with `tools` and `stream: false`.
5. The model returns either text or `tool_calls` (name + JSON argument string).
6. Nest parses arguments, runs the matching function against `sandbox/`, and writes SSE events as it goes.
7. The right-hand **Execution trace** panel appends cards from those events. The left-hand chat waits for `FINAL_ANSWER`.

Demo 2 is the same path on **3002 / 5174**, with Zod and an approval modal in the middle of step 6.

Demo 3 is the same path on **3003 / 5175**, except step 6 is “ask the MCP child process” instead of “call a Nest method.”

```text
Browser 517x
    │  POST /api/chat/stream  (SSE)
    ▼
Nest (300x)
    │  chat/completions + tools
    ▼
LM Studio / Ollama / vLLM
    │  assistant + tool_calls
    ▼
Nest again
    │  Demo 1: ToolsService
    │  Demo 2: Zod → maybe HITL modal → ToolsService
    │  Demo 3: HITL → MCP stdio tools/call
    ▼
sandbox/ files and shell
```

The UI does **not** talk to the model. Only Nest does.

---

## 4. Folders, ports, env

Three full stacks on purpose. No shared packages. If Demo 1’s `package.json` corrupts, Demo 2 still works.

| | Backend | Web | Extra |
| :--- | :--- | :--- | :--- |
| **01-basic-agent** | 3001 | 5173 | — |
| **02-hardened-agent** | 3002 | 5174 | — |
| **03-mcp-agent** | 3003 | 5175 | `mcp-server` over stdio |

Each demo has **one** `.env` at the demo root (`01-basic-agent/.env`, etc.). Copy from `.env.example`. Nest loads it with `bun --env-file=../.env`. Vite uses `envDir: '..'`.

Typical values:

```text
PORT=3001
LLM_BASE_URL=http://localhost:1234/v1    # LM Studio. Ollama is 11434, vLLM is 8000
LLM_MODEL=qwen2.5-1.5b-instruct
LLM_API_KEY=lm-studio
WORKSPACE_DIR=../sandbox

VITE_API_BASE_URL=http://localhost:3001  # browser → Nest
```

The header “Endpoint settings” can override URL/model/key **for the next request** without editing `.env`.

From the repo root:

```bash
bun run dev      # all 7 processes in mprocs tabs
bun run demo:1   # just naive
bun run demo:2
bun run demo:3
```

Runtime is **Bun only**. Do not use npm/pnpm/yarn.

---

## 5. The five tools (identical on purpose)

Every demo exposes the same names and roughly the same arguments. The talk comparison falls apart if you add a sixth tool.

| Tool | Does | Typical args | Demo 2/3 gate |
| :--- | :--- | :--- | :--- |
| `read` | Read a file (optional line slice) | `path`, `offset?`, `limit?` | Tier 1 — runs immediately |
| `list_dir` | Directory tree | `path`, `depth?` | Tier 1 |
| `write` | Create/overwrite a file | `path`, `content` | Tier 2 — modal |
| `edit` | Exact string replace | `path`, `oldText`, `newText` | Tier 2 |
| `bash` | Host shell | `command`, `timeout?` | Tier 3 — red modal |

The tool is still named **`bash` on Windows**. On Windows it is `powershell.exe -NoProfile -Command …`. On macOS/Linux it is bash. Wrappers like `cmd /c` and Unix `rm -f` get rewritten so a 1.5B model does not explode.

All paths are relative to that demo’s **`sandbox/`** (`sample.txt`, `package.json`, `debug.log`, `temp.log`). Demo 2 and 3 refuse path traversal out of the sandbox. Demo 1 does not.

---

## 6. Demo 1 — naive (the control group)

**Point:** we *showed* the model a schema. We did not *enforce* it.

- `JSON.parse` the arguments.
- Call the function.
- No Zod, no modal, no MCP.

If `edit` gets `oldText: ""`, JavaScript `replace("", …)` prepends text. If it guesses `oldText: "name"`, it can rename the JSON key in `package.json` and still report success. If `bash` says delete `debug.log`, it deletes it.

The loop still continues after errors: the error string is stuffed back as `role: "tool"` and the model may try again. That is not “self-correction with Zod.” That is “the crash became the next prompt.”

UI: raw JSON and error stacks on the right. Amber theme.

---

## 7. Demo 2 — hardened (the actual lesson)

Same model. Extra machinery in Nest.

### Zod

Before any tool runs, `ValidatorService` does `schema.safeParse(args)`.

- Missing `oldText` / empty string → fail (`minLength: 1`).
- `depth: "unlimited"` → fail (must be an integer).
- Extra key `recursive` on `list_dir` → fail (only `list_dir` is `.strict()`; extra keys on other tools are stripped, not rejected).

Failure does **not** execute the tool. Nest sends a structured `role: "tool"` message (“Parameter `oldText` is required…”) and loops. That is the **self-correction** beat.

After **2** failed validation attempts on the same tool name, the **circuit breaker** trips and that call dies. Prevents a live-talk infinite retry.

### 3-tier HITL

Zod passing is not permission to run.

1. `read` / `list_dir` — run.
2. `write` / `edit` — SSE `APPROVAL_REQUIRED`, UI modal, Nest **holds the loop** in a pending-action map.
3. `bash` — same, red, with command preview (`PS>` on Windows).

Approve → execute → append result → **resume the loop** (model may call another tool or answer).

Reject → Nest itself writes the final answer: the command did **not** run. The model is **not** asked to summarize. Small models will happily say “debug.log deleted” if you let them narrate a denial.

UI: validation chips (`Passed`, `Hallucinated`, `Correcting`, `Circuit Breaker`, `Denied`) and the modal. Emerald theme.

---

## 8. Demo 3 — MCP (packaging, not a new brain)

Same HITL as Demo 2. **No Zod self-correction loop** here.

On boot, Nest spawns `03-mcp-agent/mcp-server/src/index.ts` with Bun over **stdio** (`@modelcontextprotocol/sdk`). Then:

1. JSON-RPC `tools/list` → five tool schemas.
2. Convert those schemas into OpenAI `tools` for the LLM.
3. When the model calls a tool: HITL (if needed) → JSON-RPC `tools/call` → MCP server runs the real `read`/`write`/… → string comes back.

Zero tool bodies in `03-mcp-agent/server/`. If the MCP process dies, Nest can stay up (badge goes disconnected).

The header **MCP stdio** badge opens a panel: discovered tools + recent RPC. That panel is portaled to `document.body` so it is not trapped under the chat composer.

The RPC log in that overlay is **polled every 4 seconds**. The right-hand execution trace is the live stream. Watch the trace on stage, not the overlay, unless you are specifically showing `tools/list`.

UI: cyan theme, MCP badge, same approval modal as Demo 2.

---

## 9. Three kinds of “retry” (do not mix these on stage)

| Name | What the model sees next | Where |
| :--- | :--- | :--- |
| **Agent loop** | Tool output (file text, dir listing, shell stdout) | All three |
| **Schema self-correction** | Zod field errors, try the call again | Demo 2 only |
| **HITL** | Not a retry. The loop is **paused** until a human | Demo 2 and 3 |

You do **not** need a fourth demo of “failed tool auto-retry.” Execution errors already go back into the loop in all three setups.

---

## 10. Why “omit oldText” often does nothing

This is the thing that made rehearsal feel broken.

The JSON Schema is applied **twice**:

1. **At generation time** — you send `tools` to LM Studio / Ollama. Many local servers constrain decoding so required keys *must* appear and `depth` *must* be a number.
2. **At runtime** — Demo 2 runs Zod on that already-valid object.

If (1) is strict, (2) never fails. Asking the model “omit `oldText`” fights the decoder. Empirically with Qwen 2.5 1.5B, it often still emits `oldText`, sometimes a *wrong* snippet like `"name"`, which is a different failure (silent corruption / HITL preview), not a missing-key Zod miss.

**Reliable live beats:**

- Multi-step briefing (the loop, visible).
- Delete `debug.log` (no modal vs red modal).
- Deny the modal (file still there; chat does not lie).
- Demo 3 MCP badge (5 tools discovered).

**Unreliable live beats:** omit `oldText`, `depth: "unlimited"`, circuit breaker. Keep them as “this is what the runtime *would* catch” rather than the opener.

---

## 11. The scenario cards

Same layout in all three UIs (`Try a scenario`).

**Multi-step briefing** is the comparison card. Identical prompt:

1. `list_dir` `.`
2. `read` `./sample.txt`
3. `read` `./package.json`
4. `write` `./briefing.txt` with two lines (sample first line + package name)
5. Stop calling tools, quote both lines

Demo 1 writes with no ask. Demo 2/3 pause on step 4. No `bash`, so it works on Windows and Unix.

The other cards:

- 01: missing `oldText`, type mismatch, unchecked bash, Windows `Remove-Item`
- 02: same prompts but Zod / HITL
- 03: `list_dir` discovery, write via MCP, date via bash, Windows `Get-Date`

---

## 12. What the right-hand panel is showing

SSE, not a dump at the end.

Every LLM round now emits:

- `LLM_ROUND_START` → dashed row **Waiting on model · round n/8**
- `LLM_ROUND_DONE` → **Model replied · 1 tool call** or **final answer**
- then tool events (`TOOL_INVOCATION` / `VALIDATION_*` / `TOOL_DISPATCH_MCP` / `TOOL_RESULT` / `APPROVAL_REQUIRED` / …)

The model call is still `stream: false`, so you do **not** see tokens typing. You *do* see the wait, then the tool, then the next wait. That is enough to point at and say “this is the loop.”

Chat text still appears all at once on `FINAL_ANSWER`.

---

## 13. Prompts and schemas as stage props

Each demo has:

- `prompts/system-prompt.txt` — personality, path rules, Windows vs Unix shell notes
- `prompts/tools-schema.txt` — the JSON the model is given

Demo 1 loads the `.txt` schema as the live `tools` array. Demo 2’s live schema is generated from Zod (`zod-to-json-schema`); the `.txt` should stay in sync for inspection. Demo 3’s live schema comes from MCP `tools/list`; the `.txt` is a snapshot.

You can edit the `.txt` files during a talk. Demo 1/2 backends re-read them on the next request. MCP tool *implementations* only change if you edit `mcp-server` and restart that process.

---

## 14. A 15-minute spine that matches the code

1. **5173** — Multi-step briefing. Four tool rounds, write happens with no one asked. Optional: bash delete `debug.log`.
2. **5174** — Same briefing: reads run, write modal, Approve, final answer. Then the same delete: red modal, **Deny**, file still there.
3. **5175** — Point at MCP badge (5 tools). Same briefing or a write: modal, then `tools/call` in the drawer.

Line to close with:

> We did not train a better model. We put a runtime around the same one. MCP is how you move the tools, not how you make the model honest.

---

## 15. Other files, when to open them

| File | Use it for |
| :--- | :--- |
| **This file** (`HOW_IT_WORKS.md`) | Your own understanding |
| `README.md` | How a stranger clones and runs it |
| `01|02|03-…/README.md` | Exact preset copy for that demo |
| `DEMO_SCRIPT.md` | Spoken 15-minute track |
| `AGENTS.md` | Rules if you (or an agent) edit the repo |
| `IMPLEMENTATION.md` | What was built, in what order, and why we changed things |
| `TESTING.md` | Old empirical run on Qwen 1.5B (silent corruption, phantom delete) |

---

## 16. Honest limitations (say them if asked)

- Schema-hallucination presets fight constrained decoding. Do not bet the talk on them.
- Demo 3 does not re-run Zod. The conclusion table in older docs oversold “protocol JSON schema.”
- HITL is by **tool name**, not by inspecting whether `bash` is actually dangerous. `Get-Date` still gets a red modal. That is the point of a coarse 3-tier gate.
- MCP here is a **hardcoded stdio spawn of our own server**, not a marketplace of random third-party MCPs. You *could* point the client at another server; this repo does not.
- 1.5B models skip steps, call the wrong tool, or invent Unix `rm` on Windows. The host-shell rewriter covers some of that; it will not make the model a good agent.
- Rejecting HITL ends the turn on purpose. Resuming the model after a deny caused it to claim success.

If something in the UI disagrees with this file, the **code** is the source of truth — especially `*/server/src/agent/agent.service.ts`.
