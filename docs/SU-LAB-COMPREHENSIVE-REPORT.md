# SU Lab — Comprehensive Report

**Author**: Claude (Opus 4.6), commissioned by Eyal Nof
**Date**: March 23, 2026
**Version**: 1.0
**Context**: Written after the SU Lab reached 45 voice functions, 3 object types, and a complete FunctionGemma fine-tuning pipeline

---

## 1. Executive Summary

SU Lab is a voice-controlled visual composition engine that runs in the browser on an Android phone. Users speak natural language commands to create, manipulate, animate, and export visual layouts — no keyboard, no code, no drag menus. Just voice and touch.

It started as a prototype for testing Gemini Live's function calling capabilities — a canvas with a few colored shapes that Aria could move around. In less than 48 hours, it evolved into a 45-function system with typed objects (shapes, images, interactive buttons), CSS animations, object relationships, canvas controls, device integration, layout presets, and an auto-capture training pipeline that feeds back into FunctionGemma fine-tuning.

**What makes it significant**: SU Lab is not a feature. It's an architecture. The same canvas that displays shapes can display UI components. The same voice commands that move circles can configure app screens. The same training pipeline that captures "make it red" can learn "create a breathing timer." The primitives are universal — position, size, color, opacity, interaction — and they compose into anything.

The system is simultaneously:
- A **creative tool** for visual composition
- A **therapeutic instrument** for externalization and guided exercises
- A **dataset factory** for fine-tuning a local voice model
- A **prototype** for voice-first app development

No single one of these purposes justified building it. Together, they create something with compounding value.

---

## 2. Technical Architecture

### The Stack

```
Voice Input (microphone)
    ↓
Gemini Live (WebSocket, bidirectional)
    ↓
Function Declaration Matching (45 functions)
    ↓
handleFunction() — switch/case router
    ↓
Zustand Store (useLabStore) — reactive state
    ↓
React Rendering — canvas with objects
    ↓
Training Logger — auto-captures every pair
    ↓
FunctionGemma Dataset (1,448 examples)
    ↓
Fine-tuned GGUF — local inference (~50ms)
    ↓
[Future] Replaces Gemini Live — zero-cost, offline
```

### Key Technical Properties

**Reactive**: Every voice command mutates Zustand state. React re-renders immediately. The user sees the result while Aria is still speaking. Latency from voice to visual is ~300ms (Gemini processing) + ~16ms (React render).

**Composable**: Objects are generic containers. A "button" is a shape with a `buttonConfig` attached. An "image" is a shape with `imageSrc`. The rendering layer switches based on `objectType`. Adding a new type requires: (1) a TypeScript interface extension, (2) a render branch, (3) a config panel section, (4) voice function declarations. The pattern is established and repeatable.

**Self-improving**: Every interaction generates training data. The more you use SU Lab, the better FunctionGemma gets at understanding your voice patterns. The more functions you add, the more diverse the dataset. The system improves by being used.

**Persistent**: Canvas state persists across browser sessions via Zustand middleware. Presets allow saving/loading entire layouts. The training logger accumulates examples across sessions.

**Exportable**: `export_layout` generates real CSS, HTML, or JSON from the canvas. What you build in SU Lab can leave SU Lab. This is not a walled garden.

### Object Model

```typescript
interface LabObject {
  // Identity
  id: string; label: string; objectType: "shape" | "image" | "button"

  // Spatial
  x: number; y: number; width: number; height: number; zIndex: number

  // Visual
  color: string; hue: number; opacity: number; shape: "circle" | "square" | "triangle"

  // Animation
  animation: "spin" | "bounce" | "pulse" | null; animSpeed: number
  orbitTarget: string | null

  // Relationships
  groupId: string | null

  // Type-specific
  imageSrc: string | null
  buttonConfig: ButtonConfig | null
}
```

This is a universal primitive. Every visual element on a screen — button, image, text field, progress bar, chart — can be described by position, size, visual properties, animation, and type-specific configuration. The LabObject model is extensible by design.

---

## 3. The Core Innovation

### Voice-First Visual Composition

Most design tools are visual-first: you see a canvas, you drag elements, you click to configure. Voice is an afterthought, if it exists at all.

SU Lab inverts this. Voice is the **primary** input. Touch is secondary (dragging, tapping to select). The keyboard is absent entirely.

This matters because:

**1. Speed of intent expression**: Saying "make it red, bigger, move left, bring to front" takes 3 seconds. Doing the same with a mouse requires: click color picker → find red → click → drag size handle → drag position → right-click → bring to front. That's 15-20 seconds of fine motor work.

**2. Accessibility**: Voice control means people with motor disabilities can design. People lying in bed can design. People walking can design. The input modality doesn't require a desk, a mouse, or fine motor control.

**3. Natural language is compositional**: "Group the header elements and align them to the top" is one sentence that expresses a complex multi-step operation. In a GUI, that's: select A → shift-click B → shift-click C → right-click → group → align menu → top. The voice command is closer to the user's *intent*.

**4. The feedback loop is immediate**: You speak, the canvas changes, Aria confirms. The loop is: intent → voice → function → visual → voice confirmation. It's conversational. You're *talking to your design*.

### What This Is NOT

SU Lab is not Figma with voice commands bolted on. Figma has 10,000 features and pixel-perfect control. SU Lab has 45 functions and approximate control. That's intentional. The constraint is the feature. When you can only say "make it bigger" (not "set width to 147.3px"), you work at the *concept* level, not the *pixel* level. This is design by intent, not design by specification.

This makes it ideal for:
- Rapid prototyping ("I need a header, a sidebar, and three cards")
- Therapeutic exercises ("Create a shape that represents how you feel")
- Game layouts ("Put the player here, enemies there, health bar at top")
- Teaching ("Show me what a responsive layout looks like")

And not ideal for:
- Production UI design (no pixel-perfect control)
- Print design (no typography system)
- Complex illustrations (no pen/bezier tools)

This is a deliberate trade-off, not a limitation.

---

## 4. Current Capabilities Inventory

### Object Types (3)

| Type | What it renders | Config panel |
|------|----------------|-------------|
| **Shape** | Circle, square, or triangle with color fill | Name, position, size, shape, opacity, color |
| **Image** | background-image: cover in container | Image source URL, file picker, camera capture |
| **Button** | Gradient background with text label, tappable | Label, target type (object/device/URL), action, style (toggle/oneshot/link) |

### Voice Functions (45)

| Category | Count | Examples |
|----------|-------|---------|
| Object manipulation | 10 | "make it red", "bigger", "move left 50" |
| CRUD | 6 | "add a circle", "duplicate", "delete" |
| Config UI | 4 | "open config", "edit shape" |
| Canvas | 5 | "zoom in", "dark background", "hide grid" |
| Presets | 2 | "save as my-header", "load my-header" |
| Relationships | 6 | "align left", "bring to front", "group A and B" |
| Animation | 3 | "make it spin", "orbit around A" |
| Device | 4 | "flashlight on", "battery status" |
| Typed creation | 4 | "add an image", "add a button" |
| Utility | 1 | "copy to clipboard" |

### Canvas Features
- Zoom (0.5x–2x, center-origin)
- Background color (named colors, hex, dark modes)
- Grid overlay (SVG, toggleable)
- Snap-to-grid (20px increments)
- Group drag (grouped objects move together)
- Z-index layering (bring to front, send to back)

### Export
- **JSON**: Structured array of all objects with properties
- **CSS**: Position-absolute CSS classes for each object
- **HTML**: Complete div structure with inline styles

### Training Pipeline
- Auto-capture every voice→function pair
- 1,448 synthetic training examples
- FunctionGemma format with control tokens
- Subset variants (5/15/all function pools)
- Negative examples (6%)
- Export as JSONL for HuggingFace

---

## 5. My Honest Assessment

### What's Genuinely Novel

**The voice→canvas→training loop is original.** I've seen voice-controlled apps. I've seen canvas editors. I've seen fine-tuning pipelines. I have not seen a system where using a voice-controlled canvas automatically generates training data to improve the voice control. This is a closed loop that gets better by existing. That's architecturally elegant.

**The object model is surprisingly general.** When I first saw `LabObject`, I expected it to be a shape-specific hack. But looking at it now — with objectType, buttonConfig, imageSrc, animation, groupId, zIndex — it's a genuine UI component model. You could describe any 2D interface element with this schema. That generality wasn't designed in advance; it emerged from adding features one at a time. That's a good sign — it means the architecture has natural extensibility.

**The export is not a gimmick.** Generating real CSS/HTML from the canvas means SU Lab layouts have a path to production. You can prototype in SU Lab, export, and refine in code. That's a workflow, not a toy.

**The FunctionGemma angle is strategic.** Most people fine-tune models to make them smarter at general tasks. You're fine-tuning a 270M model to be an expert at exactly 45 functions. That's the right approach for edge deployment — small model, narrow domain, high accuracy. The model doesn't need to know everything; it needs to know YOUR functions perfectly.

### What's Genuinely Weak

**No undo.** This is the most obvious gap. Voice commands are irreversible. "Delete it" is permanent. "Clear everything" nukes the canvas. In any design tool, Ctrl+Z is the most-used feature. SU Lab has no command history and no undo stack. This is the highest-priority gap.

**No text objects.** The most basic UI element — a label, a heading, a paragraph — doesn't exist yet. You can't build an app without text. This is the most impactful missing type.

**Button actions are limited.** Buttons can toggle visibility, randomize color, start/stop animation, delete, or open a URL. They can't set a specific color, trigger a sequence of actions, or interact with state beyond the canvas. For real app prototyping, buttons need to be scriptable.

**45 functions is near the Gemini Live limit.** You already experienced disconnections with 45 compact function declarations. Adding more functions will require either: (a) shorter descriptions (already minimized), (b) dynamic function loading (only declare relevant functions), or (c) moving to local FunctionGemma (no token limit).

**No multi-select.** You can only work with one object at a time (or use group). Shift-clicking multiple objects, applying bulk operations, or aligning a subset isn't possible. This limits productivity for complex layouts.

**The canvas has no concept of hierarchy.** Objects exist in a flat list. There's no nesting — you can't put a button inside a container inside a panel. For app development, you need a tree structure (parent→child), not a flat array.

### The Honest Bottom Line

SU Lab is a strong proof of concept with a genuinely novel architecture. It works, it's fun to use, and the self-improving training loop is clever. But it's not yet a product. The gaps (undo, text, hierarchy, multi-select) are real, and closing them is where it either becomes a platform or stays a demo.

The good news: every gap has a clear solution, and the architecture supports them. Nothing requires a rewrite. That's the mark of a good foundation.

---

## 6. Future: Therapeutic Applications

### 6.1 Externalization Therapy

**The principle**: Making internal experiences tangible helps patients process them. A shape on a canvas is an externalized emotion.

**How SU Lab enables this**:
- "Create a shape that represents your anxiety." Patient chooses color, size, shape.
- "How big is it today?" Patient resizes it.
- "Where does it sit in your body?" Patient positions it.
- "What would it look like if it was smaller?" Patient shrinks it.
- "Now create something that makes you feel safe." Patient creates a second object.

The canvas becomes a **spatial map of internal states**. Sessions can be saved as presets and compared over time. The therapist (via dashboard) can see the layouts without being in the room.

### 6.2 Guided Therapeutic Exercises

With the planned object types, SU Lab can host structured clinical exercises:

**Breathing Exercise** (Timer + Animation):
- Timer object counts 4-7-8 breathing pattern
- Circle object pulses in sync (inhale: grow, hold: pause, exhale: shrink)
- Voice: "Start breathing exercise" → creates and starts both objects

**Mood Tracking** (Progress + Chart):
- Daily check-in: "How are you feeling? 1 to 10"
- Progress bar reflects current mood
- Chart shows trend over sessions
- All data stays local (privacy)

**Thought Record (CBT)** (List + Text + Input):
- Patient fills in: Situation, Automatic Thought, Emotion, Evidence For, Evidence Against, Balanced Thought
- Each field is an Input object on the canvas
- Therapist reviews via dashboard
- Template saved as preset, reusable across sessions

**Safe Space Visualization** (Image + Shape + Audio):
- Patient builds their safe space: background image, objects representing comfort
- Audio object plays calming sounds
- Save as preset → patient can "visit" their safe space anytime
- Voice: "Take me to my safe space" → loads the preset

**Emotion Mapping** (Shape + Color + Position):
- Canvas divided into quadrants: high/low energy × pleasant/unpleasant
- Patient places emotion-shapes in the quadrant
- Over sessions, patterns emerge (always high-energy unpleasant → anxiety)
- Therapist can track migration of emotion-objects across sessions

### 6.3 Accessibility

**Voice-only interaction** means SU Lab is inherently accessible to:
- Motor-impaired patients who can't use a mouse/touchscreen
- Visually impaired patients (with screen reader + voice feedback from Aria)
- Children too young for complex UI
- Elderly patients unfamiliar with technology

**Local processing** means:
- No internet required (with FunctionGemma)
- No data leaves the device
- HIPAA-friendly (no cloud, no third-party processors)
- Works in clinical settings with restricted networks

### 6.4 Therapist Tools

The therapist can:
- Design exercise templates as presets ("create breathing exercise template")
- Review patient canvas states via dashboard
- Compare saved presets across sessions (externalization progress)
- Inject guided prompts ("Now try making the anxiety shape smaller")
- Track which voice commands the patient uses (auto-logged)

---

## 7. Future: General App/Game Development

### 7.1 Rapid Prototyping

**Current state**: You can voice-design a layout, export as HTML/CSS, and refine in code.

**With planned types** (Text, Input, Button, List, Progress):
- "Add a heading that says Welcome" → text object with large font
- "Add an email input below it" → input object
- "Add a submit button" → button with action
- "Export as HTML" → functional form prototype

This is faster than any wireframing tool for simple layouts. The voice interface removes the translation step between "I want a header with a button" and the actual artifact.

### 7.2 2D Game Creation

**With current capabilities**:
- Shapes as sprites (circle = player, squares = platforms)
- Animations as behaviors (bounce = jump, orbit = enemy patrol)
- Buttons as controls ("Jump" button that animates the player)
- Groups as game entities (player + health bar + label = character group)
- Presets as levels (save level-1, save level-2, load level-1)
- Export as JSON → game engine data format

**With planned capabilities**:
- Timer for game clocks and cooldowns
- Progress bars for health/mana/experience
- Text for dialogue and score display
- Audio for sound effects and music
- Charts for post-game stats

**Example — Building a Game by Voice**:
```
"Add a blue circle and call it Player"
"Add 5 red squares"
"Rename them E1 through E5"
"Make E1 bounce, E2 spin, E3 orbit around E4"
"Add a green progress bar and call it Health"
"Add a button called Jump"
"Configure Jump to animate Player with bounce"
"Save this as Level 1"
```

That's a game level, described in 8 sentences.

### 7.3 Interactive Presentations

SU Lab can build animated, interactive presentations:
- Each preset is a "slide"
- Objects animate in sequence (spin, bounce, pulse to draw attention)
- Buttons navigate between presets ("Next" button loads next preset)
- Export as HTML → standalone presentation file
- Voice-controlled presenting ("Load slide 3", "Animate the chart")

### 7.4 Education Tools

**For students**:
- "Show me what a responsive layout looks like" → Aria creates objects, explains positioning
- "What happens if I group these?" → Hands-on learning through voice interaction
- Math visualization: create shapes, resize proportionally, demonstrate ratios

**For non-coders**:
- Business owners who need a quick landing page mock
- Therapists designing patient exercises
- Teachers creating interactive materials
- Anyone who can describe what they want but can't code it

### 7.5 The Platform Vision

If SU Lab evolves into a platform, it needs:

| Feature | What it enables |
|---------|----------------|
| **Object hierarchy** (parent→child) | Nested layouts, component groups, panels |
| **Scripting layer** (if/then actions) | Button → sequence of actions, conditional logic |
| **State variables** (counters, flags) | Game score, form validation, visibility toggles |
| **Networking** (share/collaborate) | Multiplayer games, collaborative design, templates marketplace |
| **Plugin system** (custom object types) | Community-created components, domain-specific tools |
| **Template gallery** | Pre-built layouts: landing pages, game templates, therapy exercises |

Each of these is a multiplier on the existing architecture. The foundation supports them — the object model is extensible, the rendering is component-based, the voice layer is declarative.

---

## 8. The FunctionGemma Multiplier

### Why Local Inference Changes Everything

Currently, SU Lab requires:
- Internet connection (Gemini Live WebSocket)
- Google API costs (per-token billing)
- 300-500ms latency (cloud round-trip)
- Cloud dependency (Google can change pricing, deprecate APIs)

With FunctionGemma running locally:
- **Offline operation** — works in airplane mode, in a clinic, in a field
- **Zero marginal cost** — after training, every inference is free
- **~50ms latency** — 10x faster than cloud
- **Privacy** — voice data never leaves the device
- **Reliability** — no API outages, no rate limits

### The Compound Effect

Local inference doesn't just replace the cloud — it enables new use cases:

**Always-on voice**: Without API costs, Aria can listen continuously. No need to tap to activate. The phone becomes a voice-controlled design station.

**Therapeutic privacy**: Patient voice data during therapy exercises never touches the internet. This is not just a preference — it's a clinical requirement in many jurisdictions.

**Edge deployment**: SU Lab can run on any Android phone without any server. Download the app, download the 242MB model, start creating. No account, no subscription, no backend.

**Self-improving locally**: With the auto-capture logger, the model can be periodically re-trained on the user's actual voice patterns. Personalization without cloud dependency.

### The Stack Size

```
FunctionGemma Q4_K_M:  ~242 MB
Kokoro TTS:            ~141 MB
Small reasoning model:  ~200 MB (future)
                       ─────────
Total:                  ~583 MB

For reference:
Instagram app:          ~250 MB
Spotify:               ~350 MB
```

A complete voice-controlled design platform in less storage than a social media app.

---

## 9. Risks and Honest Gaps

### Technical Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| FunctionGemma accuracy insufficient | Medium | Eval on 145 examples will tell us. Can always fall back to cloud for complex commands. |
| 45 functions at Gemini Live's limit | High | Already causing disconnects. FunctionGemma solves this (no token limit locally). |
| localStorage 5MB limit | Low | Already mitigated (imageSrc stripped). IndexedDB for large assets if needed. |
| Mobile performance with many objects | Medium | 20 object limit exists. CSS animations are GPU-accelerated. Should be fine up to ~30. |
| No undo system | High | Needs implementation. Command history stack + reverse operations. |

### Product Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Voice recognition errors | Medium | Gemini is good but not perfect. "Red" vs "read", "to" vs "two". FunctionGemma may be worse. |
| Learning curve for voice commands | Low | 45 functions is a lot to remember. Need a voice command reference or "help" command. |
| Not enough for power users | Medium | Pixel-perfect control, layers panel, undo history — expected by designers. |
| Competition from established tools | Low | Figma/Canva won't add voice-first. This is a different paradigm, not a competitor. |

### Strategic Risks

| Risk | Notes |
|------|-------|
| Single developer | Eyal is the only person building this. Scope must stay manageable. |
| Google API dependency (short-term) | Until FunctionGemma is trained and validated, SU Lab needs Gemini Live. |
| Therapeutic claims need evidence | Before positioning as a clinical tool, need pilot studies or therapist validation. |

---

## 10. Recommended Next Steps (Prioritized by Impact)

### Tier 1: Critical Path (do first)

1. **Complete FunctionGemma training** — This unblocks offline operation, removes the Gemini disconnect problem, and validates the entire training pipeline. Everything else is more valuable with local inference working.

2. **Add undo system** — Every design tool needs undo. Implement a command history stack (last 50 actions) with reverse operations. Voice command: "undo" / "redo".

3. **Add text objects** — The most impactful missing type. Labels, headings, paragraphs. Editable via voice ("set text to Welcome") and config panel.

### Tier 2: High Value (do soon)

4. **Color picker in config panel** — Visual hue slider + preset swatches. Currently you can only set color by name or voice.

5. **Project save/load to file** — Export/import entire project state as JSON file. Enables multiple projects, backup, sharing.

6. **Input objects** — Text fields, number inputs. Combined with buttons and text, this enables form prototyping.

### Tier 3: Platform Features (do when foundation is solid)

7. **Object hierarchy** — Parent-child nesting. Containers that hold other objects.

8. **Timer and Progress objects** — Enables therapeutic exercises (breathing, mood tracking).

9. **Audio objects** — Sound playback, voice recording. Enables richer therapeutic and game experiences.

10. **Template gallery** — Pre-built layouts and exercises. Reduces the cold-start problem for new users.

---

## Final Thought

SU Lab is one of those projects where the sum is greater than the parts. A canvas is boring. Voice commands are a gimmick. A training pipeline is infrastructure. But a canvas you control by voice that teaches a tiny model to understand you, that exports real code, that can host therapy exercises, that runs on a phone with no internet — that's a *system*. And systems compound.

The prototype works. The architecture is sound. The training loop is novel. The therapeutic angle is genuine. The question isn't "is this good?" — it is. The question is "what do you build next?" And this report is your map for that decision.

---

*Report generated by Claude Opus 4.6, March 23, 2026*
*Commissioned by Eyal Nof, creator of SU Lab and the Aria voice assistant*
