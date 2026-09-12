# Demo 1: The Naive Agent (`01-basic-agent`)

Baseline agent: the model is given a tools schema, the backend `JSON.parse`s whatever comes back, and every tool runs immediately. No Zod, no approval modal, no MCP.

The agent **is** a loop (`model → tool → result → model`, capped at 8 rounds). Failures are not recovered with structured schema feedback; they either crash, corrupt files, or get a raw error string stuffed back into history.

| | |
| :--- | :--- |
| Backend | `http://localhost:3001` |
| Web UI | `http://localhost:5173` |
| Sandbox | `01-basic-agent/sandbox/` (`sample.txt`, `package.json`, `debug.log`, `temp.log`) |
| Env | **One file:** `01-basic-agent/.env` (copy from `.env.example`) |

---

## Architectural constraints

- **No schema validation.** Arguments go through `JSON.parse` only. Missing keys, empty `oldText`, string `depth`, extra keys — all forwarded to the tool.
- **No permission guard.** `read`, `write`, `edit`, `bash`, and `list_dir` execute as soon as the model calls them.
- **No Zod self-correction.** Runtime errors still append as `role: "tool"` and the while-loop continues, but nothing checks types before disk or shell access.

---

## UI scenario cards

Click these in the web UI (`Try a scenario`). Copy here matches the buttons.

### Failure 1: Missing `oldText`

```text
In ./package.json, replace the name with "my-awesome-app", but omit the oldText parameter from your tool call.
```

**Intended beat:** omitted or empty `oldText` → naive `edit` still runs. Empty string `oldText` makes `replace("", …)` prepend text. A guessed `oldText` like `"name"` rewrites the JSON key and silently corrupts `package.json`.

**Live-talk note:** constrained function-calling (LM Studio / Ollama) often still emits `oldText`. If the model “helps” and fills the field, you will not see a schema crash — you may still see a bad `oldText` guess. The bash and multi-step cards are more reliable.

### Failure 2: Type mismatch & extra keys

```text
Call list_dir on "." passing depth as the text "unlimited" and an extra parameter recursive: true.
```

**Intended beat:** `depth: "unlimited"` becomes `NaN`; extra key `recursive` is ignored. Naive JS `currentDepth > NaN` never stops the walk cleanly.

Same caveat: many local servers coerce `depth` to an integer before your backend sees it.

### Failure 3: Unchecked destructive bash

```text
Execute a shell command to delete debug.log from the workspace.
```

**Intended beat:** `bash` runs immediately. On Windows the host shell is PowerShell (`Remove-Item`); on macOS/Linux it is bash (`rm`). No modal.

### Failure 4: Unchecked PowerShell (Windows)

```text
Call the bash tool and set command to exactly Remove-Item -Force ./debug.log with no cmd, /c, or rm prefix.
```

Same deletion with an explicit PowerShell command. The tool name is still `bash`.

### Loop: Multi-step briefing

```text
Complete this as a multi-step agent task. Call exactly one tool per turn. Do not skip steps. Do not use bash. Do not delete any files.

1. Call list_dir on path "." to list the sandbox.
2. Call read on path "./sample.txt".
3. Call read on path "./package.json".
4. Call write to create "./briefing.txt" containing exactly two lines:
sample: <the first line of sample.txt>
package: <the name field from package.json>
5. Stop calling tools. Reply with a short final answer that quotes both lines you wrote.
```

**Talk beat:** this is the agent loop, not a schema trap. Watch four tool rounds (`list_dir` → `read` → `read` → `write`) then a final answer. Demo 1 does **not** pause on the write. Compare the same card on Demo 2 (Tier 2 modal) and Demo 3 (modal, then MCP `tools/call`).

---

## Running Demo 1

Copy env once, then launch from the repo root:

```bash
cp 01-basic-agent/.env.example 01-basic-agent/.env
# edit LLM_BASE_URL / LLM_MODEL if needed (LM Studio default: http://localhost:1234/v1)

bun run demo:1
```

Or split processes:

```bash
bun run demo:1:server
bun run demo:1:web
```

`PORT`, `LLM_*`, `WORKSPACE_DIR`, and `VITE_*` all live in that single `.env`. Nest loads it with `--env-file=../.env`; Vite uses `envDir: '..'`.
