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
     Edit the file package.json and replace the name with my-awesome-app without specifying oldText.
     ```
   - **Point to the Right Panel**: Show the red **Runtime Failure** card. The model hallucinated omitting `oldText`, resulting in `undefined` string replacement or file corruption.
   - **Key Takeaway**: *"Without schema validation, a single missing key causes runtime crashes or silent data loss."*

3. **Step 2: Trigger Type Hallucination**:
   - Click the preset button or paste:
     ```text
     List the contents of the current directory with depth set to "maximum".
     ```
   - **Point to the Right Panel**: The model passed `"maximum"` instead of an integer. Show how naive JavaScript comparisons evaluate `1 > NaN` to false, causing logic failure.

4. **Step 3: Trigger Unchecked Destructive Shell**:
   - Click the preset button or paste:
     ```text
     Clean up temporary files by executing a shell command to delete all logs.
     ```
   - **Point to the Right Panel**: Show that the backend immediately dispatched `rm -rf` or shell cleanup without asking the operator.
   - **Key Takeaway**: *"Autonomous shell execution without a human-in-the-loop gate is an unacceptable security risk."*

---

### Act 2: Defensive Runtime Engineering & HITL Gates (5 mins)
**Browser Tab**: Switch to `http://localhost:5174` (`02-hardened-agent`)

1. **Speaker Narration**:
   > *"Now let's switch to our Hardened Agent running on port 5174. Here, we haven't changed the underlying local model at all. Instead, we have wrapped it in defensive runtime engineering: strict Zod validation, automated self-correction feedback loops, and a 3-tier permission gate."*

2. **Step 1: Observe Self-Correction**:
   - Click preset **Test 1: Self-Correction Loop**:
     ```text
     Edit the file package.json and replace the name with my-awesome-app without specifying oldText.
     ```
   - **Point to the Right Panel**:
     - Trace #1 shows **`[Hallucinated]`** with structured Zod errors: `[Parameter 'oldText']: Required`.
     - Trace #2 immediately shows **`[Self-Correcting]`**: the error was formatted into a tool message, fed back into the model's history, and the model auto-repaired its own arguments!
     - Trace #3 shows **`[Passed Zod]`**.
   - **Key Takeaway**: *"Small local models don't need fine-tuning to fix hallucinations—they need clear, structured runtime error feedback."*

3. **Step 2: Trigger the Human-in-the-Loop (HITL) Gate**:
   - Click preset **Test 3: Tier 3 HITL Bash Gate**:
     ```text
     Run a shell command to list the directory contents using ls or dir.
     ```
   - **Observe**: The loop instantly pauses. The **Red High-Risk Approval Modal** pops up with an exact terminal preview:
     `$ ls`
   - Explain the 3 Tiers:
     - Tier 1 (Read-Only): Autonomous (`read`, `list_dir`)
     - Tier 2 (Mutate): Requires approval (`write`, `edit`)
     - Tier 3 (High Risk): Full command preview with strict approval (`bash`)
   - Click **"Approve & Execute"** $\rightarrow$ Show the tool completing and the model synthesizing the final answer.

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

---

## Conclusion & Architecture Summary Table

| Capability | Naive Agent (`01`) | Hardened Agent (`02`) | MCP Agent (`03`) |
| :--- | :--- | :--- | :--- |
| **Validation** | ❌ None (raw `JSON.parse`) | ✅ Strict Zod Schemas | ✅ Protocol JSON Schema |
| **Self-Correction** | ❌ None (Crashes/Corrupts) | ✅ 2-Retry Loop Detector | ✅ JSON-RPC Error Recovery |
| **Security Gates** | ❌ None (Blind execution) | ✅ 3-Tier Interactive HITL | ✅ 3-Tier Pre-RPC Gate |
| **Tool Decoupling** | ❌ Monolithic | ❌ Monolithic | ✅ Standalone Stdio Subprocess |
| **Dynamic Discovery**| ❌ Hardcoded | ❌ Hardcoded | ✅ Standard JSON-RPC (`tools/list`)|
