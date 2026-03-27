"use client"

import { useEffect } from "react"
import { useDashboardStore } from "@/store/dashboard"
import { MOOD_LABELS } from "@/types/dashboard"

function MoodBar({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-xs text-zinc-600">--</span>
  const pct = (value / max) * 100
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"]
  const color = colors[Math.min(value - 1, 4)]
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-2 rounded-full gauge-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs shrink-0" style={{ color }}>{value}/{max}</span>
    </div>
  )
}

export function MoodTab() {
  const { userId, moodHistory, moodVelocity, fetchMood } = useDashboardStore()

  useEffect(() => {
    if (userId) fetchMood(userId)
  }, [userId, fetchMood])

  const trendColor: Record<string, string> = {
    improving: "#22c55e",
    declining: "#ef4444",
    stable: "#eab308",
    insufficient_data: "#6b7280",
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Velocity card */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Mood Velocity</h3>
        {moodVelocity ? (
          <div className="flex items-center gap-4">
            <span className="text-3xl">
              {moodVelocity.trend === "improving" ? "\u2197\ufe0f" :
               moodVelocity.trend === "declining" ? "\u2198\ufe0f" :
               moodVelocity.trend === "stable" ? "\u27a1\ufe0f" : "\u2014"}
            </span>
            <div>
              <p className="text-lg font-semibold" style={{ color: trendColor[moodVelocity.trend] }}>
                {moodVelocity.trend.charAt(0).toUpperCase() + moodVelocity.trend.slice(1).replace(/_/g, " ")}
              </p>
              <p className="text-xs text-zinc-500">
                {moodVelocity.sessions} session{moodVelocity.sessions !== 1 ? "s" : ""} recorded
                {moodVelocity.average != null && ` \u2022 avg ${moodVelocity.average}/5`}
                {moodVelocity.delta != null && ` \u2022 delta ${moodVelocity.delta > 0 ? "+" : ""}${moodVelocity.delta}`}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No mood data yet. Mood is recorded at session start and end.</p>
        )}
      </div>

      {/* Mood scale legend */}
      <div className="flex gap-2 justify-center">
        {MOOD_LABELS.map((m) => (
          <div key={m.value} className="flex flex-col items-center gap-0.5 text-xs text-zinc-500">
            <span>{m.emoji}</span>
            <span>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Session Mood History</h3>
        {moodHistory.length === 0 ? (
          <p className="text-sm text-zinc-500 glass rounded-lg p-4 text-center">
            No mood check-ins recorded yet
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {moodHistory.map((m, i) => (
              <div key={i} className="glass rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">
                    Session: {m.session_id?.slice(0, 12) || `#${i + 1}`}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {new Date(m.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-zinc-500 block mb-1">Start</span>
                    <MoodBar value={m.mood_start} />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 block mb-1">End</span>
                    <MoodBar value={m.mood_end} />
                  </div>
                </div>
                {m.mood_start != null && m.mood_end != null && (
                  <div className="mt-2 text-xs" style={{
                    color: m.mood_end > m.mood_start ? "#22c55e" :
                           m.mood_end < m.mood_start ? "#ef4444" : "#eab308"
                  }}>
                    {m.mood_end > m.mood_start ? "\u2191 Improved" :
                     m.mood_end < m.mood_start ? "\u2193 Declined" : "\u2192 Stable"} during session
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
