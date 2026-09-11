# Local Agent Architecture Demo (`LocalAgentDemo`)

[![Runtime](https://img.shields.io/badge/Runtime-Bun%20v1.3+-black?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Model Context Protocol](https://img.shields.io/badge/Protocol-MCP%20v1.3+-purple)](https://modelcontextprotocol.io)

A hands-on, live-demonstration repository designed for technical talks, architecture reviews, and workshops. It presents a side-by-side comparison of **three agent execution paradigms** using local LLMs (Ollama / vLLM):

1. **Demo 1 (`01-basic-agent`) — The Naive Agent**: Raw, unvalidated tool execution via direct `JSON.parse`. Exposes real failure modes of local models (omitted arguments, string-typed recursion loops, uncontrolled shell commands).
2. **Demo 2 (`02-hardened-agent`) — The Hardened Agent**: Defensive runtime engineering with strict **Zod schemas**, automated **self-correction feedback loops**, a **2-retry circuit breaker**, and an interactive **3-Tier Permission Guard** with Human-in-the-Loop (HITL) approval modals.
3. **Demo 3 (`03-mcp-agent`) — The MCP Agent**: Complete decoupling of tools out of the backend into a standalone process using the **Model Context Protocol (MCP)** over `stdio`. Features dynamic JSON-RPC capability discovery (`tools/list`), fault isolation, and unified permission gating.

---

## Architecture & Network Topology

Each setup runs completely independently on dedicated ports with zero cross-contamination:

| Setup | Sub-Component | Port / Protocol | Stack | Architectural Role |
| :--- | :--- | :--- | :--- | :--- |
| **Demo 1** | Backend (`server`) | `http://localhost:3001` | NestJS + Bun | Unvalidated naive caller + SSE streaming |
| **Demo 1** | Web UI (`web`) | `http://localhost:5173` | React + Vite + Tailwind | Two-column layout, raw JSON & error stacks |
| **Demo 2** | Backend (`server`) | `http://localhost:3002` | NestJS + Bun + Zod | Zod validation, self-correction, HITL state machine |
| **Demo 2** | Web UI (`web`) | `http://localhost:5174` | React + Vite + Tailwind | Validation chips (`[Passed]`, `[Hallucinated]`), HITL modal |
| **Demo 3** | Backend (`server`) | `http://localhost:3003` | NestJS + Bun + MCP SDK | MCP Client, dynamic discovery, permission gates |
| **Demo 3** | Web UI (`web`) | `http://localhost:5175` | React + Vite + Tailwind | MCP discovery badge, JSON-RPC telemetry drawer |
| **Demo 3** | MCP Server (`mcp-server`) | `stdio` | Standalone TypeScript CLI | Houses and executes the 5 tools over stdio RPC |
| **Local LLM** | Ollama / vLLM | `11434` / `8000` | OpenAI-compatible API | Local inference (`llama3.2`, `qwen2.5-coder`, etc.) |

---

## The 5 Standard Operational Tools

Under no circumstances do tool definitions diverge across the 3 setups. All three implement and evaluate:
1. **`read`**: Read workspace file contents (`path`, optional `offset`, optional `limit`).
2. **`write`**: Write or overwrite file contents, creating parent directories (`path`, `content`).
3. **`edit`**: Surgical search-and-replace of exact string chunks (`path`, `oldText`, `newText`).
4. **`bash`**: Execute a host-shell command inside the workspace (`command`, optional `timeout`). On Windows this is PowerShell; on macOS/Linux this is bash. The tool name stays `bash` so the three demos stay comparable.
5. **`list_dir`**: Traverse file and directory hierarchies (`path`, optional `depth`).

---

## Quick Start Guide

### Prerequisites
- **[Bun](https://bun.sh)** installed (v1.3+). *Note: npm/yarn/pnpm are prohibited.*
- **Ollama** or **vLLM** running locally:
  ```bash
  ollama run llama3.2
  ```

### 1. Launch Everything with the Tabbed TUI (`mprocs`)
To run all 7 services across all 3 demos simultaneously in a single terminal with switchable tabs:
```bash
bun run dev
```

### 2. Or Launch Individual Demos
```bash
# Demo 1 (The Naive Agent) -> Backend: 3001 | Web: 5173
bun run demo:1

# Demo 2 (The Hardened Agent) -> Backend: 3002 | Web: 5174
bun run demo:2

# Demo 3 (The MCP Agent) -> MCP Server: stdio | Backend: 3003 | Web: 5175
bun run demo:3
```

---

## Project Structure & Key Documentation

```text
LocalAgentDemo/
├── AGENTS.md                  # Project Constitution, rules, invariants, coding standards
├── IMPLEMENTATION.md          # Self-evolving task ledger, changelog, and decision log
├── DEMO_SCRIPT.md             # 15-minute live talk presentation script & talk track
├── mprocs.yaml                # Interactive TUI process dashboard configuration
├── package.json               # Root orchestrator scripts
│
├── 01-basic-agent/            # Demo 1: The Naive Agent
│   ├── prompts/               # Plain-text prompt and tools-schema assets
│   ├── server/                # NestJS API (Port 3001)
│   ├── web/                   # React UI (Port 5173)
│   └── README.md              # 3 reproducible failure prompts documented
│
├── 02-hardened-agent/         # Demo 2: The Hardened Agent
│   ├── prompts/               # Hardened prompt and Zod schema exports
│   ├── server/                # NestJS API with Zod & HITL Guard (Port 3002)
│   ├── web/                   # React UI with validation badges & approval modal (Port 5174)
│   └── README.md              # Defensive architecture & HITL walkthrough
│
└── 03-mcp-agent/              # Demo 3: The Model Context Protocol (MCP) Agent
    ├── prompts/               # Prompt and exported MCP tool schemas
    ├── mcp-server/            # Standalone stdio MCP Server exposing the 5 tools
    ├── server/                # NestJS API with MCP Client SDK (Port 3003)
    ├── web/                   # React UI with MCP status badge & RPC telemetry (Port 5175)
    └── README.md              # MCP decoupling & protocol guide
```

---

## For Autonomous Coding Agents

If you are an AI coding assistant joining this repository in a future session:
1. **Read [`AGENTS.md`](./AGENTS.md) first**: Understand our constitution, port allocations, tool specifications, and strict Bun-only policy.
2. **Review [`IMPLEMENTATION.md`](./IMPLEMENTATION.md)**: Read the task dashboard, architectural decision log, and milestone status before altering code.
3. **Keep Files Pure**: Ensure `.txt` files in `prompts/` remain pure unformatted text and synchronize any schema updates immediately.
4. **Always Verify Builds**: Run `bun run build` in modified sub-projects to verify 0 TypeScript and 0 Vite errors before concluding.
