# Demo 3: The MCP Agent (`03-mcp-agent`)

Same five tools, same HITL gate as Demo 2, but **tool implementations do not live in Nest**. They run in a standalone MCP server over `stdio`. The backend discovers schemas with `tools/list` and invokes them with `tools/call`.

MCP is **packaging and discovery**, not a third validator. There is no Zod self-correction loop here (that is Demo 2). JSON parse errors and MCP execution errors still go back into the agent loop as tool messages.

| | |
| :--- | :--- |
| Backend | `http://localhost:3003` |
| Web UI | `http://localhost:5175` |
| MCP server | `stdio` child process (`03-mcp-agent/mcp-server`) |
| Sandbox | `03-mcp-agent/sandbox/` |
| Env | **One file:** `03-mcp-agent/.env` (copy from `.env.example`) |

---

## Architecture

1. **No tool bodies in Nest.** `read` / `write` / `edit` / `bash` / `list_dir` are implemented only in `mcp-server/src/index.ts`.
2. **Dynamic discovery.** On connect, the client calls `tools/list`, converts MCP `inputSchema` into OpenAI function tools, and shows the count on the header badge.
3. **HITL is still in the backend.** The 3-tier guard runs **before** `tools/call` is sent over stdio. Reject never reaches the MCP process.
4. **Fault isolation.** A crashing tool process should not take down the Nest API. The badge shows connected / disconnected.

---

## UI scenario cards

### Test 1: Dynamic tool call

```text
Inspect the files in the current directory using list_dir.
```

Tier 1: autonomous `list_dir` over JSON-RPC. Point at the MCP badge (`5 tools discovered`) and the RPC drawer (`tools/list`, `tools/call`).

### Test 2: Tier 2 MCP write

```text
Create a file named demo-mcp.txt with the content "Hello from Model Context Protocol!".
```

HITL intercepts `write` **before** the RPC. Approve → `tools/call` in the isolated process.

### Test 3: Tier 3 MCP shell

```text
Execute a bash command to check the current date and time.
```

Red modal with command preview, then `bash` runs inside the MCP server (PowerShell on Windows, bash on Unix).

### Test 4: Tier 3 MCP PowerShell (Windows)

```text
Call the bash tool and set command to exactly Get-Date with no cmd, /c, or date prefix.
```

Same gate, explicit `Get-Date`. Tool name remains `bash`.

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

**Talk beat:** same four tool rounds as Demos 1 and 2, but each call is an MCP RPC. Steps 1–3 are autonomous. Step 4 pauses at HITL; after Approve, Nest dispatches `tools/call` and the loop continues to the final answer. Use the RPC drawer to show `list_dir` / `read` / `write` as separate JSON-RPC turns.

---

## Running Demo 3

```bash
cp 03-mcp-agent/.env.example 03-mcp-agent/.env
# edit LLM_BASE_URL / LLM_MODEL if needed

bun run demo:3
```

Or split:

```bash
bun run demo:3:mcp
bun run demo:3:server
bun run demo:3:web
```

The Nest process also spawns `mcp-server` over stdio on boot. One `.env` at the demo root feeds Nest, Vite, and the MCP child (`bun --env-file=../.env`).
