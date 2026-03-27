// Therapist Dashboard Types

export interface MoodCheckIn {
  id?: number
  user_id: string
  session_id: string
  mood_start: number | null  // 1-5
  mood_end: number | null    // 1-5
  timestamp: string
}

export interface MoodVelocity {
  trend: "improving" | "declining" | "stable" | "insufficient_data"
  delta?: number
  average?: number
  latest?: number
  sessions: number
}

export interface FlaggedMoment {
  id: string
  session_id: string
  severity: "info" | "attention" | "concern" | "urgent"
  category: string
  description: string
  user_content: string
  timestamp: string
  therapist_note: string
}

export interface SessionNote {
  id: string
  user_id: string
  target_type: "node" | "flag" | "choice" | "session"
  target_id: string
  note: string
  timestamp: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  earned: boolean
  session_earned?: string
  timestamp?: string
}

export interface ChoiceEvent {
  session_index: number
  quest: string
  choice_id: string
  therapeutic_note: string
  turn: number
  therapeutic_mapping: string
}

export interface ChoiceTimeline {
  timeline: ChoiceEvent[]
  patterns: string[]
  total_choices: number
}

export interface MirrorAnalytics {
  interview_shown: number
  interview_expanded: number
  engagement_ratio: number
  engagement_level: "high" | "moderate" | "low"
  interpretation: string
}

export interface AntagonistAnalysis {
  antagonist_description: string
  user_exact_words: string
  desired_resolution: string
  character_fear: string
  interpretation_note: string
}

export interface KGStats {
  total_nodes: number
  total_edges: number
  nodes_by_type: Record<string, number>
  active_concerns?: number
}

export interface FullDashboard {
  user_id: string
  generated_at: string
  kg_stats?: KGStats
  active_concerns?: Array<{ id: string; name: string; intensity: number }>
  all_nodes_by_type?: Record<string, any[]>
  session_history?: any[]
  choice_timeline?: ChoiceTimeline
  mirror_analytics?: MirrorAnalytics
  antagonist_analysis?: AntagonistAnalysis
  mood_history: MoodCheckIn[]
  mood_velocity: MoodVelocity
  flagged_moments: FlaggedMoment[]
  therapist_notes: SessionNote[]
  achievements: Achievement[]
}

// Mood check-in labels (weather themed)
export const MOOD_LABELS = [
  { value: 1, label: "Really struggling", emoji: "\u26c8\ufe0f" },  // storm
  { value: 2, label: "Having a hard time", emoji: "\u2601\ufe0f" },  // cloudy
  { value: 3, label: "Getting by", emoji: "\u26c5" },                // partly cloudy
  { value: 4, label: "Doing okay", emoji: "\u2600\ufe0f" },          // sunny
  { value: 5, label: "Feeling good", emoji: "\u2728" },              // bright
] as const
