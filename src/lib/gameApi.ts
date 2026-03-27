/**
 * Typed API wrapper for all /api/game/* endpoints.
 * Talks to the FastAPI backend (serve_game.py).
 */

import type {
  Cartridge, GameConfig, GameActionResponse,
  InterviewQuestion, InterviewProgress, MirrorBubble,
} from "@/types/game"

const BASE = process.env.NEXT_PUBLIC_GAME_API || ""

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed (${res.status})`)
  return res.json()
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`)
  return res.json()
}

// ── Cartridges ──

export async function fetchCartridges(): Promise<Cartridge[]> {
  const data = await get<{ cartridges: Cartridge[]; clinical?: Cartridge[] }>("/api/game/cartridges")
  const clinical = (data.clinical || []).map((c: any) => ({
    ...c,
    tagline: `[${c.clinical_approach}] ${c.tagline}`,
  }))
  return [...data.cartridges, ...clinical]
}

export async function loadCartridge(userId: string, cartridgeId: string): Promise<GameConfig> {
  return post<GameConfig>("/api/game/cartridges/load", {
    user_id: userId,
    cartridge_id: cartridgeId,
  })
}

// ── Interview ──

interface InterviewResponse {
  status: "next" | "mirror_bubble" | "complete"
  question?: InterviewQuestion
  progress?: InterviewProgress
  mirror_bubble?: MirrorBubble
  next_question?: InterviewQuestion
  synthesis?: Record<string, unknown>
}

export async function startInterview(
  userId: string, depth: string, vibe: string
): Promise<InterviewResponse> {
  return post<InterviewResponse>("/api/game/interview/start", {
    user_id: userId, depth, vibe,
  })
}

export async function submitAnswer(userId: string, answer: string): Promise<InterviewResponse> {
  return post<InterviewResponse>("/api/game/interview/answer", {
    user_id: userId, answer,
  })
}

export async function expandMirror(userId: string): Promise<void> {
  await post("/api/game/interview/expand_mirror", { user_id: userId })
}

// ── Generation ──

export async function generateGame(
  userId: string, synthesis: Record<string, unknown>
): Promise<GameConfig> {
  return post<GameConfig>("/api/game/generate", {
    user_id: userId, synthesis,
  })
}

// ── Gameplay ──

interface PlayStartResponse extends GameActionResponse {
  turn_count: number
}

export async function playStart(userId: string): Promise<PlayStartResponse> {
  return post<PlayStartResponse>("/api/game/play/start", { user_id: userId })
}

export async function playAction(
  userId: string, action: string, target: string = ""
): Promise<GameActionResponse> {
  return post<GameActionResponse>("/api/game/play/action", {
    user_id: userId, action, target,
  })
}

export async function saveGame(userId: string): Promise<{ saved: boolean }> {
  return post<{ saved: boolean }>("/api/game/play/save", { user_id: userId })
}

// ── Persistence (Unified Snapshot) ──

export interface SaveSummary {
  save_id: string
  game_id: string
  cartridge_id: string | null
  title: string
  protagonist: string | null
  location: string | null
  turn_count: number
  stats: Record<string, number>
  created_at: number
  updated_at: number
}

/** Complete restored game — everything needed to resume */
export interface RestoredGame {
  save_id: string
  game_id: string
  cartridge_id: string | null
  title: string
  config: Record<string, unknown>
  player: {
    location_id: string
    inventory: string[]
    variables: Record<string, number>
    visited_locations: string[]
    active_quest: string
    active_stage: string
    completed_quests: string[]
    completed_stages: string[]
    npc_interactions: Record<string, number>
    choices_log: Array<Record<string, string>>
    turn_count: number
    ending_reached: string
  }
  map: { nodes: Array<Record<string, unknown>>; edges?: Array<Record<string, unknown>> }
  available_actions: string[]
  narratives: string[]
  transcript: Array<Record<string, unknown>> | null
  aria_context: { context_summary: string; key_events: string[]; companion_bond: number } | null
  turn_count: number
  location: string | null
}

/** Save — backend pulls player state from runtime (source of truth) */
export async function saveFullGame(params: {
  userId: string
  gameId: string
  cartridgeId?: string
  narratives: string[]
  transcript?: Array<Record<string, unknown>>
  ariaContext?: string
  keyEvents?: string[]
  sessionState?: Record<string, unknown>
}): Promise<{ save_id: string }> {
  return post("/api/game/save-full", {
    user_id: params.userId,
    game_id: params.gameId,
    cartridge_id: params.cartridgeId,
    narratives: params.narratives,
    transcript: params.transcript,
    aria_context: params.ariaContext,
    key_events: params.keyEvents,
    session_state: params.sessionState,
  })
}

/** List all saves for a user */
export async function listSaves(userId: string): Promise<SaveSummary[]> {
  const data = await get<{ saves: SaveSummary[] }>(`/api/game/saves/${userId}`)
  return data.saves
}

/** Load and fully restore a saved game */
export async function loadSave(userId: string, saveId: string): Promise<RestoredGame> {
  return post<RestoredGame>("/api/game/load-save", { user_id: userId, save_id: saveId })
}

/** Delete a save */
export async function deleteSave(userId: string, saveId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/game/saves/${userId}/${saveId}`, { method: "DELETE" })
  if (!res.ok) throw new Error(`DELETE save failed (${res.status})`)
}

// ── Voice Config ──

export interface VoiceConfig {
  apiKey: string
  model: string
}

export async function fetchVoiceConfig(): Promise<VoiceConfig> {
  return get<VoiceConfig>("/api/game/voice-config")
}
