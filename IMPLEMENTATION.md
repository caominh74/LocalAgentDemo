# Implementation Task Ledger & Changelog (IMPLEMENTATION.md)

<!-- AGENT INSTRUCTIONS:
CRITICAL OPERATIONAL RULES FOR CODING AGENTS:
1. BEFORE modifying or creating any code in this repository, READ both `AGENTS.md` and this file (`IMPLEMENTATION.md`) completely to understand architectural invariants, port maps, and current task state.
2. KEEP THIS DOCUMENT SYNCHRONIZED: When you begin or finish a task, immediately update the relevant checkbox from `[ ]` to `[x]`. Update the "Project Status Dashboard" (Active Milestone, Progress Percentage, Blockers).
3. DECISION & DEVIATION LOGGING: Whenever you encounter local LLM quirks, unexpected library behaviors, port adjustments, or make non-trivial design decisions, append an entry to the "Decision & Deviation Log" at the bottom of this file before concluding your session.
4. STRICT BUN RUNTIME: Always use Bun (`bun add`, `bun add -d`, `bun run`, `bunx`). Never invoke npm, yarn, or pnpm.
5. NEVER CROSS-CONTAMINATE DEMOS: Each demo folder (`01-basic-agent`, `02-hardened-agent`, `03-mcp-agent`) must stay completely self-contained.
-->

---

## 1. Project Status Dashboard

| Metric | Current Value | Notes |
| :--- | :--- | :--- |
| **Active Milestone** | **Project Complete (All 5 Milestones Finished)** | 100% Build & E2E Verified |
| **Overall Progress** | `100%` | All 3 agent setups, UI, stdio MCP server, and DEMO_SCRIPT.md complete |
| **Current Blocker(s)`** | None | Fully runnable and tested on Bun v1.3.14 |
| **Target LLM Runtime** | Local OpenAI-Compatible | Ollama (`http://localhost:11434/v1`) or vLLM (`http://localhost:8000/v1`) |

### Active Port Allocation Map
- **Demo 1 (`01-basic-agent`)**: Backend $\rightarrow$ `http://localhost:3001` \| Frontend $\rightarrow$ `http://localhost:5173`
- **Demo 2 (`02-hardened-agent`)**: Backend $\rightarrow$ `http://localhost:3002` \| Frontend $\rightarrow$ `http://localhost:5174`
- **Demo 3 (`03-mcp-agent`)**: Backend $\rightarrow$ `http://localhost:3003` \| Frontend $\rightarrow$ `http://localhost:5175`
- **MCP Server (`03-mcp-agent/mcp-server`)**: Standard I/O child process (`stdio`)

---

## 2. Phased Roadmap & Milestone Tracking

```mermaid
flowchart LR
    M1[M1: Scaffolding & Prompts (DONE)] --> M2[M2: 01-basic-agent (DONE)]
    M2 --> M3[M3: 02-hardened-agent (DONE)]
    M3 --> M4[M4: 03-mcp-agent (DONE)]
    M4 --> M5[M5: Polish & Dry-Run (DONE)]
```

---

### Milestone 1: Repository Scaffolding & Prompt Asset Baseline
**Objective**: Establish the 3 standalone project directories with Bun, configure TypeScript/Tailwind/NestJS structures, allocate ports, and draft baseline `.txt` prompt and schema assets.

- [x] **Task 1.1**: Design complete architecture, directory blueprint, state-machine diagrams, and comparison matrix.
- [x] **Task 1.2**: Author project constitution (`AGENTS.md`) and task ledger (`IMPLEMENTATION.md`).
- [x] **Task 1.3**: Scaffold `01-basic-agent/`:
  - [x] Initialize `prompts/system-prompt.txt` and `prompts/tools-schema.txt`.
  - [x] Initialize `server/` (NestJS + Bun, port 3001).
  - [x] Initialize `web/` (React + Vite + Tailwind + Bun, port 5173).
- [x] **Task 1.4**: Scaffold `02-hardened-agent/`:
  - [x] Initialize `prompts/system-prompt.txt` and `prompts/tools-schema.txt`.
  - [x] Initialize `server/` (NestJS + Bun, port 3002).
  - [x] Initialize `web/` (React + Vite + Tailwind + Bun, port 5174).
- [x] **Task 1.5**: Scaffold `03-mcp-agent/`:
  - [x] Initialize `prompts/system-prompt.txt` and `prompts/tools-schema.txt`.
  - [x] Initialize `mcp-server/` (Standalone TypeScript MCP Server + Bun).
  - [x] Initialize `server/` (NestJS + Bun, port 3003).
  - [x] Initialize `web/` (React + Vite + Tailwind + Bun, port 5175).
- [x] **Task 1.6**: Verify independent buildability: run `bun run build` in each subfolder.

---

### Milestone 2: Build Demo 1 — The Naive Agent (`01-basic-agent`)
**Objective**: Construct the baseline naive agent that blindly executes model tool calls with direct `JSON.parse` and no validation. Document 3 reproducible failure-case prompts.

- [x] **Task 2.1**: Implement backend NestJS agent loop:
  - [x] OpenAI-compatible client connecting to Ollama/vLLM.
  - [x] Direct invocation of the 5 tools (`read`, `write`, `edit`, `bash`, `list_dir`).
  - [x] Raw JSON parse of arguments without validation or error recovery.
  - [x] Server-Sent Events (SSE) endpoint `POST /api/chat/stream` for streaming tokens and tool traces.
- [x] **Task 2.2**: Implement web UI:
  - [x] Chat conversation panel (user input + assistant streaming output).
  - [x] Real-time tool execution panel displaying raw JSON payloads, stdout/stderr, or runtime crashes.
  - [x] Configurable model endpoint toggle (Ollama vs vLLM URL & model name).
- [x] **Task 2.3**: Document and verify the 3 Reproducible Failure Prompts:
  1. *Prompt 1 (Missing Required Argument)*: Ask agent to edit a file without specifying `oldText`.
  2. *Prompt 2 (Type Hallucination / Malformed JSON)*: Prompt model to list a directory passing `depth: "full"` or unescaped string paths.
  3. *Prompt 3 (Unchecked Destructive Command)*: Ask agent to "clean up temporary files" or run a dangerous shell command (`rm -rf ...`).

---

### Milestone 3: Build Demo 2 — The Hardened Agent (`02-hardened-agent`)
**Objective**: Build the defensive agent architecture with Zod schema validation, an automatic self-correction feedback loop with a 2-retry circuit breaker, and a 3-Tier Human-in-the-Loop (HITL) permission guard.

- [x] **Task 3.1**: Implement Zod validation & JSON Schema generator:
  - [x] Write strict Zod schemas for `read`, `write`, `edit`, `bash`, `list_dir`.
  - [x] Export schemas via `zod-to-json-schema` to dynamically feed OpenAI tool calls.
  - [x] Sync exported schema to `02-hardened-agent/prompts/tools-schema.txt`.
- [x] **Task 3.2**: Implement Self-Correction & Circuit Breaker Loop:
  - [x] Intercept model tool call before execution; run `schema.safeParse(args)`.
  - [x] If validation fails: construct structured error message $\rightarrow$ push to history as `role: "tool"` $\rightarrow$ re-prompt model.
  - [x] Add loop detector & circuit breaker: if validation fails twice or repeats identical hallucinated keys, trip the breaker and alert user.
- [x] **Task 3.3**: Implement 3-Tier Permission Guard & Pause/Resume State Machine:
  - [x] **Tier 1 (Safe)**: `read`, `list_dir` $\rightarrow$ Autonomous execution.
  - [x] **Tier 2 (Mutate)**: `write`, `edit` $\rightarrow$ Halt loop, assign Action ID, push `APPROVAL_REQUIRED` SSE event.
  - [x] **Tier 3 (High Risk)**: `bash` $\rightarrow$ Halt loop, assign Action ID, push `APPROVAL_REQUIRED` SSE event with destructive warning flags.
  - [x] Create resume endpoints: `POST /api/chat/action/approve` and `POST /api/chat/action/reject`.
- [x] **Task 3.4**: Implement Hardened Web UI:
  - [x] Uniform 2-column layout matching Demo 1.
  - [x] Validation badges (`Passed`, `Hallucinated`, `Corrected`, `Circuit Breaker`).
  - [x] Interactive HITL Approval Modal displaying:
    - Tool Name & Risk Tier Badge (Green / Amber / Red).
    - Formatted arguments preview (for `edit`: before/after text; for `bash`: terminal preview).
    - "Approve Execution" vs "Deny Action" actions.

---

### Milestone 4: Build Demo 3 — The MCP Agent (`03-mcp-agent`)
**Objective**: Decouple the 5 tools into an independent Model Context Protocol (MCP) server communicating over `stdio`, dynamically discover capabilities, and bridge to the NestJS backend and web UI.

- [x] **Task 4.1**: Build standalone `mcp-server/`:
  - [x] Implement the 5 tools using `@modelcontextprotocol/sdk`.
  - [x] Configure `StdioServerTransport`.
  - [x] Expose dynamic tool list (`tools/list`) and invocation handler (`tools/call`).
  - [x] Add Bun build script compiling to standalone executable or script.
- [x] **Task 4.2**: Implement NestJS MCP Client Service:
  - [x] Subprocess lifecycle manager spawning `mcp-server` over `stdio` using `StdioClientTransport`.
  - [x] Dynamic tool schema discovery on startup and session init.
  - [x] Format MCP schemas into OpenAI tool calling parameters.
  - [x] Delegate tool execution to `client.callTool()`.
- [x] **Task 4.3**: Implement MCP Permission Guard:
  - [x] Wrap MCP `callTool` with the same 3-Tier Permission Guard and HITL pause/resume flow.
- [x] **Task 4.4**: Implement MCP Web UI:
  - [x] Retain uniform layout, validation badges, and HITL modal.
  - [x] Add **MCP Server Connection & Tool Discovery Badge** showing:
    - Stdio process status (Active / Disconnected / PID).
    - Live list of dynamically discovered tools via JSON-RPC.
    - RPC trace log showing `tools/list` and `tools/call` latency and payloads.

---

### Milestone 5: Uniform UI Polish, End-to-End Testing & Live Demo Dry-Run
**Objective**: Align aesthetic design across all 3 frontends, run automated smoke tests, create root orchestration scripts, and produce the live presentation speaker guide.

- [x] **Task 5.1**: Harmonize Tailwind styling and design tokens across all 3 apps for pixel-perfect structural parity.
- [x] **Task 5.2**: Add root `package.json` with parallel runner scripts:
  - [x] `bun run demo:1` (launches 01 backend + web in mprocs TUI)
  - [x] `bun run demo:2` (launches 02 backend + web in mprocs TUI)
  - [x] `bun run demo:3` (launches 03 mcp-server + backend + web in mprocs TUI)
  - [x] `bun run demo:all` / `bun run dev` (launches all 7 services simultaneously in mprocs TUI tabs)
- [x] **Task 5.3**: Perform live demo dry-run testing with local endpoint compatibility:
  - [x] Verified independent buildability: `bun run build` passes 100% across all 7 projects with 0 errors.
  - [x] Verified circuit breaker and loop detection behavior.
  - [x] Verified HITL approval and rejection workflows.
- [x] **Task 5.4**: Author `DEMO_SCRIPT.md`:
  - [x] Step-by-step speaker talk track (15-minute presentation format).
  - [x] Exact prompt copy-paste snippets.
  - [x] Key talking points highlighting architectural takeaways.

**Files Touched**:
- `package.json` (root launcher)
- `01-basic-agent/web/src/*`, `02-hardened-agent/web/src/*`, `03-mcp-agent/web/src/*`
- `DEMO_SCRIPT.md`

**Acceptance Criteria**:
- Running `bun run demo:all` brings up all 6 endpoints cleanly without port collisions.
- The 3 setups can be showcased side-by-side during a live talk seamlessly.

---

## 3. Decision & Deviation Log

| Date | Author / Agent | Component | Decision / Deviation Description | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| *2026-09-09* | Systems Architect | Global Architecture | Isolated 3 standalone folders with zero shared packages. | Guarantees complete isolation and permits each setup to run or break independently during live talks. |
| *2026-09-09* | Systems Architect | Tooling | Strictly mandated Bun across all projects. | High performance, built-in TypeScript execution, zero npm dependencies, fast hot reloading. |
| *2026-09-09* | Systems Architect | Setup 2 (Hardened) | Cap self-correction retries at 2 with loop detector. | Prevents local models from getting trapped in infinite token-consuming hallucination loops during a live talk. |
| *2026-09-09* | Systems Architect | Setup 3 (MCP) | Use `@modelcontextprotocol/sdk` over `stdio`. | Demonstrates the official standard protocol without introducing unnecessary network socket overhead. |
| *2026-09-09* | Systems Architect | Milestone 1 Scaffolding | Verified 0 errors on `bun run build` across all 7 projects with zero non-Bun lockfiles. | Validates complete environment isolation, port reservations, and TypeScript compatibility. |
| *2026-09-09* | Systems Architect | Developer Experience | Integrated `mprocs` (`bunx mprocs` / `mprocs.yaml`) for parallel TUI tabbed process management. | Provides an interactive terminal UI to view tabs, stream logs, restart processes, and stop all services simultaneously. |
| *2026-09-09* | Systems Architect | Milestone 2 (Naive Agent) | Built unvalidated agent loop, SSE stream controller, and 2-column UI with live preset buttons. | Exposes real local LLM failures (omitted oldText, string depth, unchecked bash) without crashing the web process. |
| *2026-09-09* | Systems Architect | Milestone 3 (Hardened Agent) | Built defensive Zod validation, 2-retry circuit breaker, and 3-Tier HITL pause/resume flow. | Intercepts invalid parameters, feeds self-correction feedback, and pauses on mutate/bash commands for operator sign-off. |
| *2026-09-09* | Systems Architect | TypeScript Optimization | Used `require('zod-to-json-schema')` and disabled `.d.ts` declaration emit in server tsconfig. | Eliminates Node OOM heap crash caused by infinite recursive type resolution in zodToJsonSchema. |
| *2026-09-09* | Systems Architect | Milestone 4 (MCP Agent) | Built decoupled stdio MCP server exposing 5 tools, NestJS client with dynamic discovery, and UI. | Decouples tools out of backend, enables dynamic discovery via `tools/list`, and isolates execution. |
| *2026-09-09* | Systems Architect | Milestone 5 (Polish & Guide) | Created `DEMO_SCRIPT.md` (15-min talk track), verified 100% clean builds on all 7 projects. | Repository is fully verified, operational, and prepared for live presentation. |
