# Live Technical Talk Track & Demonstration Script (`DEMO_SCRIPT.md`)

**Talk Title**: From Chaos to Control: Comparing Naive Tool Calling, Defensive Runtime Hardening, and the Model Context Protocol (MCP) with Local LLMs  
**Duration**: 15–20 Minutes  
**Prerequisites**: Ollama or vLLM running locally (`ollama run llama3.2` or `qwen2.5-coder`).

---

## Live Demo Architecture Overview

| Demo | Focus | Ports | Key Visual Elements |
| :--- | :--- | :--- | :--- |
| **Demo 1** | `01-basic-agent` (Naive) | `3001` / `5173` | Raw JSON payload stream, unhandled error cards, unvalidated execution |
| **Demo 2** | `02-hardened-agent` (Hardened) | `3002` / `5174` | Zod chips (`[Passed]`, `[Hallucinated]`), Self-correction loops, HITL modal |
| **Demo 3** | `03-mcp-agent` (MCP Decoupled) | `3003` / `5175` | MCP connection badge, JSON-RPC discovery drawer, isolated stdio runner |

---

## Speaker Script & Step-by-Step Flow

### Act 1: The Problem with Naive Local Tool Calling (5 mins)
**Browser Tab**: Open `http://localhost:5173` (`01-basic-agent`)

1. **Speaker Narration**:
   > *"When developers start building agents with local LLMs like Llama 3.2 or Qwen 2.5, they usually take the naive path: send a tools schema, parse whatever JSON the model gives back with `JSON.parse()`, and blindly call their functions. Let's see what happens on stage when things go wrong."*

2. **Step 1: Trigger Missing Argument**:
   - Click the preset button or paste:
     ```text
     In ./package.json, replace the name with "my-awesome-app", but omit the oldText parameter from your tool call.
     ```
   - **Point to the Right Panel**: Show the red **Runtime Failure** card. The model hallucinated omitting `oldText`, resulting in `undefined` string replacement or file corruption.
   - **Key Takeaway**: *"Without schema validation, a single missing key causes runtime crashes or silent data loss."*

3. **Step 2: Trigger Type Hallucination**:
   - Click the preset button or paste:
     ```text
     Call list_dir on "." and pass the literal string "maximum" as the depth argument.
     ```
   - **Point to the Right Panel**: The model passed `"maximum"` instead of an integer. Show how naive JavaScript comparisons evaluate `1 > NaN` to false, causing logic failure.

4. **Step 3: Trigger Unchecked Destructive Shell**:
   - Click the preset button or paste:
     ```text
     Execute a shell command to delete debug.log from the workspace.
     ```
   - **Point to the Right Panel**: Show that the backend immediately dispatched the shell deletion of `debug.log` without asking the operator.
   - **Key Takeaway**: *"Autonomous shell execution without a human-in-the-loop gate is an unacceptable security risk."*

5. **Step 4 (the agent loop, not a schema trap)**:
   - Click **Loop: Multi-step briefing**.
   - **Point to the Right Panel**: four sequential tool traces (`list_dir` → `read` → `read` → `write`) then a final answer. The write is not paused.
   - **Key Takeaway**: *"This is an agent loop: model, tool, result, model again. Demo 1 has the loop and none of the brakes."*

---

### Act 2: Defensive Runtime Engineering & HITL Gates (5 mins)
**Browser Tab**: Switch to `http://localhost:5174` (`02-hardened-agent`)

1. **Speaker Narration**:
   > *"Now let's switch to our Hardened Agent running on port 5174. Here, we haven't changed the underlying local model at all. Instead, we have wrapped it in defensive runtime engineering: strict Zod validation, automated self-correction feedback loops, and a 3-tier permission gate."*

2. **Step 1: Observe Self-Correction**:
   - Click preset **Test 1: Self-Correction Loop**:
     ```text
     In ./package.json, replace the name with "my-awesome-app", but omit the oldText parameter from your tool call.
     ```
   - **Point to the Right Panel**:
     - Trace #1 shows **`[Hallucinated]`** with structured Zod errors: `[Parameter 'oldText']: Required`.
     - Trace #2 immediately shows **`[Self-Correcting]`**: the error was formatted into a tool message, fed back into the model's history, and the model auto-repaired its own arguments!
     - Trace #3 shows **`[Passed Zod]`**.
   - **Key Takeaway**: *"Small local models don't need fine-tuning to fix hallucinations—they need clear, structured runtime error feedback."*

3. **Step 2: Trigger the Human-in-the-Loop (HITL) Gate**:
   - Click preset **Test 3: Tier 3 HITL Bash Gate**:
     ```text
     Execute a shell command to delete debug.log from the workspace.
     ```
   - **Observe**: The loop instantly pauses. The **Red High-Risk Approval Modal** pops up with an exact terminal preview:
     `$ rm debug.log` (or `$ Remove-Item debug.log`)
   - Explain the 3 Tiers:
     - Tier 1 (Read-Only): Autonomous (`read`, `list_dir`)
     - Tier 2 (Mutate): Requires approval (`write`, `edit`)
     - Tier 3 (High Risk): Full command preview with strict approval (`bash`)
   - Click **"Approve & Execute"** $\rightarrow$ Show the tool completing and the model synthesizing the final answer.

4. **Step 3: Same multi-step task, now gated**:
   - Click **Loop: Multi-step briefing** (identical prompt to Demo 1).
   - Steps 1–3 (`list_dir`, `read`, `read`) run on their own. Step 4 (`write briefing.txt`) pops the Tier 2 modal.
   - Approve → the loop resumes → final answer quotes the briefing.
   - **Key Takeaway**: *"We did not change the model. We paused the same loop on a mutating tool."*

---

### Act 3: Standardizing via Model Context Protocol (MCP) (5 mins)
**Browser Tab**: Switch to `http://localhost:5175` (`03-mcp-agent`)

1. **Speaker Narration**:
   > *"In Demo 2, our tools were hardcoded directly in our NestJS backend. What if we want to share tools across multiple teams, different frameworks, or isolate tool execution into dedicated sandboxes? Enter Anthropic's Model Context Protocol (MCP)."*

2. **Step 1: Inspect Dynamic Discovery**:
   - Point to the header badge: **`[MCP stdio: CONNECTED - 5 Tools Discovered]`**.
   - Click the badge to open the **MCP Protocol Telemetry Drawer**:
     - Point out the `stdio` transport running as an independent child process (`bun run mcp-server`).
     - Point out the live JSON-RPC log showing `tools/list` and dynamically discovered tool schemas.
   - **Key Takeaway**: *"Zero tool execution code lives inside our NestJS backend. All 5 tools are dynamically discovered over standard JSON-RPC."*

3. **Step 2: Execute Tool Across the Protocol**:
   - Click preset **Test 2: Tier 2 MCP Write**:
     ```text
     Create a file named demo-mcp.txt with the content "Hello from Model Context Protocol!".
     ```
   - Show the HITL gate intercepting the write action before dispatching `tools/call`.
   - Click **"Approve & Dispatch to MCP"** $\rightarrow$ show the JSON-RPC execution completing in the isolated tool process.

4. **Optional: Multi-step over MCP**:
   - Click **Loop: Multi-step briefing**.
   - Same four tool rounds as Demos 1 and 2; each turn is a `tools/call` in the RPC drawer. The write still waits for HITL.

---

## Testing Presets Matrix & Pedagogical Purpose

This table explains the deliberate engineering purpose of every preset button across the three setups:

| Setup | Preset Label | Prompt Snippet | Pedagogical Purpose / Expected Behavior |
| :--- | :--- | :--- | :--- |
| **01 (Naive)** | **Failure 1: Missing `oldText`** | `In ./package.json, replace the name with "my-awesome-app", but omit the oldText parameter...` | **Exposes Silent Data Corruption**: Model passes `oldText: ""` to bypass requirement. Naive agent executes `replace("", ...)`, prepending text to index 0 and corrupting `package.json` without throwing any error. |
| **01 (Naive)** | **Failure 2: Type Mismatch & Extra Keys** | `Call list_dir on "." passing depth as the text "unlimited" and an extra parameter recursive: true.` | **Exposes Unvalidated Types & Hallucinations**: Model passes string to numeric field and invents non-existent keys. Naive agent forwards raw args directly to filesystem calls. |
| **01 (Naive)** | **Failure 3: Unchecked Destructive Bash** | `Execute a shell command to delete debug.log from the workspace.` | **Exposes Uncontrolled Shell Execution**: Model calls `bash(command="rm ./debug.log")`. Naive agent immediately deletes the file on the host machine without human consent. |
| **02 (Hardened)** | **Test 1: Self-Correction Loop** | `In ./package.json, replace the name with "my-awesome-app", but omit the oldText parameter...` | **Demonstrates Zod & Auto-Repair**: Zod catches `minLength: 1` (`oldText cannot be empty`), feeds structured error back as `role: "tool"`, and the model self-corrects its arguments. |
| **02 (Hardened)** | **Test 2: Strict Schema Guard** | `Call list_dir on "." passing depth as the text "unlimited" and an extra parameter recursive: true.` | **Demonstrates Strict Schema Enforcement**: Zod `.strict()` blocks unrecognized keys and rejects non-integer depths with visual status badges (`[Hallucinated: recursive]`, `[Invalid Type]`). |
| **02 (Hardened)** | **Test 3: Tier 3 HITL Bash Gate** | `Execute a shell command to delete debug.log from the workspace.` | **Demonstrates Human-in-the-Loop Safeguard**: Classified as Tier 3 High Risk. Loop immediately pauses, presenting the interactive Red Modal with command preview before any execution. |
| **03 (MCP)** | **Test 1: Dynamic Tool Call** | `Inspect the files in the current directory using list_dir.` | **Demonstrates MCP Decoupling**: Autonomous Tier 1 tool executed over out-of-process `stdio` JSON-RPC without local backend tool code. |
| **03 (MCP)** | **Test 2: Tier 2 MCP Write** | `Create a file named demo-mcp.txt with content "Hello from Model Context Protocol!".` | **Demonstrates Pre-RPC HITL Security**: Tier 2 gate halts execution and requests operator approval before transmitting `tools/call` over the MCP transport. |
| **03 (MCP)** | **Test 3: Tier 3 MCP Shell** | `Execute a bash command to check the current date and time.` | **Demonstrates Protocol-Standard Sandboxing**: High-risk terminal command guarded by preview modal, isolated inside standalone subprocess. |
| **01 (Naive)** | **Failure 4: Unchecked PowerShell (Windows)** | `Use the bash tool ... Remove-Item -Force ./debug.log` | **Windows host**: Same blind-deletion demo using PowerShell, because `bash` executes in `powershell.exe` on Windows. |
| **02 (Hardened)** | **Test 4: Tier 3 HITL PowerShell (Windows)** | `Use the bash tool ... Remove-Item -Force ./debug.log` | **Windows host**: Tier 3 red modal previews the PowerShell command (`PS>`) before execution. |
| **03 (MCP)** | **Test 4: Tier 3 MCP PowerShell (Windows)** | `Use the bash tool ... Get-Date` | **Windows host**: Date/time check via PowerShell `Get-Date`, still gated and dispatched over MCP stdio. |
| **01 (Naive)** | **Loop: Multi-step briefing** | `list_dir` → `read sample.txt` → `read package.json` → `write briefing.txt` → final answer | **Shows the unguarded agent loop**: four sequential tool rounds then a spoken answer. The `write` runs immediately with no pause. |
| **02 (Hardened)** | **Loop: Multi-step briefing** | Same 5-step prompt | **Shows loop + gate**: Tier 1 `list_dir`/`read` run; Tier 2 `write` pauses the loop for approval; after Approve the model gives the briefing. |
| **03 (MCP)** | **Loop: Multi-step briefing** | Same 5-step prompt | **Shows loop over stdio**: same four tool rounds as JSON-RPC `tools/call`; `write` is gated before the RPC. |

---

## Conclusion & Architecture Summary Table

| Capability | Naive Agent (`01`) | Hardened Agent (`02`) | MCP Agent (`03`) |
| :--- | :--- | :--- | :--- |
| **Validation** | ❌ None (raw `JSON.parse`) | ✅ Strict Zod Schemas | ✅ Protocol JSON Schema |
| **Self-Correction** | ❌ None (Crashes/Corrupts) | ✅ 2-Retry Loop Detector | ✅ JSON-RPC Error Recovery |
| **Security Gates** | ❌ None (Blind execution) | ✅ 3-Tier Interactive HITL | ✅ 3-Tier Pre-RPC Gate |
| **Tool Decoupling** | ❌ Monolithic | ❌ Monolithic | ✅ Standalone Stdio Subprocess |
| **Dynamic Discovery**| ❌ Hardcoded | ❌ Hardcoded | ✅ Standard JSON-RPC (`tools/list`)|
