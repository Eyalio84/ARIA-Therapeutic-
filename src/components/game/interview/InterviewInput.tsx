"use client"

import { useRef, useCallback } from "react"

interface Props {
  exitRamp?: string
  onSubmit: (answer: string) => void
  onExitRamp: () => void
}

export default function InterviewInput({ exitRamp, onSubmit, onExitRamp }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    const val = inputRef.current?.value.trim()
    if (!val) return
    onSubmit(val)
    if (inputRef.current) {
      inputRef.current.value = ""
      inputRef.current.style.height = "auto"
    }
  }, [onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const autoGrow = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }, [])

  return (
    <div className="p-4 border-t border-white/[0.04] shrink-0 bg-[var(--bg-mid,#12121a)]">
      {exitRamp && (
        <div
          onClick={onExitRamp}
          className="text-[13px] text-[var(--text-dim,#5a5854)] italic mb-2 px-3 py-2 bg-white/[0.02] rounded-lg cursor-pointer hover:text-[var(--text-secondary,#9a9690)] transition-colors"
        >
          {exitRamp}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          className="flex-1 bg-[var(--bg-surface,#1a1a26)] border border-white/[0.06] rounded-xl px-4 py-3 text-[var(--text-primary,#e8e4dc)] text-[15px] resize-none min-h-[44px] max-h-[120px] leading-snug outline-none focus:border-[var(--gold,#c9a84c)]/25 transition-colors overflow-y-hidden"
          placeholder="Type your answer..."
          rows={1}
          onKeyDown={handleKeyDown}
          onInput={(e) => autoGrow(e.currentTarget)}
        />
        <button
          onClick={handleSubmit}
          className="w-11 h-11 bg-[var(--gold,#c9a84c)] rounded-xl flex items-center justify-center shrink-0 hover:bg-[var(--gold-light,#e4cc7a)] transition-colors"
        >
          <svg className="w-[18px] h-[18px] fill-[var(--bg-deep,#0a0a0f)]" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
