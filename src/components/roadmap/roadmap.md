<!-- last-verified: 2026-03-25 -->

# roadmap/ — Component Reference

## RoadmapPage

**File:** `RoadmapPage.tsx` (286 lines)
**Exports:** `RoadmapPage` (named)
**Route:** Rendered inside `TabContainer` when `activeTab === "roadmap"`

### What it does
Renders the full Aria project roadmap as a scrollable list of themed sections. Each section has an icon, title, description, progress bar, and a list of status-coded items.

### Data model
All roadmap data is defined inline as `ROADMAP: RoadmapSection[]`. No external data fetching.

- **RoadmapSection** — `{ id, title, icon, description, items: RoadmapItem[] }`
- **RoadmapItem** — `{ text, status: "done" | "active" | "planned" }`
- **STATUS_STYLE** — maps each status to Tailwind bg/border/text/check classes

### Sections (9)
| Section | Icon | Description |
|---|---|---|
| NAI | ⚡ | Knowledge graph search, introspection, persona state |
| Store | 🛍 | Zustand stores, persistence, state management |
| SU Lab | 🧪 | Voice-controlled composition engine |
| Dashboard | 📊 | Therapist controls, 6-tab panel, disclosure layers |
| Game | 🎮 | Therapeutic narrative game engine |
| Aria | 🎙 | Voice AI assistant — Gemini Live bidirectional audio |
| Training | 📚 | FunctionGemma fine-tuning dataset pipeline |
| FunctionGemma | 🧠 | Local inference — replace cloud with on-device model |
| Therapeutic | 💜 | Clinical framework, privacy, mental health |

### Layout
- Global header: title, done/active/planned counts, overall progress bar
- Per-section: glass card with icon, title, description, mini progress bar, item list
- Footer: author credit and latest context packet reference

### Dependencies
- None — pure presentational, no store or API imports

### Styling
- Tailwind utility classes with `glass` custom class
- Status colors: emerald (done), amber (active), white/30 (planned)
- Gold gradient progress bars
