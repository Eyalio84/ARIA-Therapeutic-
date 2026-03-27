"use client"

import { useState, useEffect } from "react"
import { useDashboardStore } from "@/store/dashboard"
import { useGameStore } from "@/store/game"
import { OverviewTab } from "./tabs/OverviewTab"
import { TherapyKGTab } from "./tabs/TherapyKGTab"
import { MoodTab } from "./tabs/MoodTab"
import { FlagsNotesTab } from "./tabs/FlagsNotesTab"
import { SessionsTab } from "./tabs/SessionsTab"
import { AssessmentsTab } from "./tabs/AssessmentsTab"

const TABS = [
  { id: "overview", label: "Overview", icon: "\u2302" },
  { id: "kg", label: "Therapy KG", icon: "\u26d3" },
  { id: "mood", label: "Mood", icon: "\u2600" },
  { id: "flags", label: "Flags & Notes", icon: "\u26a0" },
  { id: "sessions", label: "Sessions", icon: "\u23f1" },
  { id: "assessments", label: "Assessments", icon: "\u2695" },
] as const

type TabId = typeof TABS[number]["id"]

export default function DashboardShell() {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [userIdInput, setUserIdInput] = useState("")

  const { userId, setUserId, fetchDashboard, loading, error, dashboard } = useDashboardStore()
  const gameUserId = useGameStore((s) => s.userId)

  // Auto-populate from game store if available
  useEffect(() => {
    if (gameUserId && !userId) {
      setUserId(gameUserId)
      setUserIdInput(gameUserId)
    }
  }, [gameUserId, userId, setUserId])

  const handleLoadUser = () => {
    if (userIdInput.trim()) {
      setUserId(userIdInput.trim())
      fetchDashboard(userIdInput.trim())
    }
  }

  const renderTab = () => {
    if (!userId) return null
    switch (activeTab) {
      case "overview": return <OverviewTab />
      case "kg": return <TherapyKGTab />
      case "mood": return <MoodTab />
      case "flags": return <FlagsNotesTab />
      case "sessions": return <SessionsTab />
      case "assessments": return <AssessmentsTab />
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#07070f" }}>
      {/* Header */}
      <header className="shrink-0 glass-strong px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/game" className="text-zinc-500 hover:text-zinc-300 text-sm">
            &larr; Game
          </a>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: "#c9a96e" }}>
            Therapist Dashboard
          </h1>
        </div>

        {/* User selector */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoadUser()}
            placeholder="User ID"
            className="glass rounded-lg px-3 py-1.5 text-sm w-48 outline-none focus:border-amber-700/50"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          />
          <button
            onClick={handleLoadUser}
            disabled={loading || !userIdInput.trim()}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
            style={{
              background: userIdInput.trim() ? "rgba(201,169,110,0.2)" : "rgba(255,255,255,0.05)",
              color: userIdInput.trim() ? "#c9a96e" : "#666",
              border: "1px solid rgba(201,169,110,0.2)",
            }}
          >
            {loading ? "Loading..." : "Load"}
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="shrink-0 flex gap-1 px-4 py-2 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm transition-all whitespace-nowrap"
            style={{
              background: activeTab === tab.id ? "rgba(201,169,110,0.15)" : "transparent",
              color: activeTab === tab.id ? "#c9a96e" : "#888",
              border: activeTab === tab.id ? "1px solid rgba(201,169,110,0.2)" : "1px solid transparent",
            }}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 mx-4 mt-2 px-3 py-2 rounded-lg text-sm"
          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
          <button onClick={() => useDashboardStore.getState().clearError()}
            className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {!userId ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
            <div className="text-4xl opacity-30">{"\u2695"}</div>
            <p className="text-sm">Enter a User ID above to load their dashboard</p>
          </div>
        ) : !dashboard && !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
            <p className="text-sm">Click Load to fetch dashboard data</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-zinc-500 animate-pulse">Loading dashboard...</div>
          </div>
        ) : (
          renderTab()
        )}
      </main>
    </div>
  )
}
