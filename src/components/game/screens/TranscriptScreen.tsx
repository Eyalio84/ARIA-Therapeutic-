"use client"

import { useCallback } from "react"
import { useTranscriptStore } from "@/store/transcript"
import { useGameStore } from "@/store/game"
import TranscriptHeader from "../transcript/TranscriptHeader"
import TranscriptLegend from "../transcript/TranscriptLegend"
import TranscriptLog from "../transcript/TranscriptLog"
import TranscriptFooter from "../transcript/TranscriptFooter"

export default function TranscriptScreen() {
  const { entries, isOpen, toggle, clear, exportJSON } = useTranscriptStore()
  const { gameConfig, userId } = useGameStore()

  const handleExport = useCallback(() => {
    const json = exportJSON(gameConfig, userId)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `aria-transcript-${userId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [exportJSON, gameConfig, userId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] bg-[var(--bg-deep,#0a0a0f)] flex flex-col">
      <TranscriptHeader onClose={toggle} />
      <TranscriptLegend />
      <TranscriptLog entries={entries} />
      <TranscriptFooter onExport={handleExport} onClear={clear} />
    </div>
  )
}
