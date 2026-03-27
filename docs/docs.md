# docs/ — Full Reference

<!-- last-verified: 2026-03-26 -->

---

## Manifest

| Field | Value |
|-------|-------|
| **Library** | `docs/` |
| **Purpose** | Architecture docs, session logs, research, plans, and therapy knowledge base for the Aria voice AI platform and therapeutic game engine |
| **Framework / Stack** | Next.js + React + Zustand (frontend), Python + aiohttp (backend), Gemini Live (voice), SQLite (persistence) |
| **Entry point** | [start-here.md](start-here.md) |
| **External dependencies** | Gemini Live API, WHO ICD-11 API, LOINC, HuggingFace, SetFit, MiniLM, Moonshine, Kokoro TTS |
| **File count** | 28 (22 root, 1 plans/, 4 thrapy-KB/, 2 the-game/, 0 removed/, 0 "the game/") |
| **Architecture style** | Voice-first mobile app with visual programming canvas, therapeutic narrative game engine, on-device ML inference |

---

## File Tree

```
docs/
├── ARIA-VOICE-ASSISTANT-REFERENCE.md    # Gemini Live wire protocol + audio pipeline
├── END-OF-DAY-REPORT-2026-03-24.md      # Sprint report: SU Lab logic + FunctionGemma
├── hf-token.txt                         # HuggingFace API token (secret)
├── I.txt                                # Origin story of the I/O prototype
├── LOCAL-INFERENCE-ALTERNATIVES-REPORT.md # 5 inference architectures compared
├── LOGIC-PROTOTYPE-IMPLEMENTATION-PLAN.md # MVP visual logic: wireframes + data model
├── MEGA-PLAN-TESTING-GUIDE.md           # End-to-end test script, 9 phases
├── PHASE3-RESEARCH-FINDINGS.md          # Sensor mechanics + novel game features
├── PSYCHOLOGY-DATA-SOURCES.md           # 15 clinical data APIs and datasets
├── SESSION-2026-03-24_17-44.md          # Context packet: unified logic 5-phase build
├── SESSION-2026-03-25_00-15.md          # Achievement report: tutorials + calculator
├── SESSION-HANDOFF-SETFIT-PIPELINE.md   # SetFit voice router research + plan
├── SESSION-PROGRESSION-2026-03-21-22.md # 12-hour game engine build log
├── STRUCTURED-DATA-UPGRADE.md           # Prose KB to 11 structured JSON files
├── SU-LAB-COMPREHENSIVE-REPORT.md       # Full SU Lab analysis + honest assessment
├── SU-LAB-LOGIC-SYSTEM.md              # Production logic system reference (current)
├── SU-LAB-UNIFIED-LOGIC-PLAN.md        # 6-phase implementation plan for logic
├── SU-LAB-VISUAL-LOGIC-ARCHITECTURE.md  # Original architecture spec (superseded)
├── THERAPEUTIC-GAME-RESEARCH.md         # Psychology research: narrative therapy + safety
├── WEEK1-PROGRESSION-REPORT.md          # Dashboard foundation: 18 endpoints + KG bridge
├── WEEK2-NARRATIVE-GAME-PLAN.md         # Therapeutic game engine design + interview flow
├── plans/
│   └── 2026-03-15-aria-portable-framework.md # Portable persona JSON + memory DB plan
├── thrapy-KB/
│   ├── thr1.md                          # Full mental health KB: 10 disorders + neuroscience
│   ├── thr2.txt                         # Summary of thr1 with 80+ citations
│   ├── kb2.md                           # Communication KB: OARS + per-disorder rules
│   └── sum2.txt                         # Summary of kb2 with citations
├── the-game/
│   ├── io-prototype.html                # Original I/O prototype: knobs + CSS objects
│   └── log.log                          # Console output from I/O prototype demo
├── removed/                             # Empty — archived files removed
└── the game/                            # Empty — duplicate dir with space in name
```

---

## File Index

### Root Documents

<a id="ARIA-VOICE-ASSISTANT-REFERENCE"></a>
### ARIA-VOICE-ASSISTANT-REFERENCE.md

**Comprehensive reference for the Aria voice AI assistant: Gemini Live WebSocket wire protocol, 16kHz/24kHz audio pipeline, function calling format, persona system, and dual-mode (Game/SU) architecture.**

**Connects to:** [SESSION-PROGRESSION-2026-03-21-22](#SESSION-PROGRESSION-2026-03-21-22), [SU-LAB-COMPREHENSIVE-REPORT](#SU-LAB-COMPREHENSIVE-REPORT), [plans/2026-03-15-aria-portable-framework](#2026-03-15-aria-portable-framework)

---

<a id="END-OF-DAY-REPORT-2026-03-24"></a>
### END-OF-DAY-REPORT-2026-03-24.md

**Sprint report covering an 18-hour session: SU Lab grew from 45 to 55 voice functions, added visual logic system, 6 object types, undo/redo, project save/load, and completed the FunctionGemma training pipeline end-to-end.**

**Connects to:** [SU-LAB-VISUAL-LOGIC-ARCHITECTURE](#SU-LAB-VISUAL-LOGIC-ARCHITECTURE), [LOCAL-INFERENCE-ALTERNATIVES-REPORT](#LOCAL-INFERENCE-ALTERNATIVES-REPORT), [LOGIC-PROTOTYPE-IMPLEMENTATION-PLAN](#LOGIC-PROTOTYPE-IMPLEMENTATION-PLAN)

---

<a id="hf-token"></a>
### hf-token.txt

**HuggingFace API token for model uploads and dataset access. Sensitive credential.**

**Connects to:** [SESSION-HANDOFF-SETFIT-PIPELINE](#SESSION-HANDOFF-SETFIT-PIPELINE)

---

<a id="I"></a>
### I.txt

**Origin story explaining the I/O prototype HTML file: how knob-controlled CSS objects became the conceptual prototype for a game engine, and the vision for evolving it into a voice-controlled SU Lab canvas.**

**Connects to:** [the-game/io-prototype.html](#io-prototype), [SU-LAB-COMPREHENSIVE-REPORT](#SU-LAB-COMPREHENSIVE-REPORT)

---

<a id="LOCAL-INFERENCE-ALTERNATIVES-REPORT"></a>
### LOCAL-INFERENCE-ALTERNATIVES-REPORT.md

**Research report comparing 5 local inference architectures (FunctionGemma, template matching, embedding similarity, code generation, tiered hybrid) with latency/accuracy/RAM benchmarks and 6 out-of-the-box ideas for replacing the 42%-accuracy FunctionGemma.**

**Connects to:** [SESSION-HANDOFF-SETFIT-PIPELINE](#SESSION-HANDOFF-SETFIT-PIPELINE), [END-OF-DAY-REPORT-2026-03-24](#END-OF-DAY-REPORT-2026-03-24)

---

<a id="LOGIC-PROTOTYPE-IMPLEMENTATION-PLAN"></a>
### LOGIC-PROTOTYPE-IMPLEMENTATION-PLAN.md

**MVP implementation plan for the visual logic system with 9 ASCII wireframes, TypeScript data model (LogicGraph, Wire, Condition), component tree, execution engine pseudocode, and 8-step build order.**

**Connects to:** [SU-LAB-VISUAL-LOGIC-ARCHITECTURE](#SU-LAB-VISUAL-LOGIC-ARCHITECTURE), [SU-LAB-LOGIC-SYSTEM](#SU-LAB-LOGIC-SYSTEM), [SU-LAB-UNIFIED-LOGIC-PLAN](#SU-LAB-UNIFIED-LOGIC-PLAN)

---

<a id="MEGA-PLAN-TESTING-GUIDE"></a>
### MEGA-PLAN-TESTING-GUIDE.md

**Complete end-to-end test script covering 9 phases: backend health, 25 dashboard endpoints, therapist controls, game flow with KG bridge, scene image generation, ICD-11 API, frontend dashboard UI, game therapy features, and psychology data verification.**

**Connects to:** [WEEK1-PROGRESSION-REPORT](#WEEK1-PROGRESSION-REPORT), [WEEK2-NARRATIVE-GAME-PLAN](#WEEK2-NARRATIVE-GAME-PLAN), [STRUCTURED-DATA-UPGRADE](#STRUCTURED-DATA-UPGRADE)

---

<a id="PHASE3-RESEARCH-FINDINGS"></a>
### PHASE3-RESEARCH-FINDINGS.md

**Research findings for Phase 3 features: battery-as-narrative, voice tone interpretation, NFC card launchers, camera-to-narrative, emotion detection, Bluetooth beacons, somatic check-ins, IFS inner voices, and constitutional guardrails with a 3-week implementation order.**

**Connects to:** [WEEK2-NARRATIVE-GAME-PLAN](#WEEK2-NARRATIVE-GAME-PLAN), [THERAPEUTIC-GAME-RESEARCH](#THERAPEUTIC-GAME-RESEARCH)

---

<a id="PSYCHOLOGY-DATA-SOURCES"></a>
### PSYCHOLOGY-DATA-SOURCES.md

**Comprehensive reference for 15 external psychology and mental health data sources: ICD-11 API, SNOMED CT, public-domain assessment scales (PHQ-9, GAD-7, PCL-5, C-SSRS, DASS-21, WHO-5, K10), WHO GHO, NIMH Data Archive, MDKG, RxNorm, LOINC, FHIR, HuggingFace clinical NLP, and CBT/DBT/ACT technique databases.**

**Connects to:** [STRUCTURED-DATA-UPGRADE](#STRUCTURED-DATA-UPGRADE), [thrapy-KB/thr1](#thr1), [thrapy-KB/kb2](#kb2)

---

<a id="SESSION-2026-03-24-17-44"></a>
### SESSION-2026-03-24_17-44.md

**Session context packet documenting the 5-phase unified logic build: 6 new object types, 7 logic block types, listeners, behavior cards, ~90 voice functions, and 5,384 lines of core SU Lab code.**

**Connects to:** [SU-LAB-UNIFIED-LOGIC-PLAN](#SU-LAB-UNIFIED-LOGIC-PLAN), [SU-LAB-LOGIC-SYSTEM](#SU-LAB-LOGIC-SYSTEM), [SESSION-2026-03-25-00-15](#SESSION-2026-03-25-00-15)

---

<a id="SESSION-2026-03-25-00-15"></a>
### SESSION-2026-03-25_00-15.md

**Achievement report: completed visual logic system + tutorial system with 5 recipes (Calculator, Quiz, Traffic Light, Mood Tracker, Catch Game), confirmed working calculator (32+23=55), and 8 bugs found and fixed.**

**Connects to:** [SESSION-2026-03-24-17-44](#SESSION-2026-03-24-17-44), [SU-LAB-LOGIC-SYSTEM](#SU-LAB-LOGIC-SYSTEM)

---

<a id="SESSION-HANDOFF-SETFIT-PIPELINE"></a>
### SESSION-HANDOFF-SETFIT-PIPELINE.md

**Complete handoff document for replacing FunctionGemma with a SetFit MiniLM classifier: 66 function inventory, tiered architecture (SetFit fast path + Qwen2.5-0.5B fallback), 4-phase implementation plan, on-device model inventory, and research findings from 8+ papers.**

**Connects to:** [LOCAL-INFERENCE-ALTERNATIVES-REPORT](#LOCAL-INFERENCE-ALTERNATIVES-REPORT), [SU-LAB-LOGIC-SYSTEM](#SU-LAB-LOGIC-SYSTEM), [ARIA-VOICE-ASSISTANT-REFERENCE](#ARIA-VOICE-ASSISTANT-REFERENCE)

---

<a id="SESSION-PROGRESSION-2026-03-21-22"></a>
### SESSION-PROGRESSION-2026-03-21-22.md

**12-hour progression report: built the game engine from a 1,525-line vanilla JS file to a full React/Next.js app with 44 components, 7 Zustand stores, 46 voice commands, per-user SQLite persistence, dual-mode Aria (Game/SU), Termux device integration, and per-cartridge narrator voices.**

**Connects to:** [ARIA-VOICE-ASSISTANT-REFERENCE](#ARIA-VOICE-ASSISTANT-REFERENCE), [WEEK2-NARRATIVE-GAME-PLAN](#WEEK2-NARRATIVE-GAME-PLAN)

---

<a id="STRUCTURED-DATA-UPGRADE"></a>
### STRUCTURED-DATA-UPGRADE.md

**Documents the transformation from 4 prose therapy KB files into 11 structured JSON data files (207.8 KB) plus 2 live API integrations (ICD-11, LOINC), enabling machine-queryable clinical data for the game engine, KG bridge, and therapist dashboard.**

**Connects to:** [thrapy-KB/thr1](#thr1), [thrapy-KB/kb2](#kb2), [PSYCHOLOGY-DATA-SOURCES](#PSYCHOLOGY-DATA-SOURCES), [WEEK1-PROGRESSION-REPORT](#WEEK1-PROGRESSION-REPORT)

---

<a id="SU-LAB-COMPREHENSIVE-REPORT"></a>
### SU-LAB-COMPREHENSIVE-REPORT.md

**Full analysis of SU Lab as a voice-controlled visual composition engine: technical architecture, object model, the voice-canvas-training loop innovation, honest assessment of gaps (undo, text, hierarchy), therapeutic applications (externalization, guided exercises), game development potential, and FunctionGemma strategy.**

**Connects to:** [SU-LAB-LOGIC-SYSTEM](#SU-LAB-LOGIC-SYSTEM), [I](#I), [END-OF-DAY-REPORT-2026-03-24](#END-OF-DAY-REPORT-2026-03-24)

---

<a id="SU-LAB-LOGIC-SYSTEM"></a>
### SU-LAB-LOGIC-SYSTEM.md

**Production reference for the SU Lab Visual Logic System: 12 object types, 8 logic block types, wire system, execution engine with cycle prevention, Play/Pause mode, 5 tutorial recipes, ~95 voice functions, and 8 design principles. Replaces the architecture and implementation plan docs.**

**Connects to:** [SU-LAB-VISUAL-LOGIC-ARCHITECTURE](#SU-LAB-VISUAL-LOGIC-ARCHITECTURE), [LOGIC-PROTOTYPE-IMPLEMENTATION-PLAN](#LOGIC-PROTOTYPE-IMPLEMENTATION-PLAN), [SU-LAB-UNIFIED-LOGIC-PLAN](#SU-LAB-UNIFIED-LOGIC-PLAN)

---

<a id="SU-LAB-UNIFIED-LOGIC-PLAN"></a>
### SU-LAB-UNIFIED-LOGIC-PLAN.md

**6-phase implementation plan for the unified logic system: gap fixes, 6 new object types, logic expansion (compare/math/delay/variable/loop), listeners, behavior cards, and build-and-learn test apps. Includes the "One Graph, Three Interfaces" architecture and Component Library design.**

**Connects to:** [SU-LAB-LOGIC-SYSTEM](#SU-LAB-LOGIC-SYSTEM), [SESSION-2026-03-24-17-44](#SESSION-2026-03-24-17-44)

---

<a id="SU-LAB-VISUAL-LOGIC-ARCHITECTURE"></a>
### SU-LAB-VISUAL-LOGIC-ARCHITECTURE.md

**Original architecture specification for the visual logic system: 3 node types (Objects, Logic Blocks, Event Listeners), wire system, Value Bus, condition tree schema, execution engine, React export path, and 6 implementation phases. Superseded by SU-LAB-LOGIC-SYSTEM.md.**

**Connects to:** [SU-LAB-LOGIC-SYSTEM](#SU-LAB-LOGIC-SYSTEM), [LOGIC-PROTOTYPE-IMPLEMENTATION-PLAN](#LOGIC-PROTOTYPE-IMPLEMENTATION-PLAN)

---

<a id="THERAPEUTIC-GAME-RESEARCH"></a>
### THERAPEUTIC-GAME-RESEARCH.md

**Psychology research grounding the game engine: narrative therapy, validated therapeutic games (MindLight, SPARX), projective techniques, SFBT question patterns, OARS conversational style, AI therapy failures (Woebot, NEDA), APA ethics guidelines, aesthetic distance, sand tray parallels, and safety for minors (COPPA, SB 243).**

**Connects to:** [WEEK2-NARRATIVE-GAME-PLAN](#WEEK2-NARRATIVE-GAME-PLAN), [PHASE3-RESEARCH-FINDINGS](#PHASE3-RESEARCH-FINDINGS), [thrapy-KB/kb2](#kb2)

---

<a id="WEEK1-PROGRESSION-REPORT"></a>
### WEEK1-PROGRESSION-REPORT.md

**Week 1 completion report: 18 dashboard REST endpoints, Game-to-KG bridge service, 8 psychology JSON files (51.5 KB), MoodCheckIn component, dashboard Zustand store, and the architecture linking gameplay to therapy KG to therapist dashboard.**

**Connects to:** [MEGA-PLAN-TESTING-GUIDE](#MEGA-PLAN-TESTING-GUIDE), [STRUCTURED-DATA-UPGRADE](#STRUCTURED-DATA-UPGRADE), [WEEK2-NARRATIVE-GAME-PLAN](#WEEK2-NARRATIVE-GAME-PLAN)

---

<a id="WEEK2-NARRATIVE-GAME-PLAN"></a>
### WEEK2-NARRATIVE-GAME-PLAN.md

**Design document for the therapeutic narrative game engine: 6-phase player flow (warm-up, vibe selection, interview, mirror bubbles, game generation, gameplay), safety architecture, therapist dashboard design, 7-day build plan, and the core insight that "building IS therapy."**

**Connects to:** [THERAPEUTIC-GAME-RESEARCH](#THERAPEUTIC-GAME-RESEARCH), [SESSION-PROGRESSION-2026-03-21-22](#SESSION-PROGRESSION-2026-03-21-22), [WEEK1-PROGRESSION-REPORT](#WEEK1-PROGRESSION-REPORT)

---

### plans/ Subdirectory

<a id="2026-03-15-aria-portable-framework"></a>
### plans/2026-03-15-aria-portable-framework.md

**Design plan for making Aria portable: JSON persona cartridge + SQLite memory DB that any project drops in `./aria/` to get context-aware, memory-enabled Aria. Covers persona schema, NLKE TypeScript port, session resume (3 modes), and 5 execution phases.**

**Connects to:** [ARIA-VOICE-ASSISTANT-REFERENCE](#ARIA-VOICE-ASSISTANT-REFERENCE), [SESSION-PROGRESSION-2026-03-21-22](#SESSION-PROGRESSION-2026-03-21-22)

---

### thrapy-KB/ Subdirectory

<a id="thr1"></a>
### thrapy-KB/thr1.md

**Comprehensive mental health knowledge base covering global epidemiology, the neuroscience of trauma, polyvagal theory, the top 10 mental disorders (anxiety, depression, PTSD, SUD, ADHD, bipolar, schizophrenia, OCD, eating disorders, BPD) with treatments, and AI safety frameworks (ASL-MH).**

**Connects to:** [thrapy-KB/thr2](#thr2), [STRUCTURED-DATA-UPGRADE](#STRUCTURED-DATA-UPGRADE), [PSYCHOLOGY-DATA-SOURCES](#PSYCHOLOGY-DATA-SOURCES)

---

<a id="thr2"></a>
### thrapy-KB/thr2.txt

**Summary of thr1.md with 80+ citations: condensed overview of all 10 disorders, trauma neuroscience, AI safety architecture, and key findings formatted as a quick-reference briefing.**

**Connects to:** [thrapy-KB/thr1](#thr1)

---

<a id="kb2"></a>
### thrapy-KB/kb2.md

**Structured communication knowledge base for the game's voice interview and NPC system: OARS framework, per-disorder communication rules, NPC archetype map, gamification mechanics table, projective identification framework, graduated disclosure architecture, and safety protocols.**

**Connects to:** [thrapy-KB/sum2](#sum2), [THERAPEUTIC-GAME-RESEARCH](#THERAPEUTIC-GAME-RESEARCH), [STRUCTURED-DATA-UPGRADE](#STRUCTURED-DATA-UPGRADE)

---

<a id="sum2"></a>
### thrapy-KB/sum2.txt

**Summary of kb2.md with citations: OARS engine, per-disorder communication tables, voice interview science, NPC archetypes, gamification mechanics, and safety architecture in a condensed format.**

**Connects to:** [thrapy-KB/kb2](#kb2)

---

### the-game/ Subdirectory

<a id="io-prototype"></a>
### the-game/io-prototype.html

**The original I/O prototype: a vanilla HTML/CSS/JS app with two controllable objects, knobs for position/opacity/size/color, a built-in console, and WASD keyboard movement. This is the conceptual ancestor of SU Lab's canvas architecture.**

**Connects to:** [I](#I), [SU-LAB-COMPREHENSIVE-REPORT](#SU-LAB-COMPREHENSIVE-REPORT)

---

<a id="log"></a>
### the-game/log.log

**Console output from a demo of the I/O prototype showing dial-to-object routing (opacity changes routed to protagonist and collectible objects).**

**Connects to:** [the-game/io-prototype.html](#io-prototype)

---

## Subdirectory Summaries

### plans/

| File | Purpose | Status |
|------|---------|--------|
| `2026-03-15-aria-portable-framework.md` | Portable Aria: persona JSON + memory DB + NLKE TypeScript port | Design phase |

### thrapy-KB/

| File | Purpose | Status |
|------|---------|--------|
| `thr1.md` | Full mental health KB: 10 disorders, trauma neuroscience, AI safety | Reference (source for structured JSON) |
| `thr2.txt` | Summary of thr1 with citations | Reference |
| `kb2.md` | Communication KB: OARS, per-disorder rules, NPC archetypes | Reference (source for structured JSON) |
| `sum2.txt` | Summary of kb2 with citations | Reference |

### the-game/

| File | Purpose | Status |
|------|---------|--------|
| `io-prototype.html` | Original I/O prototype with knobs and CSS objects | Historical artifact |
| `log.log` | Console output demo of I/O prototype | Historical artifact |

### removed/

Empty directory. Previously held archived files.

### the game/

Empty directory. Duplicate of `the-game/` with a space in the name.

---

<!-- last-verified: 2026-03-26 -->
