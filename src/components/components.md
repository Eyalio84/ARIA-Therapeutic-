<!-- last-verified: 2026-03-25 -->

# components/ — Root Component Reference

## ChatPanel

**File:** `ChatPanel.tsx` (70 lines)
**Exports:** `ChatPanel` (named)

### What it does
Root orchestrator for the Aria chat interface. Composes all chat-related components and manages which overlays are visible.

### State
- `drawerOpen` — ConfigDrawer visibility
- `historyOpen` — SessionHistory visibility
- `snapshotOpen` — SnapshotManager visibility

### Key behaviors
- `handleSendText` — sends text to Aria via `aria.sendText()` and adds to chat store
- `handleSlashCommand` — intercepts `/snapshot` to open SnapshotManager; returns false for all others (delegated to ChatInput)
- `handleResumeSession` — resumes a past session via `ariaResumeSession()`

### Dependencies
- `useChatStore` — `addMessage`
- `@/lib/aria` — `aria`, `ariaResumeSession`
- Children: TopBar, MessageThread, VoiceOrb, ChatInput, ConfigDrawer, SessionHistory, SnapshotManager

---

## TopBar

**File:** `TopBar.tsx` (61 lines)
**Exports:** `TopBar` (named)
**Props:** `{ onMenuOpen, onHistoryOpen }`
**Store:** `useChatStore` — `status`

### What it does
Header bar with Aria branding and action buttons. Status dot color-codes connection state.

### Status mapping
| Status | Dot color |
|---|---|
| idle | zinc-600 |
| connecting | yellow-400 pulse |
| listening | violet-400 pulse |
| thinking | violet-300 pulse |
| speaking | emerald-400 pulse |

---

## MessageThread

**File:** `MessageThread.tsx` (57 lines)
**Exports:** `MessageThread` (named)
**Store:** `useChatStore` — `messages`

### What it does
Scrollable chat feed. Auto-scrolls to bottom on new messages. Empty state shows "Tap the orb to begin."

### Message rendering
- **system** — centered mono pill
- **user** — right-aligned violet bubble (rounded-br-sm)
- **aria** — left-aligned glass bubble with avatar badge (rounded-bl-sm)

---

## VoiceOrb

**File:** `VoiceOrb.tsx` (72 lines)
**Exports:** `VoiceOrb` (named)
**Store:** `useChatStore` — `status`, `isConnected`

### What it does
Central voice control button. Tap toggles connection. 5 visual states with animated pulse rings, glow effects, and status labels.

### ORB_CONFIG states
| State | Ring color | Glow | Label |
|---|---|---|---|
| idle | none | none | Tap to talk |
| connecting | yellow | gold | Connecting... |
| listening | violet | violet | Listening |
| thinking | violet-300 | violet-300 | Thinking... |
| speaking | emerald | emerald | Speaking |

---

## ChatInput

**File:** `ChatInput.tsx` (88 lines)
**Exports:** `ChatInput` (named)
**Props:** `{ onSendText, onSlashCommand? }`
**Store:** `useChatStore` — `isConnected`, `isMicActive`, `addSystemMessage`

### What it does
Auto-growing textarea with slash command parsing. Enter submits, Shift+Enter for newlines.

### Slash commands handled internally
| Command | Action |
|---|---|
| `/connect` | `ariaConnect()` |
| `/disconnect` | `ariaDisconnect()` |
| `/clear` | Clear chat messages |
| `/status` | Show status/context/voice |
| `/context <id>` | Switch context |
| `/voice <name>` | Change voice |
| `/mic` | Show mic status |

### Flow
1. Input starts with `/` → show SlashMenu
2. On submit: if starts with `/`, route to `handleSlashCommand`; else if connected, call `onSendText`; else show "Not connected" system message

---

## SlashMenu

**File:** `SlashMenu.tsx` (51 lines)
**Exports:** `SlashMenu` (named), `SLASH_COMMANDS` (array)
**Props:** `{ filter, onSelect }`

### What it does
Autocomplete dropdown positioned above the input. Filters 9 slash commands by prefix.

### Commands
`/connect`, `/disconnect`, `/clear`, `/status`, `/context`, `/voice`, `/mic`, `/persona`, `/snapshot`

---

## ConfigDrawer

**File:** `ConfigDrawer.tsx` (145 lines)
**Exports:** `ConfigDrawer` (named)
**Props:** `{ open, onClose }`
**Store:** `useChatStore` — `activeContext`, `activeVoice`

### What it does
Right-sliding settings drawer with animated open/close transitions.

### Sections
1. **Persona** — PersonaLoader drop zone
2. **Context** — context selector (currently only "personal")
3. **Voice** — 2x4 grid of 8 Gemini voices (Aoede, Charon, Fenrir, Kore, Puck, Schedar, Leda, Orus)
4. **Slash Commands** — reference list

---

## ConfigPanel

**File:** `ConfigPanel.tsx` (159 lines)
**Exports:** `ConfigPanel` (named)
**Store:** `useChatStore` — `status`, `isConnected`, `activeContext`, `activeVoice`, `isMicActive`

### What it does
Sidebar config panel (alternative to ConfigDrawer, used in wider layouts). Collapsible sections for connection, context, voice, persona, and commands.

### Sub-components (internal)
- **Section** — collapsible accordion with title and chevron
- **Row** — label + value display row

---

## PersonaLoader

**File:** `PersonaLoader.tsx` (127 lines)
**Exports:** `PersonaLoader` (named)
**Props:** `{ onPersonaLoaded, onPersonaCleared }`

### What it does
Drag-and-drop zone for `.aria.json` persona cartridge files. Validates using `validateCartridge()` (Zod schema), saves to localStorage.

### Key features
- Shows active persona (name, voice, tone) with reset button
- Drop zone with drag-over visual feedback
- File input fallback (click to browse)
- Error display (first Zod issue line)
- Success message with persona name and voice

### Dependencies
- `@/lib/aria-core/persona/cartridgeTypes` — `AriaPersonaJSON`
- `@/lib/aria-core/persona/cartridgeLoader` — `validateCartridge`
- `@/lib/cartridgeStorage` — `saveCartridge`, `clearCartridge`, `loadCartridge`

---

## SessionHistory

**File:** `SessionHistory.tsx` (199 lines)
**Exports:** `SessionHistory` (named)
**Props:** `{ open, onClose, onResumeSession }`

### What it does
Bottom-sheet overlay with two sections: named Snapshots and Recent sessions (last 20).

### Key features
- Fetches snapshots + sessions from `sessionStore` on open
- Session cards show: icon (star for snapshot, doc for recent), name, date, duration, preview
- Tap a card to resume that session
- Loading and empty states

### Sub-components (internal)
- **SessionCard** — card for a single session. Snapshot cards get amber star icon; recent get violet doc icon.

### Helpers
- `formatDate` — relative (Today/Yesterday) or short date
- `formatDuration` — "< 1m", "Xm", "Xh Ym"
- `extractPreview` — extracts first quote from summary

---

## SnapshotManager

**File:** `SnapshotManager.tsx` (102 lines)
**Exports:** `SnapshotManager` (named)
**Props:** `{ onClose }`

### What it does
Inline form to name and save the current session as a permanent snapshot. Appears above chat input when `/snapshot` is typed.

### Flow
1. User enters a name (max 60 chars)
2. Save calls `sessionStore.saveSnapshot(sessionId, name)`
3. Success shows checkmark + name, auto-closes after 1.2s
4. Error states: no active session, empty name, save failure

---

## TabBar

**File:** `TabBar.tsx` (71 lines)
**Exports:** `TabBar` (named)
**Store:** `useTabStore` — `activeTab`, `setActiveTab`; `useChatStore` — `status`

### What it does
Top navigation bar with tab buttons and page links.

### Tabs (in-app, switch via store)
- SDK, Store, Roadmap — gold accent when active

### Nav links (full page navigation)
- Game (`/game`), SU Lab (`/su`), Dash (`/dashboard`), Docs (`/docs`)

### Status indicator
- Dot color matches Aria connection state (5 states)

---

## TabContainer

**File:** `TabContainer.tsx` (30 lines)
**Exports:** `TabContainer` (named)
**Store:** `useTabStore` — `activeTab`

### What it does
Lazy-loading tab router using `React.lazy()` + `Suspense`. Code-splits each tab's root component.

### Tabs
| Tab | Component | Import |
|---|---|---|
| sdk | SdkDashboard | `@/components/sdk/SdkDashboard` |
| store | StorePage | `@/components/store/StorePage` |
| roadmap | RoadmapPage | `@/components/roadmap/RoadmapPage` |

### Loading state
Gold spinning circle via `LoadingSpinner` internal component.
