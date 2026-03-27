"use client"

type Status = "done" | "active" | "planned"

interface RoadmapItem {
  text: string
  status: Status
}

interface RoadmapSection {
  id: string
  title: string
  icon: string
  description: string
  items: RoadmapItem[]
}

const STATUS_STYLE: Record<Status, { bg: string; border: string; text: string; check: string }> = {
  done: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", check: "\u2713" },
  active: { bg: "bg-amber-400/10", border: "border-amber-400/20", text: "text-amber-400", check: "\u25CB" },
  planned: { bg: "bg-white/3", border: "border-white/5", text: "text-white/30", check: "\u25CB" },
}

const ROADMAP: RoadmapSection[] = [
  {
    id: "nai",
    title: "NAI",
    icon: "\u26A1",
    description: "Knowledge graph search, introspection, persona state",
    items: [
      { text: "Multi-KG switching (any SQLite KG)", status: "done" },
      { text: "KG schema auto-detection (7 profiles)", status: "done" },
      { text: "Introspection validator (4D state)", status: "done" },
      { text: "NAI Search with hybrid retrieval", status: "done" },
      { text: "KG Explorer with node details", status: "done" },
      { text: "Gemini embedding integration", status: "planned" },
      { text: "Multi-hop graph reasoning (2+ hops)", status: "planned" },
      { text: "Cross-KG query federation", status: "planned" },
    ],
  },
  {
    id: "store",
    title: "Store",
    icon: "\u{1F6CD}",
    description: "Zustand stores, persistence, state management",
    items: [
      { text: "Tab store (SDK/Store/Roadmap)", status: "done" },
      { text: "Chat store (Gemini streaming)", status: "done" },
      { text: "Game voice store (Aria state)", status: "done" },
      { text: "Lab store (SU Lab canvas + objects)", status: "done" },
      { text: "Lab store: canvas state (zoom, bg, grid)", status: "done" },
      { text: "Lab store: typed objects (shape/image/button)", status: "done" },
      { text: "Lab store: presets (save/load)", status: "done" },
      { text: "Zustand persist middleware on lab store", status: "done" },
      { text: "Product store for commerce", status: "planned" },
    ],
  },
  {
    id: "su-lab",
    title: "SU Lab",
    icon: "\u{1F9EA}",
    description: "Voice-controlled composition engine — 45 functions",
    items: [
      { text: "Canvas with draggable objects (circle/square/triangle)", status: "done" },
      { text: "Voice control via Gemini Live (Aria)", status: "done" },
      { text: "Object CRUD (add/duplicate/delete/rename)", status: "done" },
      { text: "Color, opacity, size, position commands", status: "done" },
      { text: "Shape edit mode (8 drag handles, w/h)", status: "done" },
      { text: "Canvas controls (zoom, bg, grid, snap, clear)", status: "done" },
      { text: "Relationships (align, layer, group, distribute)", status: "done" },
      { text: "Animations (spin, bounce, pulse, orbit)", status: "done" },
      { text: "Presets (save/load layouts)", status: "done" },
      { text: "Device commands (torch, battery, volume, notify)", status: "done" },
      { text: "Export (JSON/CSS/HTML to clipboard)", status: "done" },
      { text: "Typed objects: image containers", status: "done" },
      { text: "Typed objects: interactive buttons", status: "done" },
      { text: "Creation drawer (bottom sheet)", status: "done" },
      { text: "Training data auto-capture logger", status: "done" },
      { text: "Color picker in config panels (hue slider + presets)", status: "done" },
      { text: "Project save/load to external JSON file", status: "done" },
      { text: "Text objects (labels, headings, paragraphs)", status: "done" },
      { text: "Undo/Redo system (30 snapshots, voice + UI)", status: "done" },
      { text: "Local FunctionGemma toggle (cloud vs local)", status: "planned" },
      // New object types — app/game creation (therapeutic focus)
      { text: "Object type: Input (text field, number, form elements)", status: "planned" },
      { text: "Object type: Video (embed player, psychoeducation)", status: "planned" },
      { text: "Object type: Audio (player/recorder, voice journaling)", status: "planned" },
      { text: "Object type: Timer (countdown, breathing exercises)", status: "planned" },
      { text: "Object type: Progress (bars, mood tracking, goals)", status: "planned" },
      { text: "Object type: List (checklist, thought records, inventory)", status: "planned" },
      { text: "Object type: Chart (mood over time, session data)", status: "planned" },
      { text: "Merge objects into reusable components/blocks", status: "planned" },
      { text: "Pixel-perfect mode (rulers, exact coords, alignment guides)", status: "planned" },
      { text: "React app export (components, props, state, JSX)", status: "planned" },
      // Visual Logic System (architecture spec complete)
      { text: "Logic Blocks: IF/ELSE/WHILE/FOR condition nodes", status: "planned" },
      { text: "Node editor: full-screen wiring panel with ports", status: "planned" },
      { text: "Wires: typed connections between object ports", status: "planned" },
      { text: "Event Listeners: watch property changes, fire triggers", status: "planned" },
      { text: "Value Bus: named pub/sub channels", status: "planned" },
      { text: "Execution engine: propagation loop, cycle prevention", status: "planned" },
      { text: "Context-aware config (adapts to connected types)", status: "planned" },
      { text: "Voice commands for logic wiring", status: "planned" },
      { text: "Object animation timeline/keyframes", status: "planned" },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: "\u{1F4CA}",
    description: "Therapist controls, 6-tab panel, disclosure layers",
    items: [
      { text: "6-tab DevHub (logs, voice, game, cmds, therapy, clinical)", status: "done" },
      { text: "Therapist dashboard with controls", status: "done" },
      { text: "Pause/resume/disclosure/inject/message", status: "done" },
      { text: "Real-time event polling", status: "done" },
      { text: "Clinical cartridge viewer", status: "planned" },
      { text: "Session analytics (progress over time)", status: "planned" },
    ],
  },
  {
    id: "game",
    title: "Game",
    icon: "\u{1F3AE}",
    description: "Therapeutic narrative game engine",
    items: [
      { text: "8 cartridges (3 story + 5 clinical)", status: "done" },
      { text: "Interview → character generation", status: "done" },
      { text: "Runtime: narrative turns, choices, consequences", status: "done" },
      { text: "Achievements, inventory, companion system", status: "done" },
      { text: "21 slash commands (4 player + 17 SU)", status: "done" },
      { text: "Game\u2192KG bridge (events \u2192 therapy nodes)", status: "done" },
      { text: "Scene image generation", status: "active" },
      { text: "NPC voice variation per character", status: "planned" },
      { text: "Multiplayer/co-op narrative", status: "planned" },
    ],
  },
  {
    id: "aria",
    title: "Aria",
    icon: "\u{1F399}",
    description: "Voice AI assistant — Gemini Live bidirectional audio",
    items: [
      { text: "Real-time bidirectional voice (WebSocket)", status: "done" },
      { text: "Function calling (45 SU + 23 game + 12 system)", status: "done" },
      { text: "Dual mode: Game narrator \u2194 System assistant", status: "done" },
      { text: "Voice selection (Gemini native voices)", status: "done" },
      { text: "System prompt engineering (persona configs)", status: "done" },
      { text: "Context persistence across sessions", status: "done" },
      { text: "SU Lab integration (voice\u2192canvas)", status: "done" },
      { text: "Multi-language voice support", status: "planned" },
      { text: "Interruption handling (barge-in)", status: "planned" },
      { text: "Emotional tone matching in TTS", status: "planned" },
    ],
  },
  {
    id: "training",
    title: "Training",
    icon: "\u{1F4DA}",
    description: "FunctionGemma fine-tuning dataset pipeline",
    items: [
      { text: "Dataset generator (45 functions \u00d7 10+ utterances)", status: "done" },
      { text: "1,448 training examples (FunctionGemma format)", status: "done" },
      { text: "Subset variants (5/15/all function pools)", status: "done" },
      { text: "Negative examples (60, ~6%)", status: "done" },
      { text: "Merged with AI-LAB 484 examples", status: "done" },
      { text: "Auto-capture logger in SU Lab", status: "done" },
      { text: "HF AutoTrain Space (A10G GPU)", status: "active" },
      { text: "Train/eval split (90/10)", status: "done" },
      { text: "Organic data curation from real usage", status: "planned" },
      { text: "Eval report with accuracy metrics", status: "planned" },
    ],
  },
  {
    id: "functiongemma",
    title: "FunctionGemma",
    icon: "\u{1F9E0}",
    description: "Local inference — replace cloud with on-device model",
    items: [
      { text: "Download script (GGUF from HF)", status: "done" },
      { text: "Inference engine (REPL, HTTP, single query)", status: "done" },
      { text: "FunctionGemma parser (control tokens)", status: "done" },
      { text: "Backend endpoints (/api/functiongemma/*)", status: "done" },
      { text: "Frontend client (localAria.ts)", status: "done" },
      { text: "Fine-tuning on HF (Unsloth + LoRA)", status: "active" },
      { text: "GGUF Q4_K_M export (~242MB)", status: "active" },
      { text: "SU Lab toggle: cloud \u2194 local", status: "planned" },
      { text: "Kokoro TTS integration (82M)", status: "planned" },
      { text: "Small reasoning model for non-function chat", status: "planned" },
      { text: "Full offline Aria stack on phone", status: "planned" },
    ],
  },
  {
    id: "therapeutic",
    title: "Therapeutic",
    icon: "\u{1F49C}",
    description: "Clinical framework, privacy, mental health",
    items: [
      { text: "5 clinical cartridges (CBT/DBT/ACT/IFS/MI)", status: "done" },
      { text: "Psychology data layer (207.8 KB, 11 JSON files)", status: "done" },
      { text: "ICD-11 (156 WHO disorders)", status: "done" },
      { text: "LOINC clinical codes", status: "done" },
      { text: "Game\u2192KG therapy bridge", status: "done" },
      { text: "Auto-flagging of clinical markers", status: "done" },
      { text: "SU Lab creative expression (canvas as therapy)", status: "done" },
      { text: "Local-only processing (privacy: no cloud for therapy)", status: "active" },
      { text: "Guided therapeutic exercises via SU Lab", status: "planned" },
      { text: "Session outcome tracking", status: "planned" },
      { text: "Therapist review dashboard improvements", status: "planned" },
    ],
  },
]

export function RoadmapPage() {
  const totalDone = ROADMAP.reduce((n, s) => n + s.items.filter((i) => i.status === "done").length, 0)
  const totalItems = ROADMAP.reduce((n, s) => n + s.items.length, 0)
  const totalActive = ROADMAP.reduce((n, s) => n + s.items.filter((i) => i.status === "active").length, 0)

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-gold">Roadmap</h2>
        <p className="text-xs text-white/30 mt-1">
          {totalDone}/{totalItems} done \u00b7 {totalActive} active \u00b7 {totalItems - totalDone - totalActive} planned
        </p>
        {/* Progress bar */}
        <div className="mt-2 mx-auto max-w-sm h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all"
            style={{ width: `${(totalDone / totalItems) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-4">
        {ROADMAP.map((section) => {
          const done = section.items.filter((i) => i.status === "done").length
          const pct = Math.round((done / section.items.length) * 100)

          return (
            <div key={section.id} className="glass rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{section.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                    <p className="text-[10px] text-white/30">{section.description}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono" style={{ color: pct === 100 ? "#22c55e" : pct > 50 ? "#d4a853" : "#666" }}>
                  {pct}%
                </span>
              </div>

              {/* Mini progress bar */}
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: pct === 100 ? "#22c55e" : "linear-gradient(90deg, #22c55e, #d4a853)" }} />
              </div>

              <ul className="space-y-1 pt-1">
                {section.items.map((item) => {
                  const s = STATUS_STYLE[item.status]
                  return (
                    <li key={item.text} className="flex items-start gap-2">
                      <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[9px] ${s.bg} border ${s.border} ${s.text}`}>
                        {item.status === "done" ? "\u2713" : ""}
                      </span>
                      <span className={`text-[11px] leading-relaxed ${item.status === "done" ? "text-white/40 line-through" : item.status === "active" ? "text-amber-300/80" : "text-white/30"}`}>
                        {item.text}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="text-center py-4">
        <p className="text-[10px] text-white/15">Built by Eyal Nof — Aria Personal AI</p>
        <p className="text-[9px] text-white/10 mt-1">Latest context: context-packets/SESSION-2026-03-22_15-37.md</p>
      </div>
    </div>
  )
}
