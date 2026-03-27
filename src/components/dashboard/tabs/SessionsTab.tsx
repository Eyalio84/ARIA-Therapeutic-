"use client"

import { useDashboardStore } from "@/store/dashboard"

export function SessionsTab() {
  const { dashboard, choiceTimeline, mirrorAnalytics } = useDashboardStore()
  const userId = useDashboardStore((s) => s.userId)
  const submitChoicesForAnalysis = useDashboardStore((s) => s.submitChoicesForAnalysis)
  const submitMirrorStats = useDashboardStore((s) => s.submitMirrorStats)

  const sessions = dashboard?.session_history || []

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Session history */}
      <section>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">
          Session History ({sessions.length})
        </h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-zinc-500 glass rounded-lg p-4 text-center">
            No sessions recorded yet
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s: any, i: number) => (
              <div key={s.id || i} className="glass rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-zinc-300">Session #{sessions.length - i}</span>
                  <span className="text-xs text-zinc-600">
                    {s.started_at ? new Date(s.started_at).toLocaleDateString() : ""}
                  </span>
                </div>
                {s.summary && <p className="text-xs text-zinc-500 mt-1">{s.summary}</p>}
                <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                  {s.mood_start != null && <span>Mood in: {s.mood_start}/5</span>}
                  {s.mood_end != null && <span>Mood out: {s.mood_end}/5</span>}
                  {s.node_count_end != null && <span>KG nodes: {s.node_count_end}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Choice timeline */}
      <section>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Choice Evolution</h3>
        {choiceTimeline ? (
          <div>
            {/* Patterns */}
            {choiceTimeline.patterns.length > 0 && (
              <div className="glass rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-zinc-400 mb-1">Detected Patterns</p>
                {choiceTimeline.patterns.map((p, i) => (
                  <p key={i} className="text-sm" style={{ color: "#c9a96e" }}>{p}</p>
                ))}
              </div>
            )}

            {/* Timeline entries */}
            <div className="flex flex-col gap-1">
              {choiceTimeline.timeline.map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="text-zinc-600 w-6 text-right">{i + 1}</span>
                  <div className="w-2 h-2 rounded-full"
                    style={{
                      background: c.therapeutic_note?.includes("breakthrough") ? "#a78bfa" :
                                  c.therapeutic_note?.includes("avoidance") ? "#f97316" : "#6b7280"
                    }} />
                  <span className="text-zinc-400 flex-1 truncate">{c.quest}</span>
                  <span className="text-zinc-500 truncate max-w-[150px]">{c.therapeutic_note}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-2">{choiceTimeline.total_choices} total choices</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 glass rounded-lg p-4 text-center">
            Choice analysis will appear after gameplay choices are submitted
          </p>
        )}
      </section>

      {/* Mirror analytics */}
      <section>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Mirror Bubble Analytics</h3>
        {mirrorAnalytics ? (
          <div className="glass rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center mb-3">
              <div>
                <div className="text-xl font-semibold text-zinc-300">{mirrorAnalytics.interview_shown}</div>
                <div className="text-xs text-zinc-500">Shown</div>
              </div>
              <div>
                <div className="text-xl font-semibold" style={{ color: "#c9a96e" }}>{mirrorAnalytics.interview_expanded}</div>
                <div className="text-xs text-zinc-500">Expanded</div>
              </div>
              <div>
                <div className="text-xl font-semibold" style={{
                  color: mirrorAnalytics.engagement_level === "high" ? "#22c55e" :
                         mirrorAnalytics.engagement_level === "moderate" ? "#eab308" : "#ef4444"
                }}>
                  {(mirrorAnalytics.engagement_ratio * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-zinc-500">Engagement</div>
              </div>
            </div>
            <p className="text-xs text-zinc-400 italic">{mirrorAnalytics.interpretation}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 glass rounded-lg p-4 text-center">
            Mirror analytics will appear after interview data is submitted
          </p>
        )}
      </section>

      {/* Export */}
      <section>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Export</h3>
        <div className="flex gap-2">
          <button onClick={() => {
            const data = JSON.stringify(dashboard, null, 2)
            const blob = new Blob([data], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url; a.download = `dashboard-${userId}-${Date.now()}.json`; a.click()
            URL.revokeObjectURL(url)
          }}
            className="glass rounded-lg px-3 py-2 text-xs hover:bg-white/10 transition">
            Export Full Dashboard (JSON)
          </button>
        </div>
      </section>
    </div>
  )
}
