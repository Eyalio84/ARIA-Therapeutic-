"use client"

import { useState, useEffect, useSyncExternalStore, useCallback } from "react"
import { createPortal } from "react-dom"
import { devLogger, commandAudit, SOURCE_COLORS } from "@/lib/gameDevLogger"
import { useGameStore } from "@/store/game"
import { useGameVoiceStore } from "@/store/gameVoice"
import { useGameThemeStore } from "@/store/gameTheme"
import { useAriaModeStore } from "@/store/ariaMode"
import { useDashboardStore } from "@/store/dashboard"
import type { GenericLogEntry } from "@/lib/aria-core/devhub/logger"
import type { AuditRecord } from "@/lib/aria-core/devhub/auditTrail"

const API = process.env.NEXT_PUBLIC_GAME_API || ""

// ── Hook: subscribe to ring buffer ──
function useDevLogs() {
  return useSyncExternalStore(
    (cb) => devLogger.subscribe(cb),
    () => devLogger.getAll(),
    () => [] as GenericLogEntry[],
  )
}

function useAuditRecords() {
  return useSyncExternalStore(
    (cb) => commandAudit.subscribe(cb),
    () => commandAudit.getAll(),
    () => [] as AuditRecord[],
  )
}

// ── Tab definitions (6 tabs: merged Voice+Config, added Therapy + Clinical) ──
const TABS = [
  { id: "logs", label: "Logs", color: "#7a7a7a" },
  { id: "voice_config", label: "Voice", color: "#e07acc" },
  { id: "game", label: "Game", color: "#4ae0c8" },
  { id: "commands", label: "Cmds", color: "#c49ef0" },
  { id: "therapy", label: "Therapy", color: "#ef4444" },
  { id: "clinical", label: "Clinical", color: "#60a5fa" },
] as const

type TabId = typeof TABS[number]["id"]

// ── Shared log entry renderer ──
function LogLine({ e }: { e: GenericLogEntry }) {
  const color = SOURCE_COLORS[e.source] || "#7a7a7a"
  const levelColors: Record<string, string> = { error: "#e07a7a", warn: "#e0c07a", info: "#7ab8e0", debug: "#5a5854", system: "#9a9690" }
  return (
    <div className="mb-0.5 font-mono text-[10px] leading-snug px-1 py-0.5 rounded" style={{ background: e.level === "error" ? "rgba(224,122,122,0.08)" : "transparent" }}>
      <span className="opacity-40">{new Date(e.timestamp).toLocaleTimeString()}</span>
      {" "}
      <span style={{ color: levelColors[e.level] || "#7a7a7a" }} className="font-bold">[{e.level.slice(0, 3).toUpperCase()}]</span>
      {" "}
      <span style={{ color }}>{e.source}</span>
      <span className="text-[#5a5854]">.</span>
      <span className="text-[#9a9690]">{e.component}:</span>
      {" "}
      <span className="text-[#c8c8c8]">{e.message}</span>
      {e.duration != null && <span className="text-[#5a5854] ml-1">{e.duration}ms</span>}
    </div>
  )
}

function KV({ k, v, color }: { k: string; v: string | number; color?: string }) {
  return <div className="text-[#c8c8c8] mb-0.5"><span className="text-[#5a5854]">{k}:</span> <span style={{ color }}>{v}</span></div>
}

// ── Tab: Unified Logs ──
function LogsTab() {
  const logs = useDevLogs()
  const [levelFilter, setLevelFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const filtered = logs.filter((e) => (levelFilter === "all" || e.level === levelFilter) && (sourceFilter === "all" || e.source === sourceFilter))

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 px-2 py-1 border-b border-white/[0.06] shrink-0">
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="bg-transparent text-[10px] text-[#9a9690] font-mono border border-white/[0.08] rounded px-1">
          <option value="all">ALL</option><option value="error">ERR</option><option value="warn">WRN</option><option value="info">INF</option><option value="debug">DBG</option>
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="bg-transparent text-[10px] text-[#9a9690] font-mono border border-white/[0.08] rounded px-1">
          <option value="all">ALL</option><option value="voice">voice</option><option value="game">game</option><option value="function">function</option><option value="theme">theme</option><option value="api">api</option><option value="therapy">therapy</option>
        </select>
      </div>
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {filtered.length === 0 ? <div className="text-center text-[#5a5854] text-[10px] mt-4">No entries</div> : filtered.map((e) => <LogLine key={e.id} e={e} />)}
      </div>
    </div>
  )
}

// ── Tab: Voice + Config (MERGED) ──
function VoiceConfigTab() {
  const logs = useDevLogs().filter((e) => e.source === "voice")
  const orbState = useGameVoiceStore((s) => s.orbState)
  const isConnected = useGameVoiceStore((s) => s.isConnected)
  const { gameConfig } = useGameStore()
  const themeId = useGameThemeStore((s) => s.themeId)
  const ariaMode = useAriaModeStore((s) => s.mode)

  return (
    <div className="flex flex-col h-full overflow-y-auto px-2 py-1 font-mono text-[10px]">
      {/* Connection status */}
      <div className="flex items-center gap-2 mb-2 pb-1 border-b border-white/[0.06]">
        <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
        <span className="text-[#c8c8c8]">{orbState}</span>
        <span className="text-[#5a5854]">{isConnected ? "Connected" : "Disconnected"}</span>
        <span className="ml-auto text-[#c49ef0]">{ariaMode.toUpperCase()}</span>
      </div>

      <div className="text-[#e07acc] font-bold mb-1">VOICE</div>
      <KV k="Model" v="gemini-2.5-flash-native-audio" />
      <KV k="Voice" v={typeof window !== "undefined" ? localStorage.getItem("aria_voice_pref") || "Aoede" : "Aoede"} />
      <KV k="Mode" v={ariaMode} color={ariaMode === "su" ? "#c49ef0" : "#4ae0c8"} />
      <KV k="Functions" v={ariaMode === "su" ? "30 (SU)" : "23 (game)"} />

      <div className="text-[#e0c07a] font-bold mt-2 mb-1">THEME + CONFIG</div>
      <KV k="Theme" v={themeId} />
      <KV k="Game" v={gameConfig?.title || "--"} />
      <KV k="Protagonist" v={gameConfig?.protagonist_name || "--"} />
      <KV k="Cartridge" v={(gameConfig as any)?.cartridge_id || "custom"} />
      <KV k="NPCs" v={gameConfig?.npcs?.length || 0} />
      <KV k="Locations" v={gameConfig?.locations?.length || 0} />
      <KV k="Quests" v={gameConfig?.quests?.length || 0} />

      <div className="text-[#e07acc] font-bold mt-2 mb-1">VOICE LOG ({logs.length})</div>
      <div className="max-h-32 overflow-y-auto">
        {logs.slice(-15).map((e) => <LogLine key={e.id} e={e} />)}
      </div>
    </div>
  )
}

// ── Tab: Game State ──
function GameStateTab() {
  const { playerStats, turnCount, mapNodes, currentChoices, availableActions, gameConfig, narratives } = useGameStore()
  const currentLocation = mapNodes.find((n) => n.current)
  const logs = useDevLogs().filter((e) => e.source === "game").slice(-20)

  return (
    <div className="flex flex-col h-full overflow-y-auto px-2 py-1 font-mono text-[10px]">
      <div className="text-[#e0c07a] font-bold mb-1">LIVE STATE</div>
      <KV k="Game" v={gameConfig?.title || "--"} />
      <KV k="Location" v={currentLocation?.label || "--"} />
      <KV k="Turn" v={turnCount} />
      <KV k="Stats" v={`C:${playerStats.courage} T:${playerStats.trust} I:${playerStats.items}`} />
      <KV k="Choices" v={currentChoices.length > 0 ? currentChoices.map((c) => c.text).join(" | ") : "none"} />
      <KV k="Actions" v={availableActions.length} />
      <KV k="Narratives" v={`${narratives.length} entries`} />

      {/* Persistence status */}
      <div className="text-[#22c55e] font-bold mt-2 mb-1">PERSISTENCE</div>
      <KV k="Zustand" v="localStorage auto-sync" color="#22c55e" />
      <KV k="Game store" v={typeof window !== "undefined" && localStorage.getItem("aria-game-state") ? "persisted" : "empty"} color="#22c55e" />
      <KV k="Transcript" v={typeof window !== "undefined" && localStorage.getItem("aria-transcript") ? "persisted" : "empty"} color="#22c55e" />
      <KV k="Theme" v={typeof window !== "undefined" && localStorage.getItem("aria-theme") ? "persisted" : "empty"} color="#22c55e" />

      <div className="text-[#4ae0c8] font-bold mt-2 mb-1">MAP ({mapNodes.length} nodes)</div>
      {mapNodes.map((n) => (
        <div key={n.id} className="mb-0.5">
          <span className={n.current ? "text-[#e0c07a]" : n.discovered ? "text-[#9a9690]" : "text-[#5a5854]"}>
            {n.current ? ">" : " "} {n.label} [{n.id}] {n.discovered ? "" : "(hidden)"}
          </span>
        </div>
      ))}

      <div className="text-[#7a7a7a] font-bold mt-2 mb-1">RECENT OPS</div>
      {logs.map((e) => <LogLine key={e.id} e={e} />)}
    </div>
  )
}

// ── Tab: Commands (Audit Trail) ──
function CommandsTab() {
  const records = useAuditRecords()

  return (
    <div className="flex flex-col h-full overflow-y-auto px-2 py-1">
      <div className="font-mono text-[10px] text-[#c49ef0] font-bold mb-1">COMMAND AUDIT ({records.length} records)</div>
      {records.length === 0 ? (
        <div className="text-center text-[#5a5854] text-[10px] mt-4">No voice commands yet</div>
      ) : (
        [...records].reverse().map((r) => (
          <div key={r.id} className="mb-1 font-mono text-[10px] px-1 py-0.5 rounded" style={{ background: r.resultType === "error" ? "rgba(224,122,122,0.08)" : "rgba(196,158,240,0.04)" }}>
            <span className="opacity-40">{new Date(r.timestamp).toLocaleTimeString()}</span>
            {" "}
            <span className="text-[#c49ef0] font-bold">{r.commandName}</span>
            <span className="text-[#5a5854]">({Object.values(r.args).join(", ") || ""})</span>
            {" "}
            <span className={r.resultType === "error" ? "text-[#e07a7a]" : "text-[#7ab8e0]"}>{r.resultType}</span>
            {" "}
            <span className="text-[#5a5854]">{r.durationMs}ms</span>
            {r.responseText && <div className="text-[#9a9690] ml-4 truncate">{r.responseText}</div>}
            {r.errorMessage && <div className="text-[#e07a7a] ml-4">{r.errorMessage}</div>}
          </div>
        ))
      )}
    </div>
  )
}

// ── Tab: Therapy (NEW — KG bridge, flags, mood, controls) ──
function TherapyTab() {
  const userId = useGameStore((s) => s.userId)
  const [therapyData, setTherapyData] = useState<any>(null)
  const [controls, setControls] = useState<any>(null)

  // Real-time polling
  useEffect(() => {
    if (!userId) return
    const poll = async () => {
      try {
        const [dashRes, ctrlRes] = await Promise.all([
          fetch(`${API}/api/dashboard/user/${userId}`),
          fetch(`${API}/api/dashboard/user/${userId}/controls`),
        ])
        if (dashRes.ok) setTherapyData(await dashRes.json())
        if (ctrlRes.ok) setControls(await ctrlRes.json())
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [userId])

  const sevColors: Record<string, string> = { info: "#60a5fa", attention: "#fbbf24", concern: "#f97316", urgent: "#ef4444" }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-2 py-1 font-mono text-[10px]">
      <div className="text-[#ef4444] font-bold mb-1">THERAPIST CONTROLS</div>
      {controls ? (
        <>
          <KV k="Paused" v={controls.paused ? "YES" : "no"} color={controls.paused ? "#ef4444" : "#22c55e"} />
          <KV k="Disclosure" v={`Layer ${controls.max_disclosure_layer || "?"}`} color="#fbbf24" />
          <KV k="Review req" v={controls.review_required ? "YES" : "no"} />
          {controls.pause_message && <KV k="Pause msg" v={controls.pause_message} color="#ef4444" />}
          {controls.injected_context && <KV k="Injected" v={controls.injected_context} color="#60a5fa" />}
          {controls.therapist_message && <KV k="Therapist" v={controls.therapist_message} color="#c9a96e" />}
        </>
      ) : <div className="text-[#5a5854]">Loading controls...</div>}

      <div className="text-[#f97316] font-bold mt-2 mb-1">FLAGS ({therapyData?.flagged_moments?.length || 0})</div>
      {therapyData?.flagged_moments?.slice(0, 5).map((f: any) => (
        <div key={f.id} className="mb-1 px-1 py-0.5 rounded" style={{ background: `${sevColors[f.severity] || "#666"}11` }}>
          <span style={{ color: sevColors[f.severity] }}>[{f.severity}]</span>{" "}
          <span className="text-[#c8c8c8]">{f.description}</span>
          {f.therapist_note && <div className="text-[#c9a96e] ml-2">Note: {f.therapist_note}</div>}
        </div>
      ))}

      <div className="text-[#22c55e] font-bold mt-2 mb-1">MOOD</div>
      {therapyData?.mood_velocity ? (
        <>
          <KV k="Trend" v={therapyData.mood_velocity.trend} color={therapyData.mood_velocity.trend === "improving" ? "#22c55e" : therapyData.mood_velocity.trend === "declining" ? "#ef4444" : "#fbbf24"} />
          <KV k="Sessions" v={therapyData.mood_velocity.sessions} />
          {therapyData.mood_velocity.average && <KV k="Average" v={`${therapyData.mood_velocity.average}/5`} />}
        </>
      ) : <div className="text-[#5a5854]">No mood data</div>}

      <div className="text-[#a78bfa] font-bold mt-2 mb-1">ACHIEVEMENTS ({therapyData?.achievements?.filter((a: any) => a.earned).length || 0}/{therapyData?.achievements?.length || 0})</div>
      {therapyData?.achievements?.map((a: any) => (
        <div key={a.id} className="mb-0.5" style={{ opacity: a.earned ? 1 : 0.3 }}>
          <span>{a.earned ? "\u2b50" : "\u26aa"}</span> <span className="text-[#c8c8c8]">{a.title}</span>
        </div>
      ))}

      <div className="text-[#c9a96e] font-bold mt-2 mb-1">NOTES ({therapyData?.therapist_notes?.length || 0})</div>
      {therapyData?.therapist_notes?.slice(0, 3).map((n: any) => (
        <div key={n.id} className="mb-1 text-[#9a9690]">{n.target_type}: {n.note}</div>
      ))}

      <div className="mt-2">
        <a href="/dashboard" target="_blank" className="text-[#60a5fa] underline text-[10px]">Open Full Dashboard</a>
      </div>
    </div>
  )
}

// ── Tab: Clinical Reference (NEW — loaded psychology data) ──
function ClinicalTab() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch ICD-11 stats and dashboard health for data source info
        const res = await fetch(`${API}/api/dashboard/health`)
        if (res.ok) setData(await res.json())
      } catch {}
    }
    load()
  }, [])

  return (
    <div className="flex flex-col h-full overflow-y-auto px-2 py-1 font-mono text-[10px]">
      <div className="text-[#60a5fa] font-bold mb-1">CLINICAL DATA SOURCES</div>

      <div className="text-[#c8c8c8] mb-2 p-1 rounded" style={{ background: "rgba(96,165,250,0.06)" }}>
        <div className="text-[#60a5fa] font-bold mb-0.5">Psychology JSON (11 files, 207.8 KB)</div>
        <KV k="Cognitive Distortions" v="15 (Burns/Beck)" />
        <KV k="OARS Framework" v="4 MI skills + examples" />
        <KV k="Safe Phrases" v="14 safe + 11 harmful" />
        <KV k="NPC Archetypes" v="7 (mapped to disorders)" />
        <KV k="Assessment Scales" v="7 (PHQ-9, GAD-7, PCL-5, DASS-21, WHO-5, C-SSRS, Mood)" />
        <KV k="IFS Model" v="Exiles / Managers / Firefighters" />
        <KV k="Graduated Disclosure" v="4 layers + 5 safety triggers" />
        <KV k="Disorder Comms" v="10 disorders + 12 game mechanics" />
        <KV k="DBT Skills" v="4 modules (TIPP, STOP, DEAR MAN, etc.)" />
        <KV k="ACT Processes" v="6 hexaflex + ACT Matrix" />
      </div>

      <div className="text-[#c8c8c8] mb-2 p-1 rounded" style={{ background: "rgba(96,165,250,0.06)" }}>
        <div className="text-[#60a5fa] font-bold mb-0.5">ICD-11 (WHO)</div>
        <KV k="Entities" v="156 mental disorders" />
        <KV k="Source" v="WHO ICD-11 API (live import)" />
        <KV k="Chapter" v="06 - Mental, behavioural, neurodevelopmental" />
      </div>

      <div className="text-[#c8c8c8] mb-2 p-1 rounded" style={{ background: "rgba(96,165,250,0.06)" }}>
        <div className="text-[#60a5fa] font-bold mb-0.5">LOINC</div>
        <KV k="PHQ-9" v="44249-1" />
        <KV k="GAD-7" v="69737-5" />
      </div>

      <div className="text-[#c8c8c8] mb-2 p-1 rounded" style={{ background: "rgba(96,165,250,0.06)" }}>
        <div className="text-[#60a5fa] font-bold mb-0.5">Clinical Cartridges (5)</div>
        <KV k="CBT" v="The Thought Detective" />
        <KV k="DBT" v="The Fire Keeper" />
        <KV k="ACT" v="The Compass Quest" />
        <KV k="IFS" v="The Council of Parts" />
        <KV k="MI/OARS" v="The Listener's Garden" />
      </div>

      <div className="text-[#c8c8c8] p-1 rounded" style={{ background: "rgba(96,165,250,0.06)" }}>
        <div className="text-[#60a5fa] font-bold mb-0.5">API Status</div>
        <KV k="Dashboard" v={data?.status || "?"} color={data?.status === "healthy" ? "#22c55e" : "#ef4444"} />
        <KV k="Controls" v={data?.controls ? "active" : "?"} color={data?.controls ? "#22c55e" : "#5a5854"} />
      </div>
    </div>
  )
}

// ── DevHub Shell (6 tabs) ──
interface DevHubProps {
  isOpen: boolean
  onClose: () => void
}

export default function DevHub({ isOpen, onClose }: DevHubProps) {
  const [activeTab, setActiveTab] = useState<TabId>("logs")
  const logs = useDevLogs()

  const errorCount = logs.filter((e) => e.level === "error").length
  const warnCount = logs.filter((e) => e.level === "warn").length

  const handleCopy = useCallback(() => {
    const text = logs.map((e) => `[${new Date(e.timestamp).toLocaleTimeString()}] [${e.level}] ${e.source}.${e.component}: ${e.message}`).join("\n")
    navigator.clipboard?.writeText(text)
  }, [logs])

  if (!isOpen) return null

  const tabContent: Record<TabId, React.ReactNode> = {
    logs: <LogsTab />,
    voice_config: <VoiceConfigTab />,
    game: <GameStateTab />,
    commands: <CommandsTab />,
    therapy: <TherapyTab />,
    clinical: <ClinicalTab />,
  }

  const panel = (
    <div className="fixed inset-0 z-[99999] bg-[#07070f] flex flex-col" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.08] shrink-0">
        <span className="text-[11px] text-[#e07a7a] font-bold tracking-wide">ARIA DEV</span>
        <div className="flex gap-1.5">
          <button onClick={handleCopy} className="text-[9px] px-1.5 py-0.5 rounded border border-white/[0.08] text-[#9a9690] hover:text-[#c8c8c8] transition-colors">CPY</button>
          <button onClick={() => { devLogger.clear(); commandAudit.clear() }} className="text-[9px] px-1.5 py-0.5 rounded border border-white/[0.08] text-[#9a9690] hover:text-[#e07a7a] transition-colors">CLR</button>
          <button onClick={onClose} className="text-[9px] px-1.5 py-0.5 rounded border border-white/[0.08] text-[#9a9690] hover:text-[#e07a7a] transition-colors">x</button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 px-2 py-1 border-b border-white/[0.06] shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === t.id ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"}`}
            style={{ color: activeTab === t.id ? t.color : "#5a5854" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tabContent[activeTab]}
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-3 px-3 py-1 border-t border-white/[0.06] shrink-0 text-[9px] font-mono">
        {errorCount > 0 && <span className="text-[#e07a7a]">{errorCount}E</span>}
        {warnCount > 0 && <span className="text-[#e0c07a]">{warnCount}W</span>}
        <span className="text-[#5a5854]">{logs.length} entries</span>
        <span className="text-[#5a5854] ml-auto">
          {Object.entries(
            logs.reduce((acc, e) => { acc[e.source] = (acc[e.source] || 0) + 1; return acc }, {} as Record<string, number>)
          ).map(([s, c]) => `${c}${s[0]?.toUpperCase()}`).join(" \u00b7 ")}
        </span>
      </div>
    </div>
  )

  if (typeof document === "undefined") return null
  return createPortal(panel, document.body)
}
