"use client"

import { create } from "zustand"
import type {
  FullDashboard, MoodCheckIn, MoodVelocity, FlaggedMoment,
  SessionNote, Achievement, ChoiceTimeline, MirrorAnalytics,
  AntagonistAnalysis,
} from "@/types/dashboard"

const API = process.env.NEXT_PUBLIC_GAME_API || ""

interface DashboardStore {
  // State
  loading: boolean
  error: string | null
  userId: string | null
  dashboard: FullDashboard | null

  // Individual sections (for incremental updates)
  moodHistory: MoodCheckIn[]
  moodVelocity: MoodVelocity | null
  flags: FlaggedMoment[]
  notes: SessionNote[]
  achievements: Achievement[]
  choiceTimeline: ChoiceTimeline | null
  mirrorAnalytics: MirrorAnalytics | null
  antagonistAnalysis: AntagonistAnalysis | null
  recap: string | null

  // Actions
  setUserId: (id: string) => void
  fetchDashboard: (userId: string) => Promise<void>
  fetchMood: (userId: string) => Promise<void>
  recordMood: (userId: string, sessionId: string, moodStart?: number, moodEnd?: number) => Promise<void>
  fetchFlags: (userId: string) => Promise<void>
  addFlag: (userId: string, flag: { session_id: string; severity: string; category: string; description: string; user_content?: string }) => Promise<string | null>
  annotateFlag: (flagId: string, note: string) => Promise<void>
  fetchNotes: (userId: string) => Promise<void>
  addNote: (userId: string, note: { target_type: string; target_id: string; note: string }) => Promise<string | null>
  fetchAchievements: (userId: string) => Promise<void>
  fetchRecap: (userId: string) => Promise<void>
  submitChoicesForAnalysis: (userId: string, choices: any[]) => Promise<void>
  submitMirrorStats: (userId: string, stats: { mirror_bubbles_shown: number; mirror_bubbles_expanded: number }) => Promise<void>
  clearError: () => void
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `API error ${res.status}`)
  }
  return res.json()
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  loading: false,
  error: null,
  userId: null,
  dashboard: null,
  moodHistory: [],
  moodVelocity: null,
  flags: [],
  notes: [],
  achievements: [],
  choiceTimeline: null,
  mirrorAnalytics: null,
  antagonistAnalysis: null,
  recap: null,

  setUserId: (id) => set({ userId: id }),

  fetchDashboard: async (userId) => {
    set({ loading: true, error: null })
    try {
      const data = await api<FullDashboard>(`/api/dashboard/user/${userId}`)
      set({
        dashboard: data,
        moodHistory: data.mood_history || [],
        moodVelocity: data.mood_velocity || null,
        flags: data.flagged_moments || [],
        notes: data.therapist_notes || [],
        achievements: data.achievements || [],
        choiceTimeline: data.choice_timeline || null,
        mirrorAnalytics: data.mirror_analytics || null,
        antagonistAnalysis: data.antagonist_analysis || null,
        loading: false,
      })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchMood: async (userId) => {
    try {
      const data = await api<{ history: MoodCheckIn[]; velocity: MoodVelocity }>(
        `/api/dashboard/user/${userId}/mood`
      )
      set({ moodHistory: data.history, moodVelocity: data.velocity })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  recordMood: async (userId, sessionId, moodStart, moodEnd) => {
    try {
      await api(`/api/dashboard/user/${userId}/mood`, {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId, mood_start: moodStart, mood_end: moodEnd }),
      })
      // Refresh mood data
      get().fetchMood(userId)
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  fetchFlags: async (userId) => {
    try {
      const data = await api<FlaggedMoment[]>(`/api/dashboard/user/${userId}/flags`)
      set({ flags: data })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  addFlag: async (userId, flag) => {
    try {
      const res = await api<{ flag_id: string }>(`/api/dashboard/user/${userId}/flags`, {
        method: "POST",
        body: JSON.stringify(flag),
      })
      get().fetchFlags(userId)
      return res.flag_id
    } catch (e: any) {
      set({ error: e.message })
      return null
    }
  },

  annotateFlag: async (flagId, note) => {
    try {
      await api(`/api/dashboard/flag/${flagId}/annotate`, {
        method: "PUT",
        body: JSON.stringify({ note }),
      })
      const uid = get().userId
      if (uid) get().fetchFlags(uid)
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  fetchNotes: async (userId) => {
    try {
      const data = await api<SessionNote[]>(`/api/dashboard/user/${userId}/notes`)
      set({ notes: data })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  addNote: async (userId, note) => {
    try {
      const res = await api<{ note_id: string }>(`/api/dashboard/user/${userId}/notes`, {
        method: "POST",
        body: JSON.stringify(note),
      })
      get().fetchNotes(userId)
      return res.note_id
    } catch (e: any) {
      set({ error: e.message })
      return null
    }
  },

  fetchAchievements: async (userId) => {
    try {
      const data = await api<Achievement[]>(`/api/dashboard/user/${userId}/achievements`)
      set({ achievements: data })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  fetchRecap: async (userId) => {
    try {
      const data = await api<{ recap: string }>(`/api/dashboard/user/${userId}/recap`)
      set({ recap: data.recap })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  submitChoicesForAnalysis: async (userId, choices) => {
    try {
      const data = await api<ChoiceTimeline>(`/api/dashboard/user/${userId}/choices`, {
        method: "POST",
        body: JSON.stringify(choices),
      })
      set({ choiceTimeline: data })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  submitMirrorStats: async (userId, stats) => {
    try {
      const data = await api<MirrorAnalytics>(`/api/dashboard/user/${userId}/mirror`, {
        method: "POST",
        body: JSON.stringify(stats),
      })
      set({ mirrorAnalytics: data })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  clearError: () => set({ error: null }),
}))
