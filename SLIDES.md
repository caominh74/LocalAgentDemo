# Slide source: Agent loops and safeguards

Use this file to build the deck. Each `## Slide` is one slide. Copy the Mermaid blocks into [mermaid.live](https://mermaid.live), Gamma, Notion, or VS Code preview, then screenshot / export.

**Talk in one line:** three setups, same model, same five tools — show how an agent loop works, then show why a schema on the request is not a safeguard.

| Setup | What it is | Port |
| :--- | :--- | :--- |
| **1 Naive** | Schema only. Unrestricted tool calling. | web `5173` · API `3001` |
| **2 Hardened** | Zod schema validation + risk-level HITL. | web `5174` · API `3002` |
| **3 MCP** | Same human gate, tools moved to an MCP server. | web `5175` · API `3003` |

Speaker honesty (do not skip): Setup 3 keeps the **risk-level pause**. It does **not** re-run Zod. Zod self-correction is the Setup 2 story. MCP is *where tools live*, not a smarter model.

Live demo file: `DEMO_SCRIPT.md`. Personal notes: `HOW_IT_WORKS.md`.

---

## Slide 1 — Title

**From schema to runtime: how an agent loop actually runs**

A 3-setup demo of local AI agents

1. Unrestricted tool calling  
2. Validation + risk gates  
3. Same gates, tools over MCP  

> *Same local model. Same five tools. Different runtime around the model.*

---

## Slide 2 — What this talk is (and is not)

**Is:** system design of an agent loop, and why safeguards change what the audience sees.

**Is not:** a new model, a chatbot UI contest, or “MCP makes the LLM smarter.”

The claim:

> A tools JSON schema in the API request is documentation for the model.  
> A safeguard is code that runs **after** the model answers and **before** the tool touches disk or shell.

---

## Slide 3 — Shared architecture

All three demos are full stacks on purpose (no shared packages). The browser never talks to the model.

```mermaid
flowchart LR
  subgraph User["Audience / operator"]
    B[Browser UI]
  end

  subgraph Runtime["This repo"]
    N[NestJS agent loop]
    S[sandbox files]
  end

  subgraph Model["Local inference"]
    L[LM Studio / Ollama / vLLM]
  end

  B -->|"POST /api/chat/stream SSE"| N
  N -->|"chat/completions + tools schema"| L
  L -->|"text or tool_calls"| N
  N --> S
  N -->|"trace events"| B
```

| Layer | Role |
| :--- | :--- |
| Left column | Chat |
| Right column | Execution trace (the loop, live) |
| Nest | Agent loop, SSE, (optional) Zod / HITL / MCP client |
| Local LLM | Next action: talk, or call a tool |

---

## Slide 4 — The agent loop (this is the whole product)

An **agent** here is not “a chat model.” It is a **loop**: model → tools → results → model, until it answers in text. Cap: **8 rounds**.

```mermaid
flowchart TD
  U[User message] --> L[Call LLM with tools schema]
  L --> D{Returned tool_calls?}
  D -->|No - text only| F[FINAL_ANSWER - stop]
  D -->|Yes| P[Parse arguments]
  P --> X[Run tool against sandbox]
  X --> T[Append role tool result]
  T --> L
```

Say this out loud:

> Round: waiting on model → maybe a tool card → result → waiting on model again.  
> That is the loop. The three setups only change the box in the middle.

---

## Slide 5 — Same five tools (invariant)

If the tools differ, the comparison is unfair. Names stay the same even on Windows (`bash` still named `bash`; it runs PowerShell).

```mermaid
flowchart TB
  subgraph Tools["Five tools - all three setups"]
    direction LR
    R[read]
    LD[list_dir]
    W[write]
    E[edit]
    B[bash]
  end

  R --> Disk[sandbox/]
  LD --> Disk
  W --> Disk
  E --> Disk
  B --> Shell[Host shell]
```

| Tool | Effect | Setup 2/3 risk |
| :--- | :--- | :--- |
| `read` | Read a file | Tier 1 — auto |
| `list_dir` | List files | Tier 1 — auto |
| `write` | Create / overwrite | Tier 2 — ask |
| `edit` | Search-replace | Tier 2 — ask |
| `bash` | Shell command | Tier 3 — ask, red |

Workspace is each demo’s `sandbox/` (`sample.txt`, `package.json`, `debug.log`).

---

## Slide 6 — Three setups, one picture

```mermaid
flowchart TB
  M[Same local LLM]

  M --> S1[Setup 1 Naive]
  M --> S2[Setup 2 Hardened]
  M --> S3[Setup 3 MCP]

  S1 --> A1[Schema in the request]
  A1 --> B1[JSON.parse]
  B1 --> C1[Run tool immediately]

  S2 --> A2[Schema in the request]
  A2 --> B2[Zod validate]
  B2 --> C2[Risk tier]
  C2 --> D2[HITL if write/edit/bash]
  D2 --> E2[Then run tool]

  S3 --> A3[Schema from MCP tools/list]
  A3 --> C3[Risk tier]
  C3 --> D3[HITL if write/edit/bash]
  D3 --> E3[MCP tools/call in another process]
```

| | Setup 1 | Setup 2 | Setup 3 |
| :--- | :--- | :--- | :--- |
| Schema shown to the model | Yes | Yes | Yes (discovered) |
| Runtime schema check | No | **Zod** | No Zod |
| Human gate | No | **3-tier HITL** | **Same HITL** |
| Tool process | Inside Nest | Inside Nest | **MCP stdio child** |

---

## Slide 7 — Setup 1: schema is not a runtime

**Design:** send `tools` JSON to the model, `JSON.parse` whatever comes back, call the function. No Zod. No modal.

```mermaid
sequenceDiagram
  participant UI as Browser 5173
  participant N as Nest 3001
  participant LLM as Local LLM
  participant T as ToolsService
  participant FS as sandbox

  UI->>N: user message SSE
  N->>LLM: messages + tools schema
  LLM-->>N: tool_calls name + args string
  N->>N: JSON.parse
  N->>T: execute immediately
  T->>FS: read / write / edit / bash
  FS-->>T: result or crash
  T-->>N: string
  N-->>UI: TOOL_INVOCATION / RESULT / ERROR
  N->>LLM: append tool result, loop
```

**What the audience should see:** `bash` delete `debug.log` runs with no one asked. Multi-step briefing writes `briefing.txt` with no pause.

**Line:** *We documented the tools. We did not enforce them.*

---

## Slide 8 — Setup 1: how tool calling fails (no brakes)

```mermaid
flowchart TD
  Call[Model emits a tool call] --> JSON{Valid JSON?}
  JSON -->|No| Err1[Trace TOOL_ERROR]
  Err1 --> Back[Feed error as role tool]
  Back --> Loop[Call LLM again]

  JSON -->|Yes| Run[Run tool anyway]
  Run --> Ok{Function throws?}
  Ok -->|No| Res[TOOL_RESULT even if args were wrong]
  Ok -->|Yes| Err2[Red stack in trace]
  Err2 --> Back
  Res --> Loop

  Text[Model returns text only] --> Done[FINAL_ANSWER]
  Done --> Lie[May claim success with no tool]
```

Failure modes to name:

1. **Never calls a tool** — treated as success. Chat can lie.  
2. **Bad / missing args** — still executed (empty `oldText` can corrupt `package.json`).  
3. **Throws** — error string goes back; loop retries.  
4. **`bash` exit 1** — returned as a *result*, not an exception.

---

## Slide 9 — Setup 2: put a runtime in the loop

Same loop. New boxes **between** “model asked” and “disk changed.”

```mermaid
flowchart TD
  L[LLM tool_calls] --> P{JSON.parse}
  P -->|fail| FB[Tool message: fix your JSON]
  FB --> L

  P -->|ok| Z{Zod safeParse}
  Z -->|fail 1-2| SC[Structured Zod errors]
  SC --> L
  Z -->|fail 3 times| CB[Circuit breaker - stop that tool]

  Z -->|pass| R{Risk tier}
  R -->|read / list_dir| Run[Execute]
  R -->|write / edit| H[HITL modal Tier 2]
  R -->|bash| H3[HITL modal Tier 3 red]
  H -->|Approve| Run
  H3 -->|Approve| Run
  H -->|Deny| Stop[Runtime FINAL_ANSWER - not executed]
  H3 -->|Deny| Stop
  Run --> Out[Tool result]
  Out --> L
```

**Line:** *We did not change the model. We changed what is allowed to happen after it speaks.*

---

## Slide 10 — Safeguard A: Zod / schema validation

Schema in the **request** vs schema at **runtime**:

```mermaid
flowchart LR
  subgraph Gen["Generation time"]
    S[tools JSON schema]
    M[Model decoder]
    S --> M
  end

  subgraph Run["Runtime - Setup 2 only"]
    Z[Zod schemas]
    V{safeParse}
    Z --> V
    V -->|no| E[Do not execute]
    V -->|yes| G[Continue to risk gate]
  end

  M -->|arguments string| V
```

Zod catches (when the decoder does not already force valid JSON):

- missing / empty `oldText`
- `depth` as a string
- extra keys on `list_dir` (`.strict()`)
- unknown tool name

On fail: **do not run**. Feed field errors back. Model retries. After **2** retries, **circuit breaker**.

> Live-talk caveat: LM Studio / Ollama often constrain decoding, so Zod may not fire. The **HITL modal** is the reliable on-stage safeguard. Zod is still the right design.

---

## Slide 11 — Safeguard B: risk levels + HITL

**HITL** = human-in-the-loop. The loop **pauses**. Nothing mutates until Approve.

```mermaid
stateDiagram-v2
  [*] --> Loop: user message
  Loop --> Model: call LLM
  Model --> Loop: tool result
  Model --> Gate: write / edit / bash
  Gate --> Modal: APPROVAL_REQUIRED
  Modal --> Run: Approve
  Run --> Loop: tool result
  Modal --> Denied: Deny
  Denied --> [*]: runtime says not executed
  Model --> [*]: text only FINAL_ANSWER
```

| Tier | Tools | UI |
| :--- | :--- | :--- |
| 1 Safe | `read`, `list_dir` | No modal |
| 2 Mutate | `write`, `edit` | Approval modal |
| 3 High risk | `bash` | Red modal + command preview |

Deny is **not** “ask the model to apologize.” Nest writes the final sentence so Qwen cannot claim the file was deleted.

---

## Slide 12 — Setup 2 sequence (validation then gate)

```mermaid
sequenceDiagram
  participant UI as Browser 5174
  participant N as Nest 3002
  participant Z as Zod
  participant G as PermissionGuard
  participant LLM as Local LLM
  participant T as ToolsService

  UI->>N: user message
  N->>LLM: messages + tools
  LLM-->>N: tool_calls
  N->>Z: safeParse
  alt invalid
    Z-->>N: field errors
    N-->>UI: Hallucinated / Correcting
    N->>LLM: role tool feedback
  else valid
    N->>G: evaluate tool name
    alt Tier 1
      N->>T: execute
    else Tier 2 or 3
      N-->>UI: modal
      UI-->>N: approve or reject
      alt approved
        N->>T: execute
      else rejected
        N-->>UI: FINAL_ANSWER not executed
      end
    end
  end
```

Demo card: **Loop: Multi-step briefing** — steps 1–3 (`list_dir`, `read`, `read`) auto; step 4 (`write`) pauses.

---

## Slide 13 — Setup 3: keep the gate, move the tools

Setup 2 tools still live **inside Nest**. Setup 3: Nest must not implement `read`/`write`/… The MCP server does.

```mermaid
flowchart LR
  subgraph Browser["5175"]
    UI[Chat + HITL + MCP badge]
  end

  subgraph Nest["3003 - no tool bodies"]
    Loop[Agent loop]
    Gate[3-tier HITL]
    Client[MCP client]
    Loop --> Gate
    Gate --> Client
  end

  subgraph MCP["mcp-server stdio"]
    List[tools/list]
    Call[tools/call]
    Impl[read write edit bash list_dir]
    List --> Impl
    Call --> Impl
  end

  subgraph Disk["sandbox/"]
    FS[files + shell]
  end

  UI --> Loop
  Client -->|"JSON-RPC"| List
  Client -->|"JSON-RPC after Approve"| Call
  Impl --> FS
```

**Line:** *MCP is packaging. The model did not get new intelligence. The tools moved behind a protocol, and the gate still sits in front of the wire.*

---

## Slide 14 — MCP handshake (why the badge exists)

```mermaid
sequenceDiagram
  participant N as Nest
  participant M as mcp-server
  participant LLM as Local LLM
  participant UI as Browser

  N->>M: spawn Bun stdio
  N->>M: tools/list
  M-->>N: 5 tools + inputSchema
  N-->>UI: badge CONNECTED - 5 tools
  N->>LLM: those schemas as OpenAI tools
  LLM-->>N: tool_calls e.g. write
  N-->>UI: HITL modal
  UI-->>N: Approve
  N->>M: tools/call
  M-->>N: result text
  N-->>UI: TOOL_RESULT
```

On stage: click the **MCP stdio** badge, then run the briefing or a write. Watch `tools/list` vs `tools/call`.

Setup 3 **does not** Zod-validate args. Bad JSON still errors and loops. The human gate is the safeguard you demo here.

---

## Slide 15 — Side-by-side: same task, three runtimes

Task: **Loop: Multi-step briefing**  
`list_dir` → `read sample.txt` → `read package.json` → `write briefing.txt` → final answer

```mermaid
flowchart TB
  T[Same user prompt]

  T --> A[Setup 1]
  A --> A1[4 tools run with no pause]
  A1 --> A2[briefing.txt already on disk]

  T --> B[Setup 2]
  B --> B1[Tier 1 reads run]
  B1 --> B2[write blocked]
  B2 --> B3[Approve]
  B3 --> B4[Then briefing.txt]

  T --> C[Setup 3]
  C --> C1[Same pause]
  C1 --> C2[Approve]
  C2 --> C3[tools/call in MCP process]
```

Second live pair: delete `debug.log`

| | Setup 1 | Setup 2 / 3 |
| :--- | :--- | :--- |
| `bash` delete | Immediate | Red modal |
| Deny | n/a | File still there; chat says it did not run |

---

## Slide 16 — Comparison (leave this up while you demo)

```mermaid
flowchart LR
  subgraph S1["Setup 1"]
    a1[Schema]
    a2[Unrestricted execute]
  end
  subgraph S2["Setup 2"]
    b1[Schema]
    b2[Zod]
    b3[Risk HITL]
    b4[Execute in Nest]
  end
  subgraph S3["Setup 3"]
    c1[Schema via tools/list]
    c2[Risk HITL]
    c3[Execute in MCP]
  end
```

| | 1 Naive | 2 Hardened | 3 MCP |
| :--- | :--- | :--- | :--- |
| Agent loop | Yes | Yes | Yes |
| Schema for the model | Yes | Yes | Yes, discovered |
| Zod before execute | No | **Yes** + retry + breaker | No |
| HITL by risk | No | **Yes** | **Yes** |
| Tools in Nest | Yes | Yes | **No** |
| Isolation | None | Sandbox path guard | Sandbox + **separate process** |

---

## Slide 17 — System map (ports)

```mermaid
flowchart TB
  subgraph Demo1["01 Naive"]
    w1[5173]
    s1[3001]
    t1[Tools in Nest]
    w1 --> s1 --> t1
  end

  subgraph Demo2["02 Hardened"]
    w2[5174]
    s2[3002]
    z2[Zod + HITL]
    t2[Tools in Nest]
    w2 --> s2 --> z2 --> t2
  end

  subgraph Demo3["03 MCP"]
    w3[5175]
    s3[3003]
    h3[HITL]
    m3[mcp-server stdio]
    w3 --> s3 --> h3 --> m3
  end

  LLM[localhost:1234 v1]

  s1 --> LLM
  s2 --> LLM
  s3 --> LLM
```

`bun run dev` from repo root starts all seven processes.

---

## Slide 18 — Takeaways

1. **An agent is a loop**, not a single completion.  
2. **A tools schema is not a safeguard.** Setup 1 already sends a schema.  
3. **Safeguards are runtime:** validate args (Zod), then pause by risk (HITL).  
4. **MCP does not replace those gates.** It moves tool *implementations* behind `tools/list` / `tools/call`.  
5. **Deny must be honest.** Do not let the model narrate a rejected delete.

Close:

> We did not train a better model. We put a runtime around the same one.

---

## Suggested slide order vs live clicks

| Slide | Click if you have time |
| :--- | :--- |
| 4 loop | — |
| 7 Setup 1 | `5173` Multi-step briefing, then delete `debug.log` |
| 9–12 Setup 2 | `5174` same briefing (Approve write), then delete and **Deny** |
| 13–14 Setup 3 | `5175` MCP badge, then briefing or write |

If the model is “too good” at schema, skip the omit-`oldText` card. The loop + modal still carry the talk.

---

## How to paste Mermaid into slides

1. Open this file in VS Code / GitHub preview to check diagrams.  
2. Copy a ` ```mermaid ` block into [mermaid.live](https://mermaid.live) → Actions → PNG/SVG.  
3. Dark theme: mermaid.live **Theme → dark**.  
4. Keep one diagram per slide; the tables under each slide are speaker notes, not extra charts.
