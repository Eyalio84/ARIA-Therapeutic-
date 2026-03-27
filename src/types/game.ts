/** Game engine TypeScript types — mirrors backend dataclasses */

export interface Cartridge {
  id: string
  name: string
  age: number
  tagline: string
  tone_hint: string
}

export interface GameNPC {
  id: string
  name: string
  description: string
  role: string
  personality: string
  location_id: string
  dialogue_style: string
  relationship: string
}

export interface GameLocation {
  id: string
  name: string
  description: string
  atmosphere: string
  exits?: Record<string, string>
  npcs?: string[]
  items?: string[]
  mood_color?: string
  mood_secondary?: string
}

export interface GameItem {
  id: string
  name: string
  description: string
  location_id: string
  use_effect: string
}

export interface QuestChoice {
  id: string
  text: string
  result_text?: string
  effects?: Record<string, number>
}

export interface Quest {
  id: string
  title: string
  description: string
}

export interface GameCompanion {
  name: string
  description: string
  type?: string
}

export interface GameConfig {
  game_id: string
  title: string
  theme: string
  tone: string
  protagonist_name: string
  companion?: GameCompanion
  locations: GameLocation[]
  npcs: GameNPC[]
  items: GameItem[]
  quests: Quest[]
  endings: Array<{ id: string; title: string; narrative: string; tone: string }>
  state_variables: Record<string, number>
  starting_location: string
  starting_narrative: string
  visual_map: { nodes: MapNode[]; edges: MapEdge[] }
}

export interface MapNode {
  id: string
  label: string
  discovered: boolean
  current: boolean
  color?: string
  atmosphere?: string
}

export interface MapEdge {
  source: string
  target: string
  label: string
}

export interface InterviewQuestion {
  id?: string
  text: string
  phase: string
  has_exit_ramp: boolean
  exit_ramp?: string
}

export interface InterviewProgress {
  current: number
  total: number
  percent: number
}

export interface MirrorBubble {
  reflection: string
  expand_prompt?: string
}

export interface GameActionResponse {
  action_type: string
  narrative: string
  location?: GameLocation
  choices?: QuestChoice[]
  state_changes?: Record<string, number>
  available_actions?: string[]
  map_update?: { nodes: MapNode[] }
  mirror_moment?: boolean
  mirror_text?: string
  is_rest_point?: boolean
  quest_update?: unknown
  turn_count?: number
  ending?: { id: string; title: string; narrative: string; tone: string }
}

export type GameScreen = "onboarding" | "interview" | "generating" | "game"

export interface PlayerStats {
  courage: number
  trust: number
  items: number
}

export type TranscriptEntryType = "user" | "aria" | "game" | "system"

export interface TranscriptEntry {
  id: string
  type: TranscriptEntryType
  text: string
  timestamp: string
  turn: number
  meta?: {
    action_type?: string
    function_call?: string
    input_method?: "typed" | "voice"
    therapeutic?: boolean
    [key: string]: unknown
  }
}
