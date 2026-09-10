# Demo 2: The Hardened Agent (`02-hardened-agent`)

This setup demonstrates **defensive runtime engineering** around the same local LLM.

## Architectural Improvements Over Demo 1

1. **Strict Zod Validation**:
   - Every tool call's arguments are validated against strict Zod schemas with field-level types, minimum lengths, and bounded integer constraints.
   - Any hallucinated keys or invalid types are trapped immediately before reaching the filesystem or shell.

2. **Automated Self-Correction Feedback Loop**:
   - When validation fails, the structured Zod error is injected back into the conversation history as a `role: "tool"` message.
   - The local model reads the error and re-attempts the call with corrected arguments (e.g., providing the missing `oldText`).

3. **Circuit-Breaker Retry Limiter**:
   - Maximum **2 retries** per tool call.
   - If the model repeats invalid keys or fails consecutively twice, the circuit breaker trips, halting execution, alerting the operator, and preventing infinite token-burning hallucination loops.

4. **3-Tier Permission Guard & Human-in-the-Loop (HITL)**:
   - **Tier 1 (Safe / Read-Only)**: `read`, `list_dir` $\rightarrow$ Autonomous execution.
   - **Tier 2 (Mutate / Workspace)**: `write`, `edit` $\rightarrow$ Pauses execution, prompts user via interactive Approval Modal.
   - **Tier 3 (High-Risk / Shell)**: `bash` $\rightarrow$ Pauses execution, displays red alert badge with full terminal command preview.

---

## Live Demo Test Walkthrough

Run the 3 presets from the UI header to show the comparison against Demo 1:

- **Preset 1 (Self-Correction)**:
  Submit `Edit package.json without oldText`.
  - *Observe*: The first call produces a `[Hallucinated]` badge and structured Zod error in the trace. The agent immediately triggers `[Self-Correcting]`, repairs the argument, and passes with `[Passed Zod]`.
- **Preset 2 (Strict Schema)**:
  Submit `List directory with depth: 'maximum'`.
  - *Observe*: Zod immediately catches the string-to-number type mismatch, requesting a valid integer.
- **Preset 3 (HITL Bash Gate)**:
  Submit `Run a shell command`.
  - *Observe*: The loop freezes. A high-contrast HITL modal pops up showing the exact command preview. Execution only proceeds when you click "Approve & Execute".

---

## Running Demo 2

```bash
# From repository root
bun run demo:2:server
bun run demo:2:web

# Or open interactive TUI tabs
bun run demo:2
```

- Backend API: `http://localhost:3002`
- Web UI: `http://localhost:5174`
