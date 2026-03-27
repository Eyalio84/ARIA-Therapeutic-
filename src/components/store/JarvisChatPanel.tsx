"use client"

import { useState, useRef, useEffect } from "react"
import { useSdkStore } from "@/store/sdk"

const BACKEND = process.env.NEXT_PUBLIC_ARIA_BACKEND ?? "http://localhost:8000"

interface Message {
  role: "user" | "aria"
  text: string
}

interface Props {
  onClose: () => void
  onStatusChange: (s: "idle" | "thinking") => void
}

export function JarvisChatPanel({ onClose, onStatusChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "aria", text: "Welcome! I'm Aria. What can I help you find today?" },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionId = useRef(`jarvis-${Date.now()}`)
  const setPersonaState = useSdkStore((s) => s.setPersonaState)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput("")
    setMessages((m) => [...m, { role: "user", text }])
    setIsLoading(true)
    onStatusChange("thinking")

    try {
      const history = messages.map((m) => ({ role: m.role === "aria" ? "assistant" : "user", content: m.text }))

      const res = await fetch(`${BACKEND}/api/aria/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversation_history: history.slice(-10),
          session_id: sessionId.current,
        }),
      })

      const data = await res.json()

      // Build response from KG context
      let ariaResponse = ""
      if (data.kg_context) {
        ariaResponse = data.kg_context
      } else {
        ariaResponse = "I'd be happy to help you explore our collection. What are you looking for?"
      }

      setMessages((m) => [...m, { role: "aria", text: ariaResponse }])

      // Sync persona state to SDK tab
      if (data.persona_state) {
        setPersonaState(data.persona_state)
      }
    } catch {
      setMessages((m) => [...m, { role: "aria", text: "I'm having trouble connecting right now. Please make sure the backend is running." }])
    } finally {
      setIsLoading(false)
      onStatusChange("idle")
    }
  }

  return (
    <div className="fixed bottom-24 right-4 w-80 max-w-[calc(100vw-2rem)] h-96 bg-[#0f0f14] border border-white/10 rounded-2xl z-50 flex flex-col overflow-hidden panel-up shadow-2xl shadow-gold/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLoading ? "bg-gold animate-pulse" : "bg-emerald-400"}`} />
          <span className="text-xs font-semibold text-gold">Aria</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/50 text-sm">✕</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              m.role === "user"
                ? "bg-gold/20 text-gold-light"
                : "bg-white/5 text-white/70"
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 px-3 py-2 rounded-xl">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                <div className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                <div className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/5 p-2.5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask Aria..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-gold/40"
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="px-3 py-2 bg-gold text-black text-xs font-semibold rounded-lg hover:bg-gold-light transition disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  )
}
