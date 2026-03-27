"use client"

import { useState, useEffect } from "react"
import { useDashboardStore } from "@/store/dashboard"

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-semibold" style={{ color: color || "#e4e4e7" }}>{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    info: "#60a5fa",
    attention: "#fbbf24",
    concern: "#f97316",
    urgent: "#ef4444",
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${colors[severity] || "#888"}22`, color: colors[severity] || "#888" }}>
      {severity}
    </span>
  )
}

const API = process.env.NEXT_PUBLIC_GAME_API || ""

function TherapistControlsPanel({ userId }: { userId: string }) {
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [context, setContext] = useState("")
  const [maxLayer, setMaxLayer] = useState(2)
  const [status, setStatus] = useState("")

  // Poll controls state
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/dashboard/user/${userId}/controls`)
        const data = await res.json()
        setPaused(data.paused === 1)
        setMaxLayer(data.max_disclosure_layer || 2)
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [userId])

  const togglePause = async () => {
    setLoading(true)
    try {
      if (paused) {
        await fetch(`${API}/api/dashboard/user/${userId}/resume`, { method: "POST" })
        setPaused(false)
        setStatus("Resumed")
      } else {
        await fetch(`${API}/api/dashboard/user/${userId}/pause`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Your therapist has paused the session." }),
        })
        setPaused(true)
        setStatus("Paused")
      }
    } finally { setLoading(false); setTimeout(() => setStatus(""), 2000) }
  }

  const sendMessage = async () => {
    if (!message.trim()) return
    await fetch(`${API}/api/dashboard/user/${userId}/therapist-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    })
    setMessage("")
    setStatus("Message sent")
    setTimeout(() => setStatus(""), 2000)
  }

  const injectContext = async () => {
    if (!context.trim()) return
    await fetch(`${API}/api/dashboard/user/${userId}/inject-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context }),
    })
    setContext("")
    setStatus("Context injected for next session")
    setTimeout(() => setStatus(""), 2000)
  }

  const setDisclosure = async (layer: number) => {
    await fetch(`${API}/api/dashboard/user/${userId}/disclosure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_layer: layer }),
    })
    setMaxLayer(layer)
    setStatus(`Disclosure set to Layer ${layer}`)
    setTimeout(() => setStatus(""), 2000)
  }

  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-3">
      <h3 className="text-sm font-medium text-zinc-400">Therapist Controls</h3>

      {/* Pause/Resume */}
      <div className="flex items-center gap-3">
        <button onClick={togglePause} disabled={loading}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-all"
          style={{
            background: paused ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
            color: paused ? "#22c55e" : "#ef4444",
            border: `1px solid ${paused ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}>
          {paused ? "\u25b6 Resume Game" : "\u23f8 Pause Game"}
        </button>
        {status && <span className="text-xs" style={{ color: "#c9a96e" }}>{status}</span>}
      </div>

      {/* Disclosure layer */}
      <div>
        <span className="text-xs text-zinc-500 block mb-1">Max Disclosure Layer: {maxLayer}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((l) => (
            <button key={l} onClick={() => setDisclosure(l)}
              className="rounded px-3 py-1 text-xs transition-all"
              style={{
                background: maxLayer >= l ? "rgba(201,169,110,0.2)" : "rgba(255,255,255,0.05)",
                color: maxLayer >= l ? "#c9a96e" : "#666",
                border: maxLayer === l ? "1px solid rgba(201,169,110,0.4)" : "1px solid transparent",
              }}>
              L{l}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-600 mt-1 block">
          {["", "Aspirational only", "Relational", "Historical (review required)", "Core wounds (therapist approval)"][maxLayer]}
        </span>
      </div>

      {/* Send message */}
      <div className="flex gap-2">
        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Send message to player..."
          className="flex-1 glass rounded-lg px-3 py-1.5 text-xs outline-none" />
        <button onClick={sendMessage} disabled={!message.trim()}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(201,169,110,0.2)", color: "#c9a96e" }}>Send</button>
      </div>

      {/* Inject context */}
      <div className="flex gap-2">
        <input type="text" value={context} onChange={(e) => setContext(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && injectContext()}
          placeholder="Inject context for next session..."
          className="flex-1 glass rounded-lg px-3 py-1.5 text-xs outline-none" />
        <button onClick={injectContext} disabled={!context.trim()}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(96,165,250,0.2)", color: "#60a5fa" }}>Inject</button>
      </div>
    </div>
  )
}

export function OverviewTab() {
  const { dashboard, moodVelocity, flags, achievements, recap } = useDashboardStore()
  const userId = useDashboardStore((s) => s.userId)
  const fetchRecap = useDashboardStore((s) => s.fetchRecap)

  if (!dashboard) return <p className="text-zinc-500 text-sm">No dashboard data loaded</p>

  const kgStats = dashboard.kg_stats
  const earnedCount = achievements.filter((a) => a.earned).length
  const urgentFlags = flags.filter((f) => f.severity === "urgent" || f.severity === "concern")

  const moodEmoji: Record<string, string> = {
    improving: "\u2600\ufe0f", declining: "\u26c8\ufe0f", stable: "\u26c5", insufficient_data: "\u2014",
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Therapist Controls */}
      {userId && <TherapistControlsPanel userId={userId} />}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="KG Nodes" value={kgStats?.total_nodes ?? 0}
          sub={kgStats ? `${kgStats.total_edges ?? 0} edges` : ""} color="#c9a96e" />
        <StatCard label="Mood Trend"
          value={`${moodEmoji[moodVelocity?.trend || "insufficient_data"]} ${moodVelocity?.trend || "no data"}`}
          sub={moodVelocity?.average ? `avg ${moodVelocity.average}/5` : ""} />
        <StatCard label="Achievements" value={`${earnedCount}/${achievements.length}`}
          sub={earnedCount > 0 ? "earned" : "none yet"} color="#a78bfa" />
        <StatCard label="Flags" value={urgentFlags.length}
          sub={flags.length > 0 ? `${flags.length} total` : "none"}
          color={urgentFlags.length > 0 ? "#f97316" : "#22c55e"} />
      </div>

      {/* Active concerns */}
      {dashboard.active_concerns && dashboard.active_concerns.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Active Concerns</h3>
          <div className="flex flex-wrap gap-2">
            {dashboard.active_concerns.map((c, i) => (
              <div key={i} className="glass rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                <span>{c.name}</span>
                <span className="text-xs rounded-full px-1.5 py-0.5"
                  style={{
                    background: `rgba(239,68,68,${c.intensity * 0.3})`,
                    color: c.intensity > 0.6 ? "#fca5a5" : "#a1a1aa"
                  }}>
                  {(c.intensity * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent flags */}
      {flags.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Recent Flags</h3>
          <div className="flex flex-col gap-2">
            {flags.slice(0, 5).map((flag) => (
              <div key={flag.id} className="glass rounded-lg px-3 py-2 flex items-start gap-3">
                <SeverityBadge severity={flag.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300">{flag.description}</p>
                  {flag.user_content && (
                    <p className="text-xs text-zinc-500 mt-1 italic truncate">
                      &ldquo;{flag.user_content}&rdquo;
                    </p>
                  )}
                  {flag.therapist_note && (
                    <p className="text-xs mt-1" style={{ color: "#c9a96e" }}>
                      Note: {flag.therapist_note}
                    </p>
                  )}
                </div>
                <span className="text-xs text-zinc-600 shrink-0">
                  {new Date(flag.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      <section>
        <h3 className="text-sm font-medium text-zinc-400 mb-2">Achievements</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {achievements.map((a) => (
            <div key={a.id} className="glass rounded-lg px-3 py-2 text-center"
              style={{ opacity: a.earned ? 1 : 0.35 }}>
              <div className="text-lg">{a.earned ? "\u2b50" : "\u26aa"}</div>
              <div className="text-xs text-zinc-300 mt-0.5">{a.title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Story recap */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-zinc-400">Story So Far</h3>
          {userId && (
            <button onClick={() => fetchRecap(userId)} className="text-xs underline text-zinc-500 hover:text-zinc-300">
              refresh
            </button>
          )}
        </div>
        <div className="glass rounded-lg px-4 py-3">
          <p className="text-sm text-zinc-300 leading-relaxed italic">
            {recap || dashboard.generated_at ? (recap || "No story recap available yet. Start a game session to build the story.") : "Loading..."}
          </p>
        </div>
      </section>
    </div>
  )
}
