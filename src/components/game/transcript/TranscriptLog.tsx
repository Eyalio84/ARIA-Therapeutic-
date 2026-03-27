"use client"

import { useRef, useEffect } from "react"
import TranscriptEntryComponent from "./TranscriptEntry"
import type { TranscriptEntry } from "@/types/game"

interface Props {
  entries: TranscriptEntry[]
}

export default function TranscriptLog({ entries }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
      {entries.length === 0 ? (
        <div className="text-center text-[var(--text-dim,#5a5854)] font-mono text-xs mt-8">
          No transcript entries yet. Start playing to see the log.
        </div>
      ) : (
        entries.map((e) => <TranscriptEntryComponent key={e.id} entry={e} />)
      )}
    </div>
  )
}
