"use client"

import { useRef, useEffect } from "react"
import { useDevLogStore } from "@/store/devLog"
import type { DevLogEntry } from "@/store/devLog"

const LEVEL_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  error: { label: "ERR", color: "#e07a7a", bg: "rgba(224,122,122,0.08)" },
  warn:  { label: "WRN", color: "#e0c07a", bg: "rgba(224,192,122,0.06)" },
  info:  { label: "INF", color: "#7ab8e0", bg: "rgba(122,184,224,0.06)" },
  debug: { label: "DBG", color: "#7a7a7a", bg: "rgba(122,122,122,0.04)" },
}

function LogEntry({ entry }: { entry: DevLogEntry }) {
  const s = LEVEL_STYLES[entry.level] || LEVEL_STYLES.debug
  return (
    <div className="mb-1 font-mono text-[11px] leading-snug" style={{ background: s.bg, padding: "3px 8px", borderRadius: "4px" }}>
      <span className="opacity-50">{new Date(entry.timestamp).toLocaleTimeString()}</span>
      {" "}
      <span style={{ color: s.color }} className="font-bold">[{s.label}]</span>
      {" "}
      <span className="text-[#9a9690]">{entry.source}:</span>
      {" "}
      <span className="text-[#c8c8c8]">{entry.message}</span>
      {entry.data != null && (
        <div className="text-[10px] text-[#5a5854] ml-4 mt-0.5 break-all">
          {typeof entry.data === "string" ? entry.data : JSON.stringify(entry.data as Record<string, unknown>).slice(0, 200)}
        </div>
      )}
    </div>
  )
}

export default function DevPanel() {
  const { entries, isOpen, toggle, clear } = useDevLogStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [entries.length])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[160] bg-[#07070f] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-[#e07a7a] font-bold">Dev Panel</span>
          <span className="font-mono text-[10px] text-[#5a5854]">{entries.length} entries</span>
        </div>
        <div className="flex gap-2">
          <button onClick={clear} className="font-mono text-[10px] px-2 py-1 rounded border border-white/[0.08] text-[#9a9690] hover:text-[#e07a7a] hover:border-[#e07a7a]/30 transition-colors">
            Clear
          </button>
          <button onClick={toggle} className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-[#9a9690] text-lg hover:border-[#e07a7a] hover:text-[#e07a7a] transition-colors">
            x
          </button>
        </div>
      </div>

      {/* Log */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 scroll-smooth">
        {entries.length === 0 ? (
          <div className="text-center text-[#5a5854] font-mono text-xs mt-8">No log entries yet.</div>
        ) : (
          entries.map((e) => <LogEntry key={e.id} entry={e} />)
        )}
      </div>

      {/* Footer — future: filters, config tabs */}
      <div className="px-4 py-2 border-t border-white/[0.06] shrink-0 font-mono text-[9px] text-[#5a5854] flex gap-4">
        <span>Future: Filters | Config | KG Studio | Aria Personas</span>
      </div>
    </div>
  )
}
