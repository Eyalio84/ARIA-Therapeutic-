"use client"

import { useRef, useCallback } from "react"
import { useAriaModeStore } from "@/store/ariaMode"

interface SlashResult {
  handled: boolean
  response?: string
}

interface Props {
  onSubmit: (command: string) => void
  onSlash: (command: string, args: string) => SlashResult
}

export default function GameInput({ onSubmit, onSlash }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mode = useAriaModeStore((s) => s.mode)

  const handleSubmit = useCallback(() => {
    const val = inputRef.current?.value.trim()
    if (!val) return

    // Slash command detection
    if (val.startsWith("/")) {
      const parts = val.slice(1).split(" ")
      const cmd = parts[0].toLowerCase()
      const args = parts.slice(1).join(" ")
      const result = onSlash(cmd, args)
      if (result.handled) {
        if (inputRef.current) { inputRef.current.value = ""; inputRef.current.style.height = "auto" }
        return
      }
    }

    onSubmit(val)
    if (inputRef.current) {
      inputRef.current.value = ""
      inputRef.current.style.height = "auto"
    }
  }, [onSubmit, onSlash])

  const placeholder = mode === "su"
    ? "Ask Aria anything... /aria-game to resume"
    : "Type a command or tap an action above..."

  return (
    <div className="p-4 border-t border-white/[0.04] bg-[var(--bg-mid,#12121a)] shrink-0">
      {mode === "su" && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-[#c49ef0]/[0.06] border border-[#c49ef0]/20">
          <span className="font-mono text-[9px] text-[#c49ef0]">SUPER USER MODE</span>
          <span className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] ml-2">Type /aria-game or say &quot;back to game&quot; to resume</span>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          className="flex-1 bg-[var(--bg-surface,#1a1a26)] border border-white/[0.06] rounded-xl px-4 py-3 text-[var(--text-primary,#e8e4dc)] text-[15px] resize-none min-h-[44px] max-h-[120px] leading-snug outline-none focus:border-[var(--gold,#c9a84c)]/25 transition-colors overflow-y-hidden font-mono"
          placeholder={placeholder}
          rows={1}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
          onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px" }}
        />
        <button
          onClick={handleSubmit}
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${mode === "su" ? "bg-[#c49ef0] hover:bg-[#d4b8f0]" : "bg-[var(--gold,#c9a84c)] hover:bg-[var(--gold-light,#e4cc7a)]"}`}
        >
          <svg className="w-[18px] h-[18px] fill-[var(--bg-deep,#0a0a0f)]" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
