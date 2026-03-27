"use client"

import { useTabStore, type TabId } from "@/store/tab"
import { useChatStore } from "@/store/chat"

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "sdk", label: "SDK", icon: "⚡" },
  { id: "store", label: "Store", icon: "🛍️" },
  { id: "roadmap", label: "Roadmap", icon: "🗺️" },
]

const NAV_LINKS = [
  { href: "/game", label: "Game", icon: "🎮" },
  { href: "/su", label: "SU Lab", icon: "🧪" },
  { href: "/dashboard", label: "Dash", icon: "📊" },
  { href: "/docs", label: "Docs", icon: "📄" },
]

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-zinc-500",
  connecting: "bg-amber-400 animate-pulse",
  listening: "bg-emerald-400 animate-pulse",
  thinking: "bg-violet-400 animate-pulse",
  speaking: "bg-blue-400 animate-pulse",
}

export function TabBar() {
  const { activeTab, setActiveTab } = useTabStore()
  const status = useChatStore((s) => s.status)

  return (
    <header className="glass flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-white/5 z-30">
      {/* Logo + status */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] ?? STATUS_COLORS.idle}`} />
        <span className="text-sm font-semibold tracking-wide text-white/90">Aria V2.0</span>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all
              ${activeTab === tab.id
                ? "bg-gold/20 text-gold border border-gold/30"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }
            `}
          >
            <span className="mr-1.5">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Page links */}
      <nav className="flex items-center gap-1">
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href}
            className="px-2 py-1.5 rounded-lg text-[10px] font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
            <span className="mr-0.5">{link.icon}</span>
            <span className="hidden sm:inline">{link.label}</span>
          </a>
        ))}
      </nav>
    </header>
  )
}
