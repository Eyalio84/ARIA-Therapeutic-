"use client"

import { useState, useRef, useCallback } from "react"
import { useChatStore } from "@/store/chat"
import { SlashMenu } from "./SlashMenu"
import { ariaConnect, ariaDisconnect, ariaSwitchContext, ariaSwitchVoice } from "@/lib/aria"

interface ChatInputProps {
  onSendText: (text: string) => void
  /** Return true if the command was handled externally (e.g. /snapshot opens a panel) */
  onSlashCommand?: (cmd: string) => boolean
}

export function ChatInput({ onSendText, onSlashCommand }: ChatInputProps) {
  const [value, setValue] = useState("")
  const [showSlash, setShowSlash] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { isConnected, isMicActive, addSystemMessage } = useChatStore()

  const handleSlashCommand = useCallback(async (raw: string) => {
    const parts = raw.trim().split(/\s+/)
    const cmd   = parts[0]?.toLowerCase() ?? ""
    const arg   = parts.slice(1).join(" ")

    // Let parent handle special slash commands first
    if (onSlashCommand?.(cmd)) return

    switch (cmd) {
      case "/connect":    await ariaConnect(); break
      case "/disconnect": ariaDisconnect(); break
      case "/clear":      useChatStore.getState().clearMessages(); break
      case "/status": {
        const s = useChatStore.getState()
        addSystemMessage(`status=${s.status} · context=${s.activeContext} · voice=${s.activeVoice}`)
        break
      }
      case "/context": arg ? await ariaSwitchContext(arg) : addSystemMessage("Usage: /context <id>"); break
      case "/voice":   arg ? await ariaSwitchVoice(arg)   : addSystemMessage("Usage: /voice <name>"); break
      case "/mic":     addSystemMessage(isMicActive ? "Mic active." : "Mic off (text mode)."); break
      default:         addSystemMessage(`Unknown command: ${cmd}`)
    }
  }, [isMicActive, addSystemMessage, onSlashCommand])

  const submit = useCallback(async () => {
    const text = value.trim()
    if (!text) return
    setValue("")
    setShowSlash(false)
    if (text.startsWith("/")) { await handleSlashCommand(text); return }
    if (!isConnected) { addSystemMessage("Not connected — tap the orb or type /connect."); return }
    onSendText(text)
  }, [value, isConnected, onSendText, handleSlashCommand, addSystemMessage])

  return (
    <div className="relative w-full">
      {showSlash && (
        <SlashMenu
          filter={value}
          onSelect={(t) => { setValue(t + " "); setShowSlash(false); inputRef.current?.focus() }}
        />
      )}
      <div className="glass-strong flex items-end gap-2 rounded-2xl px-4 py-3 focus-within:border-violet-500/40 transition-colors">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); setShowSlash(e.target.value.startsWith("/")) }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit() }
            if (e.key === "Escape") setShowSlash(false)
          }}
          placeholder={isConnected ? "Message Aria…" : "Tap orb or /connect"}
          rows={1}
          className="flex-1 bg-transparent text-zinc-200 text-sm resize-none outline-none placeholder:text-zinc-600 max-h-28 leading-relaxed"
          style={{ minHeight: "1.4rem" }}
        />
        <button
          onClick={() => void submit()}
          disabled={!value.trim()}
          className="text-violet-400 hover:text-violet-200 disabled:text-zinc-700 transition-colors flex-shrink-0 mb-0.5"
        >
          <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
