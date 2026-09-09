# Project Constitution & Agent Operating System (AGENTS.md)

Welcome to the **Local Agent Architecture Demo** (`LocalAgentDemo`). This document defines the engineering constitution, architectural invariants, tool specifications, and runtime operational constraints governing all work across this repository.

---

## 1. Project Mission & Demonstration Goals

This repository is designed for **live technical talks, workshops, and architectural demonstrations**. Its primary mission is to showcase the concrete, hands-on differences between three agent execution paradigms using local LLMs (Ollama / vLLM):

1. **Demo 1 (`01-basic-agent`) - The Naive Agent**: Demonstrates raw, unvalidated tool invocation and exposes real failure modes of local models (hallucinated parameters, missing arguments, unhandled JSON syntax errors, and uncontrolled shell command execution).
2. **Demo 2 (`02-hardened-agent`) - The Hardened Agent**: Implements defensive runtime engineering around the same local model, including strict **Zod validation**, automated **self-correction feedback loops**, a **circuit-breaker retry limiter**, and a **3-Tier Permission Guard** with interactive Human-in-the-Loop (HITL) pause/resume workflows.
3. **Demo 3 (`03-mcp-agent`) - The MCP Agent**: Decouples tools completely out of the backend into an independent process using the **Model Context Protocol (MCP)** over `stdio`. Showcases dynamic tool discovery, standardization across agent frameworks, and unified security sandboxing.

---

## 2. Global Port Allocations & Network Topology

Each demonstration setup operates as a completely independent full-stack application running simultaneously on dedicated ports without conflict:

| Demo Setup | Component | Port | Description |
| :--- | :--- | :--- | :--- |
| **01-basic-agent** | Backend (`server`) | `3001` | NestJS API (Ollama/vLLM naive caller) |
| **01-basic-agent** | Frontend (`web`) | `5173` | React + Vite (Chat + Raw Logs) |
| **02-hardened-agent** | Backend (`server`) | `3002` | NestJS API (Zod + HITL Guard + Circuit Breaker) |
| **02-hardened-agent** | Frontend (`web`) | `5174` | React + Vite (Chat + Validation Badges + HITL Modal) |
| **03-mcp-agent** | Backend (`server`) | `3003` | NestJS API (MCP Client + Stdio Transport) |
| **03-mcp-agent** | Frontend (`web`) | `5175` | React + Vite (Chat + MCP Discovery Badge + HITL) |
| **03-mcp-agent** | MCP Server (`mcp-server`) | `stdio` | Standalone CLI process spawned via Bun stdio |
| **Local Inference** | Ollama / vLLM | `11434` / `8000` | Local OpenAI-compatible API endpoint |

---

## 3. Tooling & Runtime Constraints (STRICT)

All development within this repository must strictly adhere to the following package manager and runtime rules:

- **Runtime**: **Bun exclusively** (`bun.lock`).
- **Forbidden Package Managers**: **NEVER** run `npm`, `pnpm`, or `yarn`. Any detected `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock` must be removed immediately.
- **Package Installation**:
  - Install dependencies: `bun add <package>`
  - Install dev dependencies: `bun add -d <package>`
  - Workspace/Root scripts: `bun run <script>`
  - CLI executions: `bunx <command>`
- **TypeScript**: Strict mode enabled (`"strict": true` in `tsconfig.json`) across all backend and frontend packages.
- **Local LLM Compatibility**: The backend must communicate with OpenAI-compatible chat completion endpoints (default: `http://localhost:11434/v1` for Ollama or `http://localhost:8000/v1` for vLLM).

---

## 4. The 5 Standard Operational Tools

All three setups must implement and evaluate the **exact same 5 tools**. Under no circumstances should tool definitions diverge in purpose or core argument signatures:

### 1. `read`
- **Purpose**: Read file contents from the workspace filesystem (supports UTF-8 text and binary/image metadata).
- **Arguments**:
  - `path` (`string`, **required**): Relative or absolute path to the target file.
  - `offset` (`number`, *optional*): Line offset (1-indexed) to start reading from.
  - `limit` (`number`, *optional*): Maximum number of lines to return.
- **Output**: File content string or truncated slice with line indicators.

### 2. `write`
- **Purpose**: Create a new file or completely overwrite an existing file, creating any required parent directories automatically.
- **Arguments**:
  - `path` (`string`, **required**): Path to write the file to.
  - `content` (`string`, **required**): Full textual content to write.
- **Output**: Confirmation status and byte count written.

### 3. `edit`
- **Purpose**: Perform a surgical search-and-replace of an exact string chunk in a file.
- **Arguments**:
  - `path` (`string`, **required**): Target file path.
  - `oldText` (`string`, **required**): Exact existing text block to be replaced.
  - `newText` (`string`, **required**): New replacement text block.
- **Output**: Confirmation of match and replacement diff metadata.

### 4. `bash`
- **Purpose**: Execute a shell command inside the project workspace directory.
- **Arguments**:
  - `command` (`string`, **required**): The command string to execute in the host shell.
  - `timeout` (`number`, *optional*): Maximum execution time in milliseconds (default: 30000).
- **Output**: Combined stdout and stderr string with exit status code.

### 5. `list_dir`
- **Purpose**: Inspect directory structures and file hierarchy.
- **Arguments**:
  - `path` (`string`, **required**): Target directory path.
  - `depth` (`number`, *optional*): Maximum recursive depth to traverse (default: 1).
- **Output**: Formatted tree/list of child directories and files with size and entry type.

---

## 5. Architectural Boundaries & Demo Invariants

To guarantee an honest and compelling live comparison, each project must strictly observe its architectural boundaries:

### Setup 1: `01-basic-agent` (The Naive Agent)
- **Constraint**: **MUST NOT** include schema validation (no Zod, no Joi, no Ajv) and **MUST NOT** include confirmation modals or permission checks.
- **Execution Flow**: Model output is parsed with raw `JSON.parse()` and dispatched directly to the tool implementation.
- **Demonstration Objective**: Realistically reproduce failure cases when local models hallucinate keys, omit required arguments (e.g., omitting `oldText`), produce invalid JSON, or attempt destructive bash commands.

### Setup 2: `02-hardened-agent` (The Hardened Agent)
- **Constraint**: **MUST** validate all model tool arguments against strict Zod schemas before invocation.
- **Self-Correction & Circuit Breaker**:
  - On validation error, format the Zod issue into a structured `role: "tool"` feedback message and feed it back to the local model.
  - Maximum **2 retries**. If the model fails twice consecutively with identical or uncorrectable arguments, the circuit breaker trips, halting execution and notifying the user.
- **3-Tier Permission Guard**:
  - **Tier 1 (Safe / Read-Only)**: `read`, `list_dir` $\rightarrow$ Autonomous execution.
  - **Tier 2 (Mutate / Workspace Changes)**: `write`, `edit` $\rightarrow$ Interactive UI approval required.
  - **Tier 3 (High-Risk / Destructive Shell)**: `bash` $\rightarrow$ Interactive UI approval required with explicit command preview, red alert badge, and timeout safeguards.

### Setup 3: `03-mcp-agent` (The MCP Agent)
- **Constraint**: The backend **MUST NOT** host the tool logic directly. All 5 tools must be implemented exclusively within `mcp-server/`.
- **Communication**: The backend must spawn `mcp-server` over `stdio` using `@modelcontextprotocol/sdk`.
- **Dynamic Discovery**: Tool schemas must not be hardcoded in the backend; they must be queried dynamically via the MCP client (`tools/list`) and converted to OpenAI tool call formats.
- **Security & HITL**: The backend maintains the 3-Tier Permission Guard prior to dispatching `tools/call` over the MCP transport.

---

## 6. Prompt & Schema Asset Maintenance (`prompts/`)

Each setup must maintain a dedicated `prompts/` directory:
- `prompts/system-prompt.txt`: The exact system prompt supplied to the local LLM.
- `prompts/tools-schema.txt`: The exact JSON tool schema definition passed in the API request body.

### Rules for Asset Maintenance:
1. **Plain-Text Purity**: These files must be pure `.txt` without code fences or wrapper Markdown so they can be loaded directly into backend services or swapped via hot-reload.
2. **Inspection & Live Swapping**: During a live presentation, speakers can open these files side-by-side or edit them live to demonstrate the impact of prompt engineering and schema hardening.
3. **Synchronized State**: Any change to backend tool schemas or system instructions must immediately be reflected in the respective `.txt` asset.

---

## 7. UI Uniformity Principle

To ensure the audience focuses on **system architecture** rather than surface-level UI differences, all three frontend web applications must follow identical design principles:
- **Layout**: Two-column layout (Left: Interactive Chat Stream; Right: Collapsible Real-time Tool Trace & Execution Log).
- **Styling**: Tailwind CSS with dark-mode aesthetic (slate/zinc palette, monospaced code displays, high-contrast badges).
- **Visual Extensions**:
  - `01-basic-agent`: Shows raw incoming/outgoing JSON blocks and error stacks.
  - `02-hardened-agent`: Adds validation status chips (`[Passed]`, `[Hallucinated]`, `[Corrected]`, `[Circuit Breaker]`) and the interactive HITL Approval Modal.
  - `03-mcp-agent`: Retains Setup 2's validation and modal features, and adds an **MCP Connection Status & Tool Discovery Badge** showing live JSON-RPC lifecycle events.

---

## 8. Coding Standards & Agent Etiquette

Any autonomous agent or human developer working on this codebase must:
1. Read `AGENTS.md` and `IMPLEMENTATION.md` before making any code modifications.
2. Run `bun run build` and verify TypeScript compilation in affected sub-projects after completing changes.
3. Never introduce cross-project dependencies (each folder must remain 100% self-contained and runnable).
4. Update `IMPLEMENTATION.md` checkboxes and logs immediately upon completing any milestone task.
