"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { devLogger } from "@/lib/gameDevLogger"
import type {
  GameScreen, GameConfig, InterviewQuestion, InterviewProgress,
  MirrorBubble, MapNode, QuestChoice, PlayerStats, GameActionResponse,
} from "@/types/game"

interface TrailEntry { question: string; answer: string }

interface GameStore {
  // Identity
  userId: string

  // Screen routing
  currentScreen: GameScreen

  // Onboarding
  selectedVibe: string | null
  selectedDepth: string

  // Interview
  currentQuestion: InterviewQuestion | null
  interviewProgress: InterviewProgress | null
  mirrorData: { bubble: MirrorBubble; nextQuestion?: InterviewQuestion } | null
  conversationTrail: TrailEntry[]

  // Game config (from /generate or /cartridges/load)
  gameConfig: GameConfig | null

  // Live game state
  playerStats: PlayerStats
  turnCount: number
  mapNodes: MapNode[]
  currentChoices: QuestChoice[]
  availableActions: string[]
  showRestOverlay: boolean

  // Narratives (visible story text)
  narratives: string[]

  // Theme mood (from location)
  moodPrimary: string
  moodSecondary: string

  // Actions — narratives
  addNarrative: (text: string) => void
  setNarratives: (narratives: string[]) => void

  // Actions — onboarding
  selectVibe: (vibe: string) => void
  selectDepth: (depth: string) => void
  setScreen: (screen: GameScreen) => void

  // Actions — interview
  setQuestion: (q: InterviewQuestion) => void
  setProgress: (p: InterviewProgress) => void
  setMirrorData: (d: GameStore["mirrorData"]) => void
  addToTrail: (question: string, answer: string) => void

  // Actions — game
  setGameConfig: (config: GameConfig) => void
  handleGameAction: (action: GameActionResponse) => void
  setRestOverlay: (v: boolean) => void

  // Reset
  reset: () => void
}

const initialStats: PlayerStats = { courage: 4, trust: 3, items: 0 }

function getStableUserId(): string {
  if (typeof window === "undefined") return "user_ssr"
  let id = localStorage.getItem("aria_user_id")
  if (!id) {
    id = "user_" + Math.random().toString(36).substr(2, 8)
    localStorage.setItem("aria_user_id", id)
  }
  return id
}

const INITIAL_STATE = {
  currentScreen: "onboarding" as GameScreen,
  selectedVibe: null as string | null,
  selectedDepth: "standard",
  currentQuestion: null as InterviewQuestion | null,
  interviewProgress: null as InterviewProgress | null,
  mirrorData: null as GameStore["mirrorData"],
  conversationTrail: [] as TrailEntry[],
  gameConfig: null as GameConfig | null,
  narratives: [] as string[],
  playerStats: { ...initialStats } as PlayerStats,
  turnCount: 0,
  mapNodes: [] as MapNode[],
  currentChoices: [] as QuestChoice[],
  availableActions: [] as string[],
  showRestOverlay: false,
  moodPrimary: "#1a1a26",
  moodSecondary: "#12121a",
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      userId: getStableUserId(),
      ...INITIAL_STATE,

      addNarrative: (text) => set((s) => ({ narratives: [...s.narratives, text] })),
      setNarratives: (narratives) => set({ narratives }),

      selectVibe: (vibe) => { set({ selectedVibe: vibe }); devLogger.log("game", "info", "selectVibe", vibe) },
      selectDepth: (depth) => { set({ selectedDepth: depth }); devLogger.log("game", "info", "selectDepth", depth) },
      setScreen: (screen) => { set({ currentScreen: screen }); devLogger.log("game", "info", "setScreen", screen) },

      setQuestion: (q) => set({ currentQuestion: q }),
      setProgress: (p) => set({ interviewProgress: p }),
      setMirrorData: (d) => set({ mirrorData: d }),
      addToTrail: (question, answer) =>
        set((s) => ({ conversationTrail: [{ question, answer }, ...s.conversationTrail] })),

      setGameConfig: (config) => {
        set({
          gameConfig: config,
          playerStats: {
            courage: config.state_variables?.courage ?? 4,
            trust: config.state_variables?.trust ?? 3,
            items: config.state_variables?.items_collected ?? 0,
          },
          turnCount: 0,
        })
        devLogger.log("game", "info", "setGameConfig", `Loaded: "${config.title}" — ${config.protagonist_name}`, { locations: config.locations?.length, npcs: config.npcs?.length, quests: config.quests?.length })
      },

      handleGameAction: (action) => {
        devLogger.log("game", "info", "handleGameAction", `${action.action_type}: ${action.narrative?.slice(0, 60) || ""}`, action.state_changes)
        set((s) => {
        const updates: Partial<GameStore> = {}

        if (action.turn_count !== undefined) updates.turnCount = action.turn_count

        if (action.location) {
          updates.moodPrimary = action.location.mood_color || s.moodPrimary
          updates.moodSecondary = action.location.mood_secondary || s.moodSecondary
        }

        if (action.state_changes) {
          const stats = { ...s.playerStats }
          for (const [k, v] of Object.entries(action.state_changes)) {
            if (k === "courage") stats.courage += v
            else if (k === "trust") stats.trust += v
            else if (k === "items_collected") stats.items += v
            else if (k in stats) (stats as Record<string, number>)[k] += v
          }
          updates.playerStats = stats
        }

        if (action.map_update?.nodes) updates.mapNodes = action.map_update.nodes
        if (action.choices) updates.currentChoices = action.choices
        if (action.available_actions) updates.availableActions = action.available_actions
        if (action.is_rest_point) updates.showRestOverlay = true

        return updates
      })},

      setRestOverlay: (v) => set({ showRestOverlay: v }),

      reset: () => set({ ...INITIAL_STATE }),
    }),
    {
      name: "aria-game-state",
      // Only persist data, not functions
      partialize: (state) => ({
        userId: state.userId,
        currentScreen: state.currentScreen,
        selectedVibe: state.selectedVibe,
        selectedDepth: state.selectedDepth,
        currentQuestion: state.currentQuestion,
        interviewProgress: state.interviewProgress,
        conversationTrail: state.conversationTrail,
        gameConfig: state.gameConfig,
        narratives: state.narratives,
        playerStats: state.playerStats,
        turnCount: state.turnCount,
        mapNodes: state.mapNodes,
        currentChoices: state.currentChoices,
        availableActions: state.availableActions,
        moodPrimary: state.moodPrimary,
        moodSecondary: state.moodSecondary,
        // Exclude: mirrorData (ephemeral popup), showRestOverlay (ephemeral)
      }),
    }
  )
)
