"use client"

/**
 * Game Voice Adapter — thin layer that creates game personas
 * and connects them to the AriaEngine.
 *
 * This file is the GAME-SPECIFIC glue. The engine (src/lib/aria/engine.ts)
 * is domain-agnostic. The SU persona (src/lib/aria/su/) is extractable.
 */

import { getAriaEngine } from "./aria/engine"
import { useGameStore } from "@/store/game"
import { useGameVoiceStore } from "@/store/gameVoice"
import { useTranscriptStore } from "@/store/transcript"
import { useAriaModeStore } from "@/store/ariaMode"
import { createSUPersona, setSUCallbacks } from "./aria/su/suPersona"
import * as api from "./gameApi"
import type { PersonaConfig } from "./aria/persona"
import type { FunctionDeclaration, FunctionCall } from "./aria-core/types/provider"

// ── Session context (survives reconnects via sessionStorage) ──
function _getPreviousSession(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem("aria_previous_session")
}
function _setPreviousSession(val: string | null) {
  if (typeof window === "undefined") return
  if (val) sessionStorage.setItem("aria_previous_session", val)
  else sessionStorage.removeItem("aria_previous_session")
}

// ── UI Callbacks (set by GameScreen) ──
interface UICallbacks {
  openDrawer: (section?: string) => void
  closeDrawer: () => void
  openPanel: (panel: "devhub" | "transcript" | "aria" | "burger") => void
}
let _uiCallbacks: UICallbacks | null = null

export function setUICallbacks(cbs: UICallbacks) {
  _uiCallbacks = cbs
  // Also wire SU callbacks
  setSUCallbacks({
    openPanel: (p) => _uiCallbacks?.openPanel(p as any),
    switchToGame: () => switchAriaMode("game"),
  })
}

// ── Narrative callback (GameScreen listens to append narratives) ──
let _onNarrative: ((text: string) => void) | null = null
export function setNarrativeCallback(cb: (text: string) => void) { _onNarrative = cb }

// ═════════════════════════════════════════════════════════════════
// GAME FUNCTION DECLARATIONS (23)
// ═════════════════════════════════════════════════════════════════

const GAME_FUNCTIONS: FunctionDeclaration[] = [
  { name: "move", description: "Navigate to a different location.", parameters: { type: "object", properties: { direction: { type: "string", description: "Direction or location name" } }, required: ["direction"] } },
  { name: "look", description: "Look around the current location.", parameters: { type: "object", properties: {} } },
  { name: "talk", description: "Talk to an NPC.", parameters: { type: "object", properties: { npc_name: { type: "string", description: "NPC name or role" } }, required: ["npc_name"] } },
  { name: "take", description: "Pick up an item.", parameters: { type: "object", properties: { item: { type: "string", description: "Item name" } }, required: ["item"] } },
  { name: "use_item", description: "Use an item from inventory.", parameters: { type: "object", properties: { item: { type: "string", description: "Item name" } }, required: ["item"] } },
  { name: "choose", description: "Make a quest choice.", parameters: { type: "object", properties: { choice_id: { type: "string", description: "Choice ID or text" } }, required: ["choice_id"] } },
  { name: "quest", description: "Show quest status and objectives.", parameters: { type: "object", properties: {} } },
  { name: "status", description: "Show player stats.", parameters: { type: "object", properties: {} } },
  { name: "inventory", description: "List items.", parameters: { type: "object", properties: {} } },
  { name: "save_game", description: "Save the game.", parameters: { type: "object", properties: {} } },
  // Drawer control
  { name: "open_journal", description: "Open the journal drawer.", parameters: { type: "object", properties: {} } },
  { name: "close_journal", description: "Close the journal drawer.", parameters: { type: "object", properties: {} } },
  { name: "show_map", description: "Open journal to world map.", parameters: { type: "object", properties: {} } },
  { name: "show_inventory", description: "Open journal to inventory.", parameters: { type: "object", properties: {} } },
  // Awareness
  { name: "where_am_i", description: "Describe current location atmospherically.", parameters: { type: "object", properties: {} } },
  { name: "who_is_here", description: "Voice NPCs at current location.", parameters: { type: "object", properties: {} } },
  { name: "what_can_i_do", description: "Suggest available actions naturally.", parameters: { type: "object", properties: {} } },
  { name: "hint", description: "Give a gentle atmospheric hint.", parameters: { type: "object", properties: {} } },
  { name: "recap", description: "Summarize the story so far.", parameters: { type: "object", properties: {} } },
  // Companion
  { name: "talk_to_companion", description: "Companion reacts to current situation.", parameters: { type: "object", properties: {} } },
  { name: "how_is_companion", description: "Describe companion's mood and bond.", parameters: { type: "object", properties: {} } },
  // Mode switch
  { name: "switch_to_su", description: "Enter super user mode.", parameters: { type: "object", properties: {} } },
]

// ═════════════════════════════════════════════════════════════════
// GAME SYSTEM PROMPT BUILDER
// ═════════════════════════════════════════════════════════════════

function buildGamePrompt(narrator?: { voice?: string; style?: string; atmosphere?: string }): string {
  const gs = useGameStore.getState()
  const gc = gs.gameConfig
  if (!gc) return "You are Aria, a friendly game companion. The game has not started yet."

  let prompt = "You are Aria — the living voice of this adventure. You ARE the world.\n"

  // Per-game narrator style
  if (narrator?.style) {
    prompt += `NARRATOR STYLE: ${narrator.style}\n`
  } else {
    prompt += "You narrate warmly, creatively, and atmospherically.\n"
  }
  if (narrator?.atmosphere) {
    prompt += `ATMOSPHERE: ${narrator.atmosphere}\n`
  }
  prompt += "Never clinical. Never break character.\n\n"

  prompt += `WORLD: "${gc.title}"\nPROTAGONIST: ${gc.protagonist_name}\nTONE: ${gc.tone}\nTHEME: ${gc.theme}\n\n`

  if (gc.companion?.name) {
    prompt += `COMPANION: ${gc.companion.name}\n${gc.companion.description}\nReference them naturally.\n\n`
  }
  if (gc.npcs?.length) {
    prompt += "NPCs (voice each differently):\n"
    gc.npcs.forEach((n) => { prompt += `- ${n.name} (${n.role}): ${n.personality}. ${n.dialogue_style}. At: ${n.location_id}\n` })
    prompt += "\n"
  }
  if (gc.locations?.length) {
    prompt += "LOCATIONS:\n"
    gc.locations.forEach((l) => {
      prompt += `- ${l.name} [${l.id}]: ${l.atmosphere}.`
      if (l.exits) prompt += ` Exits: ${Object.keys(l.exits).join(", ")}`
      prompt += "\n"
    })
    prompt += "\n"
  }
  if (gc.items?.length) {
    prompt += "ITEMS:\n"
    gc.items.forEach((it) => { prompt += `- ${it.name}: ${it.description.slice(0, 60)}\n` })
    prompt += "\n"
  }
  if (gc.quests?.length) {
    prompt += "QUESTS:\n"
    gc.quests.forEach((q) => { prompt += `- ${q.title}: ${q.description.slice(0, 80)}\n` })
    prompt += "\n"
  }

  const { playerStats, turnCount, currentChoices } = gs
  prompt += `STATE: Courage ${playerStats.courage} | Trust ${playerStats.trust} | Items ${playerStats.items} | Turn ${turnCount}\n`
  if (currentChoices.length) prompt += `Choices: ${currentChoices.map((c) => c.text).join(" | ")}\n`

  const prev = _getPreviousSession()
  if (prev) prompt += `\nPREVIOUS SESSION:\n${prev}\n`

  prompt += "\nRULES:\n" +
    "- ALWAYS use functions. Never just describe — make it happen.\n" +
    "- Keep responses 1-3 sentences. 3-5 for dramatic moments.\n" +
    "- Voice NPCs AS them. Reference companion naturally.\n" +
    "- NEVER reference function names. NEVER break character.\n"

  return prompt
}

// ═════════════════════════════════════════════════════════════════
// GAME FUNCTION CALL HANDLER
// ═════════════════════════════════════════════════════════════════

async function handleGameFunctionCall(fc: FunctionCall): Promise<Record<string, unknown> | null> {
  const gs = useGameStore.getState()
  const gc = gs.gameConfig
  const log = useTranscriptStore.getState().log

  // ── Client-side commands (no API call) ──
  switch (fc.name) {
    case "open_journal": _uiCallbacks?.openDrawer(); return { narrative: "Journal opened.", action: "ui" }
    case "close_journal": _uiCallbacks?.closeDrawer(); return { narrative: "Journal closed.", action: "ui" }
    case "show_map": _uiCallbacks?.openDrawer("map"); return { narrative: "Showing the world map.", action: "ui" }
    case "show_inventory": _uiCallbacks?.openDrawer("inventory"); return { narrative: "Opening inventory.", action: "ui" }

    case "save_game": {
      await api.saveFullGame({
        userId: gs.userId,
        gameId: gc?.game_id || gc?.title?.toLowerCase().replace(/\s+/g, "_") || "unknown",
        cartridgeId: (gc as any)?.cartridge_id,
        narratives: [],
        transcript: useTranscriptStore.getState().entries,
      })
      log("game", "Game saved.", { action_type: "save" })
      return { narrative: "Game saved." }
    }

    case "switch_to_su":
      await switchAriaMode("su")
      return { narrative: "Entering super user mode." }

    case "where_am_i": {
      const loc = gc?.locations?.find((l) => gs.mapNodes.find((n) => n.current && n.id === l.id))
      const npcsHere = gc?.npcs?.filter((n) => n.location_id === loc?.id) || []
      const itemsHere = gc?.items?.filter((it) => it.location_id === loc?.id) || []
      return {
        narrative: `You are at ${loc?.name || "unknown"}.`,
        location_description: loc?.description || "",
        npcs_present: npcsHere.map((n) => `${n.name} (${n.role})`),
        items_visible: itemsHere.map((it) => it.name),
        exits: loc?.exits ? Object.keys(loc.exits) : [],
      }
    }
    case "who_is_here": {
      const loc = gc?.locations?.find((l) => gs.mapNodes.find((n) => n.current && n.id === l.id))
      const npcs = gc?.npcs?.filter((n) => n.location_id === loc?.id) || []
      if (npcs.length === 0) return { narrative: "No one else is here." }
      return {
        narrative: `${npcs.length} characters here.`,
        npcs: npcs.map((n) => ({ name: n.name, role: n.role, personality: n.personality, dialogue_style: n.dialogue_style })),
        instruction: "Voice each NPC briefly in their personality.",
      }
    }
    case "what_can_i_do":
      return { narrative: "Let me think...", available_actions: gs.availableActions, quest_choices: gs.currentChoices.map((c) => c.text), instruction: "Suggest 2-3 actions naturally." }
    case "hint": {
      const quest = gc?.quests?.[0]
      return { narrative: "Hmm...", active_quest: quest?.title, stats: gs.playerStats, instruction: "Gentle atmospheric hint. Never spoil." }
    }
    case "recap": {
      const discovered = gs.mapNodes.filter((n) => n.discovered).map((n) => n.label)
      return { narrative: "The story so far...", protagonist: gc?.protagonist_name, companion: gc?.companion?.name, locations_visited: discovered, turn_count: gs.turnCount, instruction: "Summarize as a storyteller. 3-5 sentences." }
    }
    case "talk_to_companion": {
      if (!gc?.companion) return { narrative: "You are alone here." }
      return { narrative: `${gc.companion.name} turns to you...`, companion: gc.companion, instruction: "Voice the companion directly." }
    }
    case "how_is_companion": {
      if (!gc?.companion) return { narrative: "No companion." }
      return { narrative: `You look at ${gc.companion.name}...`, companion: gc.companion, bond_level: Math.min(5, Math.floor(gs.turnCount / 3) + 2), instruction: "Describe mood narratively." }
    }

    default:
      break // Fall through to API action
  }

  // ── API commands (hit the backend) ──
  let actionName = fc.name
  let target = ""
  switch (fc.name) {
    case "move": target = String(fc.args?.direction || ""); break
    case "talk": target = String(fc.args?.npc_name || ""); break
    case "take": target = String(fc.args?.item || ""); break
    case "use_item": actionName = "use"; target = String(fc.args?.item || ""); break
    case "choose": target = String(fc.args?.choice_id || ""); break
    case "look": case "quest": case "status": case "inventory": break
    default: return null
  }

  const result = await api.playAction(gs.userId, actionName, target)
  useGameStore.getState().handleGameAction(result)
  if (result.narrative) log("game", result.narrative, { action_type: result.action_type })
  if (result.mirror_moment && result.mirror_text) log("system", `Mirror moment: ${result.mirror_text}`, { therapeutic: true })
  _onNarrative?.(result.narrative)
  gameUpdateContext(result.narrative)

  const response: Record<string, unknown> = { narrative: result.narrative || "" }
  if (result.location) response.new_location = result.location.name
  if (result.choices?.length) response.quest_choices = result.choices.map((c) => ({ id: c.id, text: c.text }))
  if (result.state_changes) response.stat_changes = result.state_changes
  return response
}

// ═════════════════════════════════════════════════════════════════
// CREATE GAME PERSONA
// ═════════════════════════════════════════════════════════════════

export function createGamePersona(): PersonaConfig {
  const gc = useGameStore.getState().gameConfig as any
  const narrator = gc?.narrator as { voice?: string; style?: string; atmosphere?: string } | undefined

  return {
    id: gc ? `game-${gc.title.toLowerCase().replace(/\s+/g, "-")}` : "game-default",
    name: gc?.title || "Game",
    systemPrompt: () => buildGamePrompt(narrator),
    functions: GAME_FUNCTIONS,
    voice: narrator?.voice || "Aoede",
    onFunctionCall: handleGameFunctionCall,
    mode: "game",
  }
}

// ═════════════════════════════════════════════════════════════════
// PUBLIC API (used by GameScreen)
// ═════════════════════════════════════════════════════════════════

export async function gameAriaConnect(): Promise<void> {
  const engine = getAriaEngine()
  const voice = useGameVoiceStore.getState()

  if (engine.isConnected) {
    gameAriaDisconnect()
    return
  }

  // Wire engine callbacks to stores
  engine.setCallbacks({
    onStatusChange: (status) => {
      voice.setOrbState(status)
      voice.setConnected(status !== "idle")
    },
    onUserTranscript: (text, meta) => {
      useTranscriptStore.getState().log("user", text, { input_method: "voice", ...meta })
    },
    onAriaTranscript: (text, meta) => {
      useTranscriptStore.getState().log("aria", text, meta)
      voice.setLastSpoken(text)
      // Show Aria's speech in the narrative panel so user reads it too
      if (text && text.length > 2) {
        _onNarrative?.(`*${text}*`)
      }
    },
    onFunctionCallStart: () => {},
    onNarrative: (text) => _onNarrative?.(text),
  })

  // Load persona based on current mode
  const mode = useAriaModeStore.getState().mode
  const persona = mode === "su" ? createSUPersona() : createGamePersona()
  engine.loadPersona(persona)

  // Fetch API key and connect
  try {
    const cfg = await api.fetchVoiceConfig()
    await engine.connect(cfg.apiKey)
  } catch {
    voice.setOrbState("idle")
  }
}

export function gameAriaDisconnect(): void {
  _saveAriaContext()
  getAriaEngine().disconnect()
  useGameVoiceStore.getState().setOrbState("idle")
  useGameVoiceStore.getState().setConnected(false)
}

export async function switchAriaMode(mode: "game" | "su"): Promise<void> {
  useAriaModeStore.getState().setMode(mode)
  const engine = getAriaEngine()
  const persona = mode === "su" ? createSUPersona() : createGamePersona()

  try {
    const cfg = await api.fetchVoiceConfig()
    await engine.loadPersona(persona, cfg.apiKey)
  } catch {
    useGameVoiceStore.getState().setOrbState("idle")
  }
}

export function gameUpdateContext(narrative?: string): void {
  const engine = getAriaEngine()
  if (!engine.isConnected) return
  const gs = useGameStore.getState()
  let ctx = "[GAME STATE UPDATE — do not respond]\n"
  ctx += `Courage: ${gs.playerStats.courage} Trust: ${gs.playerStats.trust} Items: ${gs.playerStats.items}\n`
  ctx += `Turn ${gs.turnCount}\n`
  if (narrative) ctx += `What happened: ${narrative.slice(0, 200)}\n`
  if (gs.currentChoices.length) ctx += `Choices: ${gs.currentChoices.map((c) => c.text).join(" | ")}`
  engine.sendContext(ctx)
}

// ── Aria context persistence ──
function _saveAriaContext(): void {
  const gs = useGameStore.getState()
  const gc = gs.gameConfig
  if (!gc || !gc.title) return

  const gameId = gc.game_id || gc.title.toLowerCase().replace(/\s+/g, "_")
  const entries = useTranscriptStore.getState().entries
  if (entries.length === 0) return

  const userEntries = entries.filter((e) => e.type === "user").map((e) => e.text)
  const gameEvents = entries.filter((e) => e.type === "game").map((e) => e.text.slice(0, 80))
  const mirrorMoments = entries.filter((e) => e.meta?.therapeutic).map((e) => e.text)
  const discovered = gs.mapNodes.filter((n) => n.discovered).map((n) => n.label)

  const summary = [
    `${gc.protagonist_name} at turn ${gs.turnCount}.`,
    `Visited: ${discovered.join(", ") || "starting area"}.`,
    `Stats: C${gs.playerStats.courage} T${gs.playerStats.trust} I${gs.playerStats.items}.`,
    userEntries.length > 0 ? `Player said: "${userEntries.slice(-3).join('", "')}"` : "",
    gameEvents.length > 0 ? `Events: ${gameEvents.slice(-3).join("; ")}` : "",
    mirrorMoments.length > 0 ? `Mirrors: ${mirrorMoments.join("; ")}` : "",
  ].filter(Boolean).join(" ")

  _setPreviousSession(summary)

  const BASE = process.env.NEXT_PUBLIC_GAME_API || ""
  fetch(`${BASE}/api/game/save-full`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: gs.userId, game_id: gameId, narratives: [], aria_context: summary, key_events: gameEvents.slice(-10) }),
  }).catch(() => {})
}
