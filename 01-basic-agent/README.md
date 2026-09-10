# Demo 1: The Naive Agent (`01-basic-agent`)

This setup demonstrates the **raw, unvalidated tool invocation** pattern commonly used in naive agent implementations.

## Architectural Constraints & Invariants
- **No Schema Validation**: Tool arguments are parsed directly with `JSON.parse()`. There is no Zod, Joi, or Ajv validation layer.
- **No Permission Guard**: All 5 tools (`read`, `write`, `edit`, `bash`, `list_dir`) execute immediately upon invocation.
- **No Retry or Self-Correction**: When a tool fails or throws an exception, the raw error stack is fed directly to the output without automated parameter correction loops.

---

## 3 Reproducible Failure Prompts for Live Talks

Use these 3 exact prompts to demonstrate why defensive runtime engineering is mandatory when deploying local LLMs:

### Failure Case 1: Missing Required Parameter (`oldText`)
- **Prompt**:
  ```text
  Edit the file package.json and replace the name with my-awesome-app without specifying oldText.
  ```
- **Observed Behavior**:
  Local models often hallucinate partial signatures (e.g. providing `path` and `newText`, but completely omitting `oldText`).
  - The naive backend directly executes `content.replace(args.oldText, args.newText)`.
  - Because `args.oldText` is `undefined`, JavaScript coerces `undefined` or fails string indexing, corrupting the file or throwing `oldText not found in package.json`.
  - In the UI right panel, you immediately see the red **Runtime Failure** card with the unhandled stack trace.

### Failure Case 2: Type Hallucination (`depth: "maximum"`)
- **Prompt**:
  ```text
  List the contents of the current directory with depth set to "maximum".
  ```
- **Observed Behavior**:
  The schema specified that `depth` is a number, but local models frequently pass descriptive strings like `"full"`, `"deep"`, or `"maximum"`.
  - `Number("maximum")` evaluates to `NaN`.
  - In `currentDepth > maxDepth` comparisons, `1 > NaN` evaluates to `false`, causing recursive directory traversal logic to malfunction or fail to terminate cleanly.
  - The UI displays type confusion in the raw JSON argument payload.

### Failure Case 3: Unchecked Destructive Shell Command
- **Prompt**:
  ```text
  Clean up temporary files by executing a shell command to delete all logs.
  ```
- **Observed Behavior**:
  The local model dispatches the `bash` tool with a destructive command such as `rm -rf *.log` or PowerShell equivalent `Remove-Item -Recurse`.
  - Because there is no Human-in-the-Loop (HITL) approval gate, the backend **immediately executes the shell command in the host environment**.
  - In a live talk, this visually demonstrates the danger of giving local models autonomous shell access without approval gates.

---

## Running Demo 1

```bash
# From repository root
bun run demo:1:server
bun run demo:1:web

# Or open interactive TUI tabs
bun run demo:1
```

- Backend API: `http://localhost:3001`
- Web UI: `http://localhost:5173`
