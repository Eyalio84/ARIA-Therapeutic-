"use client"

import { useState } from "react"
import { useChatStore } from "@/store/chat"
import { ariaConnect, ariaDisconnect, ariaSwitchContext, ariaSwitchVoice } from "@/lib/aria"
import { personalPersona } from "@/lib/persona"

const VOICES = ["Aoede", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Zephyr"]
const CONTEXTS = ["personal"]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors"
      >
        {title}
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  )
}

export function ConfigPanel() {
  const { status, isConnected, activeContext, activeVoice, isMicActive } = useChatStore()

  return (
    <div className="w-64 flex-shrink-0 bg-panel border-r border-border flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-aria-dim flex items-center justify-center">
            <span className="text-aria text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-zinc-100">Aria</span>
        </div>
        <p className="text-xs text-zinc-600 mt-1">Personal assistant · aria-core v1.0</p>
      </div>

      {/* Connection */}
      <Section title="Connection">
        <Row label="Status">
          <span className={`text-xs font-mono ${
            isConnected ? "text-green-400" : status === "connecting" ? "text-yellow-400" : "text-zinc-600"
          }`}>
            {status}
          </span>
        </Row>
        <Row label="Mic">
          <span className={`text-xs font-mono ${isMicActive ? "text-green-400" : "text-zinc-600"}`}>
            {isMicActive ? "active" : "off"}
          </span>
        </Row>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => void ariaConnect()}
            disabled={isConnected}
            className="flex-1 text-xs py-1.5 rounded-lg bg-aria disabled:bg-aria-dim disabled:opacity-50 text-white font-medium hover:opacity-90 transition-opacity"
          >
            Connect
          </button>
          <button
            type="button"
            onClick={ariaDisconnect}
            disabled={!isConnected}
            className="flex-1 text-xs py-1.5 rounded-lg bg-zinc-800 disabled:opacity-30 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </Section>

      {/* Context */}
      <Section title="Context">
        <Row label="Active">
          <span className="text-xs font-mono text-aria">{activeContext}</span>
        </Row>
        <div className="space-y-1 mt-1">
          {CONTEXTS.map((ctx) => (
            <button
              key={ctx}
              type="button"
              onClick={() => void ariaSwitchContext(ctx)}
              className={`w-full text-left text-xs px-3 py-1.5 rounded-lg transition-colors ${
                activeContext === ctx
                  ? "bg-aria-dim text-aria"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {ctx}
            </button>
          ))}
        </div>
      </Section>

      {/* Voice */}
      <Section title="Voice">
        <Row label="Current">
          <span className="text-xs font-mono text-zinc-300">{activeVoice}</span>
        </Row>
        <div className="grid grid-cols-2 gap-1 mt-1">
          {VOICES.map((voice) => (
            <button
              key={voice}
              type="button"
              onClick={() => void ariaSwitchVoice(voice)}
              className={`text-xs px-2 py-1.5 rounded-lg transition-colors ${
                activeVoice === voice
                  ? "bg-aria-dim text-aria"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {voice}
            </button>
          ))}
        </div>
      </Section>

      {/* Persona */}
      <Section title="Persona">
        <div className="space-y-2">
          <Row label="Name"><span className="text-xs text-zinc-300 font-mono">{personalPersona.name}</span></Row>
          <Row label="Tone"><span className="text-xs text-zinc-300 font-mono">{personalPersona.responseStyle.tone}</span></Row>
          <Row label="Max sentences"><span className="text-xs text-zinc-300 font-mono">{personalPersona.responseStyle.maxSentences}</span></Row>
        </div>
        <div className="mt-2 p-2 bg-zinc-900 rounded-lg">
          <p className="text-xs text-zinc-600 leading-relaxed line-clamp-4">
            {personalPersona.personality.split("\n")[0]}
          </p>
        </div>
      </Section>

      {/* Slash commands reference */}
      <Section title="Slash Commands">
        <div className="space-y-1.5">
          {["/connect", "/disconnect", "/clear", "/status", "/context", "/voice", "/mic", "/persona"].map((cmd) => (
            <div key={cmd} className="text-xs font-mono text-zinc-500">
              <span className="text-aria">{cmd}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
