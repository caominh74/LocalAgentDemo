# Demo 3: The Model Context Protocol (MCP) Agent (`03-mcp-agent`)

This setup demonstrates **decoupling all tool execution logic completely out of the backend** into a standalone Model Context Protocol (MCP) server communicating over `stdio`.

## Architecture & Benefits Over Demos 1 and 2

1. **Protocol Decoupling**:
   - Zero tool implementation logic exists in the NestJS backend (`03-mcp-agent/server/`).
   - All 5 tools (`read`, `write`, `edit`, `bash`, `list_dir`) are implemented and executed exclusively inside `03-mcp-agent/mcp-server/`.

2. **Dynamic Capability Discovery**:
   - The backend does not hardcode tool schemas.
   - On startup or connection, the backend queries `client.listTools()` via JSON-RPC, dynamically receives the tool definitions and JSON schemas, and converts them into OpenAI function calling parameters.
   - If tools are added, updated, or removed in `mcp-server`, the agent automatically adapts without modifying backend code.

3. **Process Sandboxing & Fault Isolation**:
   - The tool server runs as an independent child process (`bun run ../mcp-server/src/index.ts`).
   - If a heavy shell script or memory leak crashes the tool server, the backend catches the stdio process exit without taking down the web server or client sessions.

4. **Retained Permission Governance**:
   - The backend enforces the 3-Tier Permission Guard (`TIER_1_SAFE`, `TIER_2_MUTATE`, `TIER_3_HIGH_RISK`) before forwarding `tools/call` requests over the stdio transport.

---

## Live Demo Test Walkthrough

- **Inspect Dynamic Discovery**:
  Observe the **`[MCP stdio: CONNECTED]`** badge in the header. Click the badge to view the live JSON-RPC handshake telemetry and the 5 dynamically discovered tool schemas.
- **Preset 1 (Dynamic Tool Call)**:
  Submit `Inspect files using list_dir`.
  - *Observe*: The backend dispatches `tools/call` over stdio; result returns via JSON-RPC.
- **Preset 2 (Tier 2 MCP Write)**:
  Submit `Create demo-mcp.txt with Hello MCP`.
  - *Observe*: The backend halts the loop and triggers the interactive HITL Approval Modal. Once approved, the write is executed by the MCP server process.
- **Preset 3 (Tier 3 MCP Shell)**:
  Submit `Execute bash to check date`.
  - *Observe*: Red high-risk alert modal displays exact command preview.

---

## Running Demo 3

```bash
# From repository root
bun run demo:3:mcp
bun run demo:3:server
bun run demo:3:web

# Or open interactive TUI tabs
bun run demo:3
```

- Backend API: `http://localhost:3003`
- Web UI: `http://localhost:5175`
- MCP Server: Standard I/O child process (`stdio`)
