# AptaNexus AI Assistant: System Architecture

## Overview

The AptaNexus AI assistant is built on a **Tool-Augmented Large Language Model (LLM)** architecture, also referred to as *Function Calling* or *Agentic AI*. This approach differs fundamentally from a standard LLM interaction, and also from Retrieval-Augmented Generation (RAG). The distinction is important for understanding why this design was chosen for a structured biological database.

---

## Standard LLM vs. Tool-Augmented LLM

| | Standard LLM | Tool-Augmented LLM (this system) |
|---|---|---|
| **Knowledge source** | Training data only (static, may be outdated) | Live database queries at runtime |
| **Factual grounding** | Prone to hallucination of sequences, affinities, or citations | All sequence, Kd, and DOI data retrieved directly from the database |
| **Query flexibility** | Answers in one pass | May invoke multiple database queries in sequence based on the question |
| **Coverage** | General biochemistry knowledge | Specific to the curated AptaNexus records (12,500+ aptamers, 1,900+ targets) |

A standard LLM asked "What is the highest-affinity DNA aptamer for thrombin?" would generate an answer from memory — which may be fabricated or outdated. The tool-augmented approach instead queries the database in real time and bases its answer strictly on the retrieved records.

---

## System Architecture

The system consists of two main components: a **backend MCP server** and a **frontend chatbox interface**, communicating via Server-Sent Events (SSE) for real-time streaming output.

```
User (Browser)
    │
    │  HTTP POST /chat
    ▼
Backend MCP Server (Node.js)
    ├── System prompt (bilingual EN/CN, strict tool-use rules)
    ├── Tool-use loop (max 5 iterations)
    │     ├── Call LLM API (Doubao; DeepSeek as fallback)
    │     ├── If LLM requests a tool → execute database query
    │     └── Feed results back to LLM → continue loop
    └── Stream response tokens to browser via SSE
    │
    ▼
User sees answer appear word-by-word
```

---

## The Tool-Use Calling Chain

The following describes the complete chain from user query to final response, using a representative example: *"What aptamers target VEGF with the highest binding affinity?"*

### Step 1 — User submits query
The user types a question in natural language (English or Chinese). The frontend sends the full conversation history to the backend server.

### Step 2 — LLM receives query with tool definitions
The LLM (Doubao) receives the conversation along with a system prompt and a list of available tools. The tools are defined as structured functions the model may call:

| Tool | Function |
|------|----------|
| `search_by_target` | Search aptamers by target name |
| `top_by_pkd` | Retrieve aptamers ranked by binding affinity (pKd) |
| `get_by_doi` | Retrieve all aptamers from a given publication |
| `list_targets` | List all targets in the database |
| `get_by_external_id` | Look up an aptamer by its external ID |
| `fetch_abstract` | Fetch a paper abstract via DOI (CrossRef / PubMed) |

The LLM does **not** answer directly. Instead, it decides which tool(s) to invoke.

### Step 3 — LLM triggers a tool call
For the example query, the LLM determines it should call `top_by_pkd` with the argument `query = "VEGF"`. This decision is made autonomously based on the question semantics — no keyword matching or rule-based routing is involved.

### Step 4 — Backend executes the tool
The server executes the corresponding database function locally (the entire database is held in memory at runtime for fast lookup). The search uses a three-tier string matching strategy: exact match → substring match → token overlap. The results — including aptamer sequences, pKd values, and DOI links — are returned as structured JSON.

> **Self-correction mechanism:** If a search returns zero results, the tool response includes an instructional hint prompting the LLM to consider alternative spellings, abbreviations, or non-English input and retry with a normalized query. This prevents silent failures without creating infinite loops (a hard iteration limit of 5 serves as an additional safeguard).

### Step 5 — LLM synthesizes the answer
The tool results are appended to the conversation context. The LLM then generates a final response grounded entirely in the retrieved data. If the user's question involves experimental details not present in the database records (e.g., sensor design or clinical application), the LLM additionally calls `fetch_abstract` to retrieve the original paper abstract before answering.

### Step 6 — Response is streamed to the user
The answer is delivered incrementally via SSE — each token is pushed to the browser as soon as it is generated, providing a responsive, word-by-word display. During tool execution, a status indicator informs the user that the database or literature is being queried.

---

## Complete Flow Diagram

```
User query (any language / abbreviation / common name)
         │
         ▼
  LLM interprets intent
  (translates/normalizes internally — no user confirmation required)
         │
         ▼
  LLM selects tool(s) to call
         │
    ┌────┴────────────────────────────────┐
    │                                     │
    ▼                                     ▼
Database query                    fetch_abstract (if needed)
(search_by_target /               CrossRef → PubMed fallback
 top_by_pkd / get_by_doi …)
    │                                     │
    └────────────┬────────────────────────┘
                 │
                 ▼
         Results appended to context
                 │
         ┌───────┴───────┐
         │ Zero results? │
         │  → hint injected → LLM retries with normalized query
         └───────┬───────┘
                 │
                 ▼
     LLM generates grounded answer
     (sequence / Kd / DOI / title / journal — all from database)
                 │
                 ▼
     Streamed token-by-token to browser
```

---

## Why Not RAG?

Retrieval-Augmented Generation (RAG) works by converting documents into numerical vector representations, and at query time, retrieving the most semantically similar text chunks to inject into the prompt. While effective for unstructured text corpora, RAG is less suited for a structured biological database because:

1. **Structured data is better served by exact queries.** Aptamer records have well-defined fields (sequence, target, Kd, DOI). Structured function calls can filter, sort, and rank these fields precisely; vector similarity cannot.
2. **RAG retrieval is static and one-shot.** The tool-use approach allows the LLM to make multiple sequential queries, adjusting its search strategy based on intermediate results.
3. **RAG conflates relevance with similarity.** A record for "thrombin aptamer" and one for "thrombin inhibitor" may have similar embeddings; exact field matching avoids this ambiguity.

The tool-augmented approach treats the LLM as an **intelligent query planner** over a structured database, rather than a reader of retrieved text passages.

---

*Internal reference: [architecture-notes.md](architecture-notes.md) — raw implementation notes*

---

## 相关文件

| 文件 | 关系说明 |
|------|--------|
| [[AptaNexus_Database/README|README]] | 项目概览 |
| [[AptaNexus_Database/CLAUDE|CLAUDE]] | 项目架构说明 |
| [[AptaNexus_Database/DEPLOY|DEPLOY]] | 部署指南 |
