"use client"

import { useEffect, useState } from "react"
import { useChatStore } from "@/store/chat"
import { ariaSwitchContext, ariaSwitchVoice } from "@/lib/aria"
import { PersonaLoader } from "@/components/PersonaLoader"
import type { AriaPersonaJSON } from "@/lib/aria-core/persona/cartridgeTypes"

const VOICES = ["Aoede", "Charon", "Fenrir", "Kore", "Puck", "Schedar", "Leda", "Orus"]

const CONTEXTS = [
  { id: "personal", label: "Personal", desc: "Your personal assistant" },
]

const SLASH_COMMANDS = [
  { cmd: "/connect",    desc: "Connect to Aria" },
  { cmd: "/disconnect", desc: "Disconnect" },
  { cmd: "/clear",      desc: "Clear messages" },
  { cmd: "/status",     desc: "Show status" },
  { cmd: "/mic",        desc: "Toggle mic" },
]

interface ConfigDrawerProps {
  open: boolean
  onClose: () => void
}

export function ConfigDrawer({ open, onClose }: ConfigDrawerProps) {
  const [visible, setVisible] = useState(false)
  const [animClass, setAnimClass] = useState("")
  const { activeContext, activeVoice } = useChatStore()

  useEffect(() => {
    if (open) {
      setVisible(true)
      setAnimClass("drawer-open")
    } else if (visible) {
      setAnimClass("drawer-close")
      const t = setTimeout(() => setVisible(false), 220)
      return () => clearTimeout(t)
    }
  }, [open, visible])

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        style={{ zIndex: 40 }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`glass-strong fixed top-0 right-0 h-full w-80 max-w-[85vw] flex flex-col ${animClass}`}
        style={{ zIndex: 50 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/8">
          <span className="text-sm font-semibold text-zinc-200">Settings</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/8 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* Persona */}
          <section>
            <p className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3">Persona</p>
            <PersonaLoader
              onPersonaLoaded={(_json: AriaPersonaJSON) => {
                // Persona is now in localStorage. User must reconnect to apply.
                void ariaSwitchContext("personal")
              }}
              onPersonaCleared={() => {
                void ariaSwitchContext("personal")
              }}
            />
          </section>

          {/* Context */}
          <section>
            <p className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3">Context</p>
            <div className="space-y-1.5">
              {CONTEXTS.map((ctx) => (
                <button
                  key={ctx.id}
                  onClick={() => void ariaSwitchContext(ctx.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors ${
                    activeContext === ctx.id
                      ? "bg-violet-500/20 border border-violet-500/30 text-violet-200"
                      : "hover:bg-white/6 text-zinc-300 border border-transparent"
                  }`}
                >
                  <span className="text-sm font-medium">{ctx.label}</span>
                  <span className="text-xs text-zinc-500 ml-auto">{ctx.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Voice */}
          <section>
            <p className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3">Voice</p>
            <div className="grid grid-cols-2 gap-2">
              {VOICES.map((v) => (
                <button
                  key={v}
                  onClick={() => void ariaSwitchVoice(v)}
                  className={`px-3 py-2 rounded-xl text-sm transition-colors ${
                    activeVoice === v
                      ? "bg-violet-500/20 border border-violet-500/30 text-violet-200"
                      : "glass text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </section>

          {/* Slash commands */}
          <section>
            <p className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3">Slash Commands</p>
            <div className="space-y-1">
              {SLASH_COMMANDS.map(({ cmd, desc }) => (
                <div key={cmd} className="flex items-center justify-between py-1.5">
                  <code className="text-xs text-violet-300 font-mono">{cmd}</code>
                  <span className="text-xs text-zinc-500">{desc}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
