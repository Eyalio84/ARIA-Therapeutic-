# Aria Portable Framework
# Created: 2026-03-15

---

## Vision

Aria's "essence" is two portable files — a JSON persona cartridge and a SQLite memory DB — that any project drops in `./aria/` to get a fully-loaded, context-aware, memory-enabled Aria. No server required.

Instead of monolithically extracting the whole aria architecture into every app, the cartridge model makes Aria truly mobile:
- **`aria.persona.json`** — her soul: identity, voice, enabled tools, behavioral rules, domain knowledge
- **`aria.memory.db`** — her mind: NLKE knowledge graph + conversation history

Both files work like CLAUDE.md inheritance: `~/.aria/` holds your global defaults, `./aria/` in any project overrides them.

---

## File System Layout

```
~/.aria/                              ← global defaults (like ~/.claude/)
  personas/
    personal.aria.json               ← base identity + voice
  memory/
    default.db                       ← persistent KG + full conversation history

./aria/  (per-project override)
  personas/
    storekit.aria.json               ← StoreKit-specific tools + domain knowledge
  memory/
    storekit.db                      ← project-scoped KG + sessions
```

**Resolution order:** Project `./aria/` wins over `~/.aria/`. Within a persona, `domain.facts` arrays are merged (not replaced).

---

## Persona JSON Schema

```typescript
interface AriaPersona {
  // Schema version for forward compatibility
  $schema: "aria-persona/1.0"
  name: string

  identity: {
    personality: string          // Base system prompt text
    voice: string                // Gemini voice name (Aoede, Kore, Puck...)
    greetings: {
      default: string            // First open
      returning: string          // Auto-resume greeting (references last session)
      project?: string           // Override per project
    }
  }

  tools: string[]                // Enabled function names (e.g. ["navigate", "edit_section"])

  rules: {
    silence: string[]            // Commands that execute silently (no voice response)
    responseMaxSentences: number
    tone: "warm" | "professional" | "casual" | "terse"
    language: string             // BCP-47 e.g. "en", "he"
  }

  domain: {
    facts: string[]              // Static facts injected into system prompt
    faq?: Array<{ q: string; a: string }>
    context?: string             // Free-form domain description
  }
}
```

### Example: `storekit.aria.json`
```json
{
  "$schema": "aria-persona/1.0",
  "name": "Aria",
  "identity": {
    "personality": "Warm, curious, genuinely excited to help you build...",
    "voice": "Aoede",
    "greetings": {
      "default": "Hi! I'm Aria. Tap the orb and tell me what you want to build.",
      "returning": "Welcome back. Last time we were {{last_topic}}. Want to continue?"
    }
  },
  "tools": ["navigate", "edit_section", "suggest_copy", "add_section", "describe_canvas"],
  "rules": {
    "silence": ["navigate", "scroll_page", "navigate_to_template"],
    "responseMaxSentences": 3,
    "tone": "warm",
    "language": "en"
  },
  "domain": {
    "facts": [
      "This is StoreKit — a voice-AI website builder",
      "Users build e-commerce sites for jewelry, bakery, restaurant, and more"
    ]
  }
}
```

---

## Memory Architecture (NLKE TypeScript Port)

Memory is stored in SQLite with two layers:

### Layer 1 — Conversation Log
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  persona TEXT NOT NULL,          -- which persona was active
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  snapshot_name TEXT,             -- non-null = named snapshot
  summary TEXT                    -- auto-generated on close
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL,             -- 'user' | 'aria' | 'system'
  text TEXT NOT NULL,
  audio_base64 TEXT,              -- optional: saved voice
  ts INTEGER NOT NULL
);
```

### Layer 2 — Knowledge Graph (NLKE)
```sql
CREATE TABLE kg_nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,             -- 'entity' | 'fact' | 'preference' | 'task'
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT,                 -- JSON float[] (hash embedding)
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE kg_edges (
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  relation TEXT NOT NULL,         -- 'relates_to' | 'contradicts' | 'implies'
  weight REAL DEFAULT 1.0,
  PRIMARY KEY (source, target, relation)
);

CREATE VIRTUAL TABLE kg_fts USING fts5(id, label, content); -- BM25
```

**NLKE retrieval formula (preserved from Python):**
```
H(query, node) = α × vectorScore + β × bm25Score + γ × graphBoost
Default: α=0.40, β=0.45, γ=0.15
Intent-adjusted per query type (PRECISION/EXPLORATORY/NAVIGATIONAL/etc.)
```

---

## Session Resume (3 modes)

### Mode 1: Auto-resume (default)
On app open, if a session was active within 24h:
- Load last 10 messages as context window
- Inject session summary into system prompt
- Aria greets: "Welcome back. Last time we were discussing X. Want to continue?"

### Mode 2: History List
- Bottom sheet / drawer: chronological session list
- Each entry shows: date, first message preview, duration, persona used
- Tap → load session as context, Aria acknowledges the restore

### Mode 3: Named Snapshots
- Manual "Save Snapshot" button (long-press orb or menu item)
- User names it: "StoreKit v2 planning", "Jewelry site launch"
- Snapshots persist forever (sessions auto-expire after 30 days)
- Displayed separately from history; filterable by persona

---

## Execution Phases

### Phase 1 — aria-core Foundation (in `tal-boilerplate/lib/aria-core/`)
Execute the existing Aria Standalone Architecture plan (Phases 1-4):
- **1.1** Type definitions (7 files: provider, command, persona, context, knowledge, state, audio)
- **1.2** Audio pipeline extraction (pcmHelpers, playbackScheduler, micCapture)
- **1.3** State machine (ariaStateMachine.ts)
- **1.4** Provider abstraction (BaseProvider + GeminiLiveSDKProvider)
- **1.5** Context engine + persona system (contextEngine, promptBuilder)
- **1.6** Command dispatch (commandRegistry, commandRouter)

**Output:** `lib/aria-core/` compiles independently, zero imports from `@/`

### Phase 2 — NLKE TypeScript Port (in `aria-core/knowledge/`)
Port all 11 Python modules:
- `tokenizer.ts`, `bm25.ts`, `hashEmbedder.ts`, `graphScorer.ts`
- `weightProfiles.ts`, `intentRouter.ts`, `queryCache.ts`
- `memoryParser.ts`, `memoryFusion.ts`, `hybridFusion.ts`, `config.ts`

**Key constraint:** No numpy (manual dot products), no SQLite in this layer (KnowledgeSource interface). 15 tests.

### Phase 3 — Persona JSON + ~/.aria/ Loader (in `aria-core/persona/`)
- `personaSchema.ts` — Zod validation for AriaPersona
- `personaLoader.ts` — reads `~/.aria/`, merges `./aria/` override, validates
- `personaResolver.ts` — resolves which persona to use for current working directory

**aria-personal integration:** ConfigDrawer gets "Load Persona" button → file picker → validates + applies live

### Phase 4 — SQLite Session Store (in `aria-core/state/`)
- `sessionStore.ts` — open/close sessions, append messages, auto-summarize on close
- `kgStore.ts` — CRUD for KG nodes/edges, FTS search bridge to NLKE retrieval
- `snapshotManager.ts` — named snapshot save/load/delete
- `sessionResolver.ts` — determines auto-resume candidate

**Uses:** `better-sqlite3` (synchronous, zero-config, works in Node/Electron)

### Phase 5 — Session Resume + Management UI (in `aria-personal`)
- `components/SessionHistory.tsx` — slide-up history list, session cards
- `components/SnapshotManager.tsx` — named snapshots menu
- `components/PersonaLoader.tsx` — JSON file drag-drop + validation UI
- `components/KGViewer.tsx` — (optional) simple node/edge browser
- Auto-resume logic in `lib/aria.ts` — on connect, check for recent session

---

## Integration Contract

**Other projects** (tal-boilerplate, future apps) import the shared lib:

```typescript
// In any project's hooks/useAriaLive.ts
import { AriaCore, loadPersona, openMemory } from "@aria/core"

const persona = await loadPersona("./aria/personas/storekit.aria.json")
const memory  = await openMemory("./aria/memory/storekit.db")

const aria = new AriaCore({ provider, persona, memory, commands })
```

**aria-personal** is the full management console:
- Load/switch personas live
- Browse + resume session history
- Name + manage snapshots
- Visualize KG (optional future)

---

## Success Criteria

After Phase 5:
1. Drop `storekit.aria.json` into `./aria/personas/` → tal-boilerplate Aria uses it without code changes
2. Open aria-personal → see session history list with last 5 conversations
3. Tap a history item → Aria resumes with correct context in < 2s
4. Long-press orb → name snapshot → find it in snapshot list next session
5. Change voice in `storekit.aria.json` → restart → Aria speaks in new voice
6. `~/.aria/personas/personal.aria.json` personality text → reflected in all projects on next connect

---

## References

- Existing extraction plan: `.claude/plans/eager-nibbling-moon.md`
- NLKE Python source: `/storage/emulated/0/Download/44nlke/NLKE/agents/shared/retrieval/`
- aria-personal UI: `/root/aria-personal/src/`
- tal-boilerplate aria-core stub: `/root/tal-boilerplate/lib/aria-core/`
