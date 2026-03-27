# Structural Contextual Embeddings — Specification

> Vector representations of software components where each vector encodes not just the component's text, but its position in the architecture graph.

**Author:** Eyal Nof
**Version:** 1.0
**Date:** 2026-03-27
**Status:** Proof-of-concept validated, integrated into Aria Personal

---

## Table of Contents

1. [Definition](#definition)
2. [How It Differs from Standard Contextual Embeddings](#how-it-differs)
3. [The Embedding Pipeline](#the-embedding-pipeline)
4. [The Query Interface](#the-query-interface)
5. [Impact Analysis](#impact-analysis)
6. [The Data Packet Pattern](#the-data-packet-pattern)
7. [Integration with the .ctx Context Management System](#integration)
8. [Reference Implementation](#reference-implementation)
9. [Terminology](#terminology)

---

<a id="definition"></a>
## 1. Definition

A **structural contextual embedding** is a dense vector representation of a software component where the vector encodes:

1. **The component's own identity** — its name and description (the text signal)
2. **Its structural role** — type tag (component, store, service, router, etc.)
3. **Its hierarchical position** — which group/layer it belongs to
4. **Its graph neighborhood** — what it connects to, how it connects (call vs subscribe vs HTTP), and what those neighbors' descriptions say

Formally:

```
E(x, C_structural) → R^d

where:
  x           = the component (name + description)
  C_structural = {type, group, outgoing_edges, incoming_edges, neighbor_text}
  d           = embedding dimensionality (default: 50)
```

The critical distinction: the "context" that conditions the embedding is **structural and relational** (graph neighborhood, edge types, architectural hierarchy), not **lexical** (surrounding words in a sentence).

Two components with identical descriptions but different graph neighborhoods produce different embeddings. A store that 9 components subscribe to is embedded differently from a store that 1 component subscribes to — because its structural context is different.

---

<a id="how-it-differs"></a>
## 2. How It Differs from Standard Contextual Embeddings

| | Standard contextual embeddings (BERT, GPT) | Structural contextual embeddings |
|---|---|---|
| **Context source** | Surrounding text tokens in a sentence/document | KG neighborhood: connected nodes, edge types, group membership |
| **What varies** | Same word gets different vectors in different sentences | Same component gets different vectors in different architectures |
| **Requires** | Neural network (transformer), GPU, training data | Hash-based feature extraction + random projection. No GPU, no training. |
| **Output** | Token-level embeddings (768-1024d) | Component-level embeddings (50d) |
| **Use case** | NLP: sentiment, NER, question answering | Software architecture: navigation, impact analysis, cross-boundary search |

### What exists in related work

| Technique | Relationship | Key difference |
|-----------|-------------|----------------|
| TransE, RotatE, ComplEx | KG embedding methods | Trained on KG triples via gradient descent. Ours uses hash projection — no training. |
| KEPLER, KG-BERT | Text + KG joint embeddings | Require model fine-tuning. Ours uses feature extraction from structured .ctx files. |
| GCN, GAT, GraphSAGE | Graph neural network embeddings | Neural architectures requiring GPU + training. Ours runs on a phone. |
| Graph-RAG | KG-augmented retrieval | Uses external embedding models. Ours derives everything from documentation. |

---

<a id="the-embedding-pipeline"></a>
## 3. The Embedding Pipeline

### Input: .ctx architecture files

The pipeline starts with `.ctx` files — structured architecture graphs in the [CTX format](CTX-FORMAT-SPEC.md). Each `.ctx` file encodes nodes (components), edges (dependencies), and groups (layers).

```
# su/ — Visual Logic Canvas
# format: ctx/1.0
# last-verified: 2026-03-27
# edges: -> call/render | ~> subscribe/read | => HTTP API call

## Components
  SUShell : Main canvas: 97 voice functions [root] @entry
    -> LogicEditor, ColorPicker
    ~> labStore, gameVoiceStore
    => termuxRouter, gameRouter
```

### Step 1: Parse .ctx → nodes + edges

The parser (`parse_ctx_file()`) extracts:
- **Nodes**: `{name, type, description, group, source_file, marker}`
- **Edges**: `{from_node, to_node, type}` where type is `call`, `subscribe`, or `http`

### Step 2: Build SQLite KG

Nodes and edges are inserted into a SQLite database with deduplication (same-name nodes keep the richest description).

```sql
nodes (id, name, type, description, group, source_file, source_kg, marker)
edges (id, from_node, to_node, type, source_file, source_kg, weight)
```

### Step 3: Feature extraction (6 weighted signals)

For each node, a sparse feature vector is constructed from the vocabulary of all tokens across all nodes:

| Signal | Weight | What it captures |
|--------|--------|-----------------|
| Self text (name + description) | 1.0 | The component's own identity |
| Type tag (`_type_{type}`) | 2.0 | Structural role — doubled because role is architecturally significant |
| Entry marker (`_entry_point`) | 1.5 | Whether this is a primary entry point |
| Group membership (group name tokens) | 0.5 | Hierarchical position — halved to avoid over-weighting layer names |
| Outgoing neighbor text | 0.7 (edge type) + 0.3 (neighbor tokens) | What this component depends on — the core contextual signal |
| Incoming neighbor text | 0.5 (edge type) + 0.2 (source tokens) | What depends on this component — the reverse contextual signal |

**Why these weights:** Type tags get 2.0 because knowing something is a `[store]` vs a `[component]` is architecturally more informative than any single word in its description. Neighbor tokens are diluted (0.3/0.2) because they're borrowed context — the component's own text should dominate, with neighbor text providing relational color.

### Step 4: Random projection

The sparse vocabulary-sized vector is projected to a dense d-dimensional vector using a random Gaussian matrix (seeded for reproducibility):

```
projected[d] = Σ_i (projection[d][i] * sparse_vec[i])
```

This is the Johnson-Lindenstrauss lemma applied: random projection preserves pairwise distances with high probability. It's O(vocab × d) per node — fast, deterministic, no training.

### Step 5: L2 normalization

Each projected vector is normalized to unit length:

```
embedding = projected / ||projected||_2
```

This enables cosine similarity via simple dot product.

### Output

A JSON file containing 50-dimensional unit vectors for each node:

```json
{
  "nodes": [{"node_id": "SUShell", "dimensions": {"d0": 0.185, "d1": -0.184, ...}}],
  "metadata": {"dim": 50, "node_count": 445, "method": "contextual_hash_projection"}
}
```

---

<a id="the-query-interface"></a>
## 4. The Query Interface

Queries use **hybrid scoring** — three signals combined with configurable weights:

### Signal 1: Text matching (weight: 1.0)

Tokenize the query and each node's name + description. Score = token overlap / query token count.

### Signal 2: Embedding similarity (weight: 0.6)

Find the top 5 text-match anchors. For each anchor, compute cosine similarity against all other embeddings. Keep similarities > 0.3. This surfaces components that are **semantically similar** to the text matches even without keyword overlap.

### Signal 3: Graph traversal (weight: 0.8)

From the top 5 text-match anchors, traverse the KG:
- 1-hop outgoing neighbors: score 0.8
- 1-hop incoming neighbors: score 0.7
- 2-hop outgoing: score 0.4
- 2-hop incoming: score 0.35

This surfaces components that are **structurally connected** to the matches.

### Combined score

```
total = text_score × 1.0 + embedding_score × 0.6 + graph_score × 0.8
```

**Why these weights:** Text gets 1.0 (direct relevance). Graph gets 0.8 (structural connection is strong signal). Embeddings get 0.6 (semantic similarity is useful but noisier than graph edges).

### The "grep would miss" metric

For every query, the system reports how many results were found only via graph traversal or embedding similarity — results that text search (grep) would not have surfaced. This is the core value metric for the system.

---

<a id="impact-analysis"></a>
## 5. Impact Analysis

Impact analysis is reverse-traversal search: "what depends on this component?"

### Risk levels

| Level | Source | Meaning |
|-------|--------|---------|
| **HIGH** | 1-hop incoming edges | Direct dependents — components that call, subscribe to, or make HTTP requests to the target. Will break if target changes. |
| **MEDIUM** | 2-hop incoming edges | Transitive dependents — components that depend on something that depends on the target. May break indirectly. |
| **INDIRECT** | Embedding similarity > 0.4 | Semantically similar components not connected by graph edges. May need review if target's interface changes. |

### Example

Query: `useGameStore` (a Zustand store)

```
HIGH:   GameScreen, BurgerMenu, AriaPanel, OnboardingScreen, ... (9 components)
MEDIUM: game/page (renders GameShell which subscribes to useGameStore)
INDIRECT: useGameThemeStore (0.899), useTranscriptStore (0.893), ... (similar stores)
```

---

<a id="the-data-packet-pattern"></a>
## 6. The Data Packet Pattern

The embedding theory was transferred to an LLM via a **data packet** — a structured set of documents that teaches the LLM the concepts, mathematics, and implementation patterns for contextual embeddings.

### What a data packet contains

| File | Purpose |
|------|---------|
| Conceptual markdown | Theory: what embeddings are, geometric properties, training signals, design heuristics |
| Technical markdown | Mathematics: encoder decomposition, loss functions, pseudocode, probes |
| JSON concept graph | Machine-readable ontology of concepts and their relationships |
| YAML manifest | Structured metadata: domains, principles, dynamics, extensions |
| Mermaid diagrams | Visual architecture of the embedding pipeline |

### Why this matters

Standard approaches to creating custom embeddings require:
1. A training dataset
2. A neural network architecture
3. GPU compute
4. A training loop

The data packet approach replaces all of this with **instruction-based knowledge transfer**: teach the LLM the theory, then have it apply the theory at runtime. The LLM already understands code semantics — it just needs the framework for encoding that understanding as vectors.

This is **meta-learning by instruction** rather than meta-learning by gradient descent.

### Original data packet location

```
/storage/emulated/0/Download/gemini-3-pro/contextual-embedding-nlke/
  Contextual Embedding — Data Packet.md         (mathematical spec)
  Contextual Embeddings A Foundational Data Packet.md  (conceptual theory)
  Contextual Embedding Data Packet (Concept Graph).json (machine-readable ontology)
  contextual_embedding_packet.yaml               (structured manifest)
  mermaid.mmd                                    (pipeline diagram)
  mindmap.mmd                                    (concept map)
```

---

<a id="integration"></a>
## 7. Integration with the .ctx Context Management System

Structural contextual embeddings are an **enhancement layer** (Option 1) on top of the existing lazy-loading context management system:

```
┌─────────────────────────────────────────────────┐
│  Lazy-Loading Context System (primary)          │
│  start-here.md → {folder}.ctx → {folder}.md    │
│  Navigation: structured, manual, precise        │
├─────────────────────────────────────────────────┤
│  Structural Contextual Embeddings (enhancement) │
│  ctx-kg.db + ctx_embeddings.json                │
│  Search: semantic + graph, automatic, fuzzy     │
└─────────────────────────────────────────────────┘
```

The .ctx files are the **source of truth**. The KG and embeddings are **derived artifacts** — regenerated by running `ctx-to-kg.py` whenever .ctx files change.

### Integration points

| Feature | How it uses embeddings |
|---------|----------------------|
| `/ctx -search "query"` | Runs hybrid search, groups results by layer, offers to load relevant .ctx files |
| `/ctx -search --impact ComponentName` | Reverse traversal + embedding similarity for impact analysis |
| `/ctx -menu` (search fallback) | User types text instead of selecting a number → routes to search |
| Aria project expert | CtxKGService searches ctx-kg.db, injects architectural context into Aria's system prompt |

---

<a id="reference-implementation"></a>
## 8. Reference Implementation

### Files

| File | Role |
|------|------|
| `scripts/ctx-to-kg.py` | Parser, KG builder, embedding generator, search + impact query |
| `ctx-kg.db` | SQLite KG (445 nodes, 528 edges from 24 .ctx files) |
| `data/ctx_embeddings.json` | 50-dimensional structural contextual embeddings |
| `.ctx-config.json` | Backend router mapping cache (auto-discovered) |
| `backend/services/ctx_kg_service.py` | CtxKGService for Aria integration |
| `.claude/skills/ctx/SKILL.md` | /ctx skill with -search and --impact modes |

### Dependencies

- Python 3 (standard library only: sqlite3, json, math, re, os)
- No PyTorch, no TensorFlow, no sentence-transformers, no external models
- No GPU required
- Runs on Android/Termux

### Validated results (2026-03-27)

| Query | Text matches | Embedding neighbors | Graph connected | Grep would miss |
|-------|-------------|--------------------|-----------------| ----------------|
| "voice" | 24 | 195 | 29 | 186 |
| "therapy safety graduated disclosure" | 24 | 155 | 15 | 142 |
| "save load game state persistence" | 63 | 233 | 96 | 205 |

---

<a id="terminology"></a>
## 9. Terminology

**Why "structural contextual"?**

- "Contextual" alone is taken — BERT (2018) established "contextual embeddings" to mean token embeddings that vary based on surrounding text.
- "Structural" specifies that the context is **graph structure** (edges, types, groups, hierarchy), not lexical surroundings.
- Together: embeddings whose meaning is conditioned on where a component sits in the architecture, not what words surround it.

**Key terms in this framework:**

| Term | Definition |
|------|-----------|
| Structural context | The graph neighborhood that conditions an embedding: connected nodes, edge types, group membership, hierarchy |
| Contextual hash projection | The embedding method: weighted feature extraction from text + structural signals, reduced via random projection |
| Hybrid scoring | Query method combining text matching (1.0) + embedding similarity (0.6) + graph traversal (0.8) |
| Data packet | A structured document set (markdown + JSON + YAML) that transfers embedding theory to an LLM via instruction |
| Grep-would-miss metric | Count of search results found only via graph or embedding signals — the value-add over text search |
| Enhancement layer | The architectural position: embeddings enhance the .ctx system without replacing it |

---

## Origin

This system was not designed top-down. Three pieces were built independently over 4+ months:

1. **.ctx format and context management system** (March 2026) — solving "how does an AI understand a codebase?"
2. **Contextual embedding data packet** (November 2025) — solving "how do I teach an LLM about embeddings without external models?"
3. **kg-ask.py query interface** (November 2025) — solving "how do I query a knowledge graph in natural language?"

They were connected on March 27, 2026 when a session about the context management system prompted the question "should we add embeddings?" — and the realization that the pieces already existed and were architecturally compatible.

The proof-of-concept was built and validated the same day. The 445-node KG with 528 edges surfaced architectural neighborhoods that text search could not find, confirming that structural context adds real retrieval value beyond what lexical matching provides.
