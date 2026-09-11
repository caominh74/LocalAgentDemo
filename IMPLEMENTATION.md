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
| **Active Milestone** | **Milestone 8 (UI Modernization)** | Complete on `new-ui`; prior milestones complete |
| **Overall Progress** | `100%` | All 3 agent setups, UI, stdio MCP server, sandboxes, presets, and DEMO_SCRIPT.md complete |
| **Current Blocker(s)** | None | Fully runnable and tested on Bun v1.3.14 |
| **Target LLM Runtime** | Local OpenAI-Compatible | Ollama (`http://localhost:11434/v1`), vLLM (`http://localhost:8000/v1`), or LM Studio |

### Active Port Allocation Map
- **Demo 1 (`01-basic-agent`)**: Backend $\rightarrow$ `http://localhost:3001` \| Frontend $\rightarrow$ `http://localhost:5173`
- **Demo 2 (`02-hardened-agent`)**: Backend $\rightarrow$ `http://localhost:3002` \| Frontend $\rightarrow$ `http://localhost:5174`
- **Demo 3 (`03-mcp-agent`)**: Backend $\rightarrow$ `http://localhost:3003` \| Frontend $\rightarrow$ `http://localhost:5175`
- **MCP Server (`03-mcp-agent/mcp-server`)**: Standard I/O child process (`stdio`)

---

## 2. Phased Roadmap & Milestone Tracking

```mermaid
flowchart LR
    M1[M1: Scaffolding (DONE)] --> M2[M2: Naive Agent (DONE)]
    M2 --> M3[M3: Hardened Agent (DONE)]
    M3 --> M4[M4: MCP Agent (DONE)]
    M4 --> M5[M5: Polish & Guide (DONE)]
    M5 --> M6[M6: Sandbox Isolation (DONE)]
    M6 --> M7[M7: Presets & Schemas (DONE)]
    M7 --> M8[M8: UI Modernization (DONE)]
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

### Milestone 6: Runtime Hardening, Express ESM Fix, and Sandbox Isolation
**Objective**: Fix Bun ESM CommonJS named import incompatibilities, isolate tool executions into dedicated `sandbox/` base directories across all 3 setups, enforce sandbox traversal boundaries, and optimize TypeScript compilation.

- [x] **Task 6.1**: Fix Express named import bug across all 3 backend setups:
  - Replaced `import { Response } from 'express'` with `import type { Response } from 'express'` across `agent.controller.ts` and `agent.service.ts` in setups 01, 02, and 03.
  - Resolves `SyntaxError: Export named 'Response' not found in module '...express/index.js'`.
- [x] **Task 6.2**: Establish isolated `sandbox/` working directories:
  - Created `01-basic-agent/sandbox/`, `02-hardened-agent/sandbox/`, and `03-mcp-agent/sandbox/`.
  - Configured `ToolsService` and `mcp-server` to anchor tool execution (`cwd`) and relative file paths to their respective sandbox.
  - Automatically initialize sandbox directories on boot if missing.
  - Seeded each sandbox with starter fixtures: `package.json` (supporting live preset testing), `sample.txt`, and `README.md`.
- [x] **Task 6.3**: Implement sandbox path traversal security guards:
  - In Demo 2 (`02-hardened-agent`) and Demo 3 (`03-mcp-agent`), updated `resolvePath` to strictly deny and error if any path escapes the sandbox.
- [x] **Task 6.4**: Fix `zod-to-json-schema` compiler heap exhaustion:
  - Imported `zodToJsonSchema` as untyped function cast in `02-hardened-agent/server/src/validation/zod-schemas.ts` to prevent TypeScript generic conditional type recursion from causing a 4GB V8 OOM crash during `tsc`.
- [x] **Task 6.5**: Synchronize frontend config defaults with backend `.env`:
  - Updated `App.tsx` across all 3 frontends to prioritize `data.defaultModel`, `data.defaultBaseUrl`, and `data.defaultApiKey` from `/api/chat/config` over fallback Vite bundle-time env variables.
- [x] **Task 6.6**: Verify global build:
  - Executed root `bun run build` across all 7 projects (3 servers, 3 web apps, 1 mcp-server) with 100% pass and 0 errors.

**Files Touched**:
- `01-basic-agent/sandbox/*`, `02-hardened-agent/sandbox/*`, `03-mcp-agent/sandbox/*`
- `01-basic-agent/server/src/agent/*`, `01-basic-agent/server/src/tools/tools.service.ts`
- `02-hardened-agent/server/src/agent/*`, `02-hardened-agent/server/src/tools/tools.service.ts`, `02-hardened-agent/server/src/validation/zod-schemas.ts`
- `03-mcp-agent/server/src/agent/*`, `03-mcp-agent/mcp-server/src/index.ts`
- `01-basic-agent/web/src/App.tsx`, `02-hardened-agent/web/src/App.tsx`, `03-mcp-agent/web/src/App.tsx`
- `.env` and `.env.example` across setups

---

### Milestone 7: Pedagogical Preset Tuning, Dynamic Hot-Reload & Schema Hardening
**Objective**: Refine preset prompts to consistently expose silent corruption and schema strictness on local LLMs, seed missing log fixtures across all sandboxes, enable Windows PowerShell shell execution, implement dynamic prompt hot-reloading in backends, and display visible testing purposes directly in the UI.

- [x] **Task 7.1**: Seed sandbox log fixtures:
  - Added `debug.log` and `temp.log` to `01-basic-agent/sandbox/`, `02-hardened-agent/sandbox/`, and `03-mcp-agent/sandbox/`.
  - Enables realistic file cleanup and deletion demonstrations.
- [x] **Task 7.2**: Cross-platform shell execution parity:
  - Configured `child_process.exec` in `tools.service.ts` (Demo 1 & 2) and `mcp-server` (Demo 3) with `shell: process.platform === 'win32' ? 'powershell.exe' : undefined`.
  - Allows Unix-style commands (`rm debug.log`, `ls`, `cat`) generated by local models to execute reliably on Windows without `cmd.exe` syntax errors.
- [x] **Task 7.3**: Dynamic prompt & schema asset hot-reloading:
  - Updated `LlmService` across all 3 backends to read `prompts/system-prompt.txt` (and `tools-schema.txt` in Demo 1) dynamically on each chat request instead of caching in the constructor.
  - Enables live prompt tuning during presentations without server restarts.
- [x] **Task 7.4**: System prompt conversational discipline:
  - Added explicit tool invocation policy and relative path discipline to `02-hardened-agent/prompts/system-prompt.txt` and `03-mcp-agent/prompts/system-prompt.txt`.
  - Prevents small 1.5B models from suffering from tool hyperactivity (e.g. attempting to write `/tmp/test.txt` when the user merely says "hi").
- [x] **Task 7.5**: Schema-level condition hardening:
  - Added `"minLength": 1`, integer range limits, and explicit natural language descriptions across all tool definitions in `01-basic-agent/prompts/tools-schema.txt`, `02-hardened-agent/server/src/validation/zod-schemas.ts`, and `03-mcp-agent/mcp-server/src/index.ts`.
  - Added `.strict()` to `ListDirToolSchema` in Demo 2 to strictly block hallucinated extra keys (e.g. `recursive: true`).
- [x] **Task 7.6**: Frontend preset card redesign with visible purpose descriptions:
  - Upgraded `ChatThread.tsx` across all 3 web apps from simple buttons with hover tooltips into 3-column card grids displaying bold titles and clear pedagogical purpose subtitles.
  - Refined prompts: anchored `./package.json` for Preset 1, added `"unlimited"` + `recursive: true` for Preset 2, and targeted `debug.log` for Preset 3.
- [x] **Task 7.7**: Author Testing Presets Matrix in `DEMO_SCRIPT.md`:
  - Added the comprehensive "Testing Presets Matrix & Pedagogical Purpose" table comparing expected behavior across Demo 1, Demo 2, and Demo 3.
- [x] **Task 7.8**: Monorepo build verification:
  - Executed root `bun run build` with 100% pass across all 7 projects.
- [x] **Task 7.9**: Empirical testing report and failure mode analysis (`TESTING.md`):
  - Created `TESTING.md` documenting live empirical evaluation with `qwen2.5-1.5b-instruct`.
  - Analyzed 3 critical failure modes: Silent Data Corruption (`edit`), Hallucinated Argument Discrepancy / Gaslighting (`list_dir`), and Phantom Execution (`bash`).
  - Added architectural comparison table and preset tuning recommendations for peer agent review.

**Files Touched**:
- `TESTING.md`
- `01-basic-agent/sandbox/debug.log`, `01-basic-agent/sandbox/temp.log`, `01-basic-agent/sandbox/package.json`
- `02-hardened-agent/sandbox/debug.log`, `02-hardened-agent/sandbox/temp.log`
- `03-mcp-agent/sandbox/debug.log`, `03-mcp-agent/sandbox/temp.log`
- `01-basic-agent/prompts/tools-schema.txt`, `02-hardened-agent/prompts/system-prompt.txt`, `02-hardened-agent/prompts/tools-schema.txt`, `03-mcp-agent/prompts/system-prompt.txt`, `03-mcp-agent/prompts/tools-schema.txt`
- `01-basic-agent/server/src/llm/llm.service.ts`, `01-basic-agent/server/src/tools/tools.service.ts`
- `02-hardened-agent/server/src/llm/llm.service.ts`, `02-hardened-agent/server/src/tools/tools.service.ts`, `02-hardened-agent/server/src/validation/zod-schemas.ts`
- `03-mcp-agent/server/src/llm/llm.service.ts`, `03-mcp-agent/mcp-server/src/index.ts`
- `01-basic-agent/web/src/components/ChatThread.tsx`, `02-hardened-agent/web/src/components/ChatThread.tsx`, `03-mcp-agent/web/src/components/ChatThread.tsx`
- `DEMO_SCRIPT.md`, `IMPLEMENTATION.md`

---

## 3. Decision & Deviation Log

### Milestone 8: UI Modernization

- [x] Modernize all three independent frontends with consistent typography, scenario cards, endpoint settings, responsive chat/trace panels, and accessible controls.
- [x] Preserve tool traces, validation feedback, approval/rejection previews, and MCP discovery details.
- [x] Build affected applications and verify desktop/mobile layouts and key interactions.


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
| *2026-09-10* | Systems Architect | Bun ESM Parity | Changed Express imports to `import type { Response } from 'express'`. | CommonJS module Express does not export a named runtime `Response`; type-only import prevents Bun ESM runtime crash. |
| *2026-09-10* | Systems Architect | TypeScript / Zod | Cast `zodToJsonSchema` import to untyped callable `(schema: any, options?: any) => any`. | Prevents TypeScript compiler generic recursion from exceeding the 4GB V8 heap memory limit during `tsc` builds. |
| *2026-09-10* | Systems Architect | Workspace Isolation | Added isolated `sandbox/` base directories with pre-seeded `package.json`, `sample.txt`, `README.md`. | Allows users to test presets and drop custom files without risking mutation or corruption of codebase source files. |
| *2026-09-10* | Systems Architect | Security Guard | Enforced sandbox traversal boundary checks in `resolvePath` for Demo 2 & Demo 3. | Rejects attempts to access files outside the `sandbox/` directory, highlighting defensive agent sandboxing. |
| *2026-09-10* | Systems Architect | Web UI / Config | Prioritized `data.default*` from `/api/chat/config` in frontend `App.tsx`. | Ensures edits to backend `.env` files immediately propagate to web UI headers upon browser reload. |
| *2026-09-11* | Systems Architect | Presets & Sandbox Polish | Seeded `debug.log` and `temp.log` in all 3 sandboxes, enabled Windows PowerShell shell option in `tools.service.ts` / `mcp-server`, and refined frontend `PRESET_PROMPTS` for reliable 1.5B/7B local model triggers. | Ensures realistic and reproducible failure/HITL demonstrations on Windows and cross-platform environments. |
| *2026-09-11* | Systems Architect | Asset Hot-Reloading | Replaced constructor caching with dynamic `readFileSync` in `LlmService.getSystemPrompt()` across all 3 servers. | Enables live on-stage prompt swaps and schema adjustments without restarting backend processes. |
| *2026-09-11* | Systems Architect | Conversational Guardrails | Added explicit tool invocation policy ("respond with text on greetings") and path discipline to system prompts. | Prevents small 1.5B models from suffering from tool hyperactivity (e.g. attempting to write `/tmp/test.txt` when user says "hi"). |
| *2026-09-11* | Systems Architect | Schema Strictness | Added `.strict()` to `ListDirToolSchema` and chained `.describe()` across all Zod tool properties. | Rejects extra hallucinated keys (e.g. `recursive: true`) and generates complete OpenAPI descriptions for the model. |
| *2026-09-11* | Systems Architect | UI Pedagogical Cards | Redesigned preset buttons into card grids with explicit subtitles explaining the test purpose. | Makes testing objectives immediately visible to presenters and audience without relying on mouse hover tooltips. |
| *2026-09-11* | Systems Architect | Testing & Failure Analysis | Created `TESTING.md` documenting live empirical evaluation with `qwen2.5-1.5b-instruct`. | Formally details silent corruption, gaslighting discrepancies, and phantom actions for peer agent review. |
| *2026-09-11* | Grok (resume Codex) | Web UI Modernization | Replaced the dense header/preset layout with a shared workspace chrome: demo switcher, collapsible endpoint settings, pedagogical scenario cards, larger composer, and a hideable execution trace. Added per-demo accent themes (amber/emerald/cyan) via a duplicated `index.css` because the three apps stay independently packaged. | Live-talk UI was hard to read (tiny type, competing controls). Codex had rewritten the TSX on `new-ui` but crashed before the stylesheet landed; this session finished the CSS, restored original preset copy, and verified desktop/mobile interactions. |
