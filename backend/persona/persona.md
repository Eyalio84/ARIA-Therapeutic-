<!-- last-verified: 2026-03-25 -->

# persona/ — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `backend/persona/` |
| **Purpose** | Dimension computers for Aria's persona engine — computes emotional, linguistic, relational, and temporal state for both brand (jewelry store) and therapy (mental wellbeing) contexts |
| **Framework / stack** | Python, persona_engine framework (`DimensionComputer` base class), SQLite (KG storage) |
| **Entry point** | `__init__.py` (empty — modules imported individually) |
| **External dependencies** | `persona_engine` (DimensionComputer, EmotionalState, LinguisticState, RelationalState, TemporalState), `sqlite3`, TherapyKG (from `build_therapy_kg.py`) |
| **File count** | 9 (1 init + 4 brand + 4 therapy) |
| **Architecture style** | Four-axis persona model (Emotional X, Relational Y, Linguistic Z, Temporal T) with parallel brand/therapy implementations per axis |

## File tree

```
persona/
  __init__.py                  # Empty package init
  brand_emotional.py           # Brand emotional state from customer signals
  brand_linguistic.py          # Fixed jewelry brand voice and vocabulary
  brand_relational.py          # Product KG entity detection and traversal
  brand_temporal.py            # Customer journey stage tracking
  therapy_emotional.py         # Empathy level from user's therapy KG
  therapy_linguistic.py        # Adaptive therapeutic voice with media analogies
  therapy_relational.py        # Therapy KG entity detection and subgraph activation
  therapy_temporal.py          # Session arc tracking and cross-session handoff
```

## Component / module index

---

<a id="__init__"></a>

### persona/\_\_init\_\_.py

**Empty package initializer.**

**Connects to:** nothing

---

<a id="BrandEmotionalComputer"></a>

### persona/brand_emotional.py

**Computes the brand's emotional state (X-axis) from customer interaction signals such as gift shopping, price sensitivity, product interest, and conversation turn count.**

- `MOOD_MAP` maps mood names (welcoming, warm, excited, empathetic, enthusiastic, attentive, measured, neutral) to value/intensity pairs
- `compute()` analyzes the user message and turn count to select a mood
- `_analyze_signals()` performs keyword detection across four signal categories: gift, price, product interest, and information-seeking

**Connects to:** `persona_engine.DimensionComputer`, `persona_engine.EmotionalState`

---

<a id="BrandLinguisticComputer"></a>

### persona/brand_linguistic.py

**Defines a fixed jewelry brand voice (Z-axis) with a vocabulary map that transforms casual words into sophisticated alternatives and a detailed voice instruction for the Aria jewelry persona.**

- `VOCABULARY` maps 12 casual terms to brand-appropriate alternatives (e.g., "buy" to "discover", "cheap" to "accessible")
- `VOICE_INSTRUCTION` is a multi-line system prompt defining Aria's jewelry store character

**Connects to:** `persona_engine.DimensionComputer`, `persona_engine.LinguisticState`

---

<a id="BrandRelationalComputer"></a>

### persona/brand_relational.py

**Detects product, material, occasion, and category mentions in user messages by traversing a jewelry knowledge graph stored in SQLite (Y-axis).**

- `__init__()` takes a `db_path` to a SQLite KG database
- `_ensure_loaded()` lazy-loads nodes and builds a name/keyword index for fast detection
- `_detect_entities()` performs full-name and keyword matching, prioritizing full-name matches and product nodes
- `_get_neighbors()` retrieves related KG nodes via edge traversal

**Connects to:** `persona_engine.DimensionComputer`, `persona_engine.RelationalState`, `sqlite3` (jewelry KG database)

---

<a id="BrandTemporalComputer"></a>

### persona/brand_temporal.py

**Tracks the customer journey stage (T-axis) through greeting, discovery, exploration, consideration, and decision phases based on message keywords and turn count.**

- `JOURNEY_STAGES` defines the five-stage purchase funnel
- `_determine_stage()` detects decision, consideration, and exploration keywords; falls back to turn-count heuristics
- `_update_memory()` keeps a rolling window of the last 10 conversation summaries per entity

**Connects to:** `persona_engine.DimensionComputer`, `persona_engine.TemporalState`

---

<a id="TherapyEmotionalComputer"></a>

### persona/therapy_emotional.py

**Computes empathy level (X-axis) from the user's therapy KG state, prioritizing crisis signals, then breakthroughs, then concern intensity and session mood trajectory.**

- `MOOD_MAP` includes 9 therapy-specific moods from `crisis_gentle` (max care) to `celebrating` (breakthrough)
- `compute()` follows a priority chain: crisis flag > breakthrough > KG concern intensities
- `_compute_from_kg()` averages concern intensities and checks mood trajectory (improving vs stable)
- `_sounds_distressed()` performs keyword-based distress detection as a fallback when no KG data exists

**Connects to:** `persona_engine.DimensionComputer`, `persona_engine.EmotionalState`

---

<a id="TherapyLinguisticComputer"></a>

### persona/therapy_linguistic.py

**Adapts Aria's therapeutic voice (Z-axis) based on the user's KG — incorporating media analogies, mood-appropriate tone adjustments, and a vocabulary that transforms clinical language into human language.**

- `THERAPY_VOCABULARY` maps 18 clinical/dismissive terms to validating alternatives (e.g., "symptom" to "experience", "should" to "might")
- `BASE_VOICE` defines Aria's companion persona with strict guardrails (never give unsolicited advice, never use clinical language)
- `_build_voice()` appends media analogy context and mood-specific tone instructions to the base voice

**Connects to:** `persona_engine.DimensionComputer`, `persona_engine.LinguisticState`

---

<a id="TherapyRelationalComputer"></a>

### persona/therapy_relational.py

**Traverses the user's therapy KG (Y-axis) to detect concern, trigger, and coping mentions in messages, activating the relevant subgraph including media analogies and coping strategies.**

- `__init__()` accepts a `TherapyKG` instance; `set_kg()` allows runtime KG swapping
- `_ensure_indexed()` builds a word/phrase index from KG nodes including intent keywords
- `compute()` falls back to implicit concern activation when no direct entity match is found
- `_get_media_analogies()` and `_get_coping()` retrieve connected media and coping nodes via edge types

**Connects to:** `persona_engine.DimensionComputer`, `persona_engine.RelationalState`, `TherapyKG` (from `build_therapy_kg.py`)

---

<a id="TherapyTemporalComputer"></a>

### persona/therapy_temporal.py

**Tracks within-session arc (opening to closing) and cross-session continuity (T-axis), including mood velocity calculation and the "handoff moment" — generating a continuity prompt from the last session's KG data.**

- `SESSION_STAGES` defines five therapy session phases: opening, exploration, deepening, reflection, closing
- `_determine_stage()` detects closing, deepening, and reflection keywords; falls back to turn count
- `_calculate_velocity()` compares mood endpoints across sessions to determine improving/declining/stable trend
- `_generate_handoff()` assembles a continuity prompt from last session summary, mood trajectory, active concerns, media analogies, and KG growth count

**Connects to:** `persona_engine.DimensionComputer`, `persona_engine.TemporalState`

---

## External dependencies summary

### Framework types

| Type | Purpose |
|---|---|
| `DimensionComputer` | Base class for all dimension computers — defines the `compute()` interface |
| `EmotionalState` | Return type for X-axis computers (value, mood, intensity, reason, grounded_in) |
| `LinguisticState` | Return type for Z-axis computers (dialect, distinctiveness, vocabulary, voice_instruction) |
| `RelationalState` | Return type for Y-axis computers (activated, relation_type, target, intensity, context) |
| `TemporalState` | Return type for T-axis computers (step, trajectory, velocity, momentum, memory) |

### Libraries / external systems

| Name | Purpose |
|---|---|
| `persona_engine` | Framework providing `DimensionComputer` base class and all state dataclasses |
| `sqlite3` | Database access for knowledge graph traversal (brand and therapy relational computers) |
| `TherapyKG` | User's personal therapy knowledge graph instance (from `build_therapy_kg.py`) |
