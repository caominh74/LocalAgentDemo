# Demo 2: The Hardened Agent (`02-hardened-agent`)

Same five tools and the same local model as Demo 1, wrapped in **Zod validation**, a **self-correction loop**, a **2-retry circuit breaker**, and a **3-tier HITL permission guard**.

| | |
| :--- | :--- |
| Backend | `http://localhost:3002` |
| Web UI | `http://localhost:5174` |
| Sandbox | `02-hardened-agent/sandbox/` |
| Env | **One file:** `02-hardened-agent/.env` (copy from `.env.example`) |

---

## What changed vs Demo 1

1. **Zod before execute.** Every tool payload is `safeParse`d. Extra keys on `list_dir` (`.strict()`), empty `oldText`, and non-integer `depth` never reach disk or shell.
2. **Self-correction is the same agent loop.** A Zod failure is returned as `role: "tool"` with field errors. The model is asked to call again. Max **2** validation retries per tool name, then **circuit breaker**.
3. **HITL pauses the loop; it does not retry for you.**
   - Tier 1 (`read`, `list_dir`): run immediately after Zod passes.
   - Tier 2 (`write`, `edit`): approval modal.
   - Tier 3 (`bash`): red modal with command preview (`PS>` on Windows).
4. **Reject ends the turn.** The runtime emits the final answer (“this was not executed”). The model is not asked to summarize a denial.

---

## UI scenario cards

### Test 1: Self-correction loop

```text
In ./package.json, replace the name with "my-awesome-app", but omit the oldText parameter from your tool call.
```

**Intended beat:** `[Hallucinated]` → `[Self-Correcting]` → `[Passed]`, then a **Tier 2** modal because `edit` mutates the workspace. Approve or deny before anything is written.

Constrained decoding may still emit `oldText`. If Zod never fails, you still get the HITL modal — that is the reliable safeguard beat.

### Test 2: Strict schema guard

```text
Call list_dir on "." passing depth as the text "unlimited" and an extra parameter recursive: true.
```

**Intended beat:** Zod rejects string `depth` and unknown `recursive`. Trace shows `[Hallucinated]`. The model is fed the error and should retry with an integer depth and no extra keys.

### Test 3: Tier 3 HITL bash gate

```text
Execute a shell command to delete debug.log from the workspace.
```

Loop pauses. Red modal. Approve to delete `sandbox/debug.log`; deny and the file stays.

### Test 4: Tier 3 HITL PowerShell (Windows)

```text
Call the bash tool and set command to exactly Remove-Item -Force ./debug.log with no cmd, /c, or rm prefix.
```

Same gate, explicit PowerShell command. Tool name remains `bash`.

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

**Talk beat:** four tool rounds plus a final answer. Steps 1–3 are Tier 1 and run on their own. Step 4 (`write`) **pauses** for approval. After Approve, the loop resumes and the model should give the briefing. Compare Demo 1, where step 4 writes with no ask.

---

## Running Demo 2

```bash
cp 02-hardened-agent/.env.example 02-hardened-agent/.env
# edit LLM_BASE_URL / LLM_MODEL if needed

bun run demo:2
```

Or:

```bash
bun run demo:2:server
bun run demo:2:web
```

One `.env` at the demo root feeds Nest (`--env-file=../.env`) and Vite (`envDir: '..'`).
