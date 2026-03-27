"use client"

import { useState, useRef, useCallback } from "react"
import { JarvisChatPanel } from "./JarvisChatPanel"

export function JarvisOrb() {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<"idle" | "thinking">("idle")

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <JarvisChatPanel
          onClose={() => setIsOpen(false)}
          onStatusChange={setStatus}
        />
      )}

      {/* Orb */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full z-50 flex items-center justify-center transition-all
          ${isOpen ? "bg-white/10 border border-white/20" : "glow-gold"}
          ${status === "thinking" ? "animate-pulse" : ""}
        `}
        style={{
          background: isOpen
            ? "rgba(255,255,255,0.06)"
            : "linear-gradient(135deg, #e0c080 0%, #c9a96e 40%, #a07840 70%, #c9a96e 100%)",
        }}
      >
        {/* Pulse rings when idle */}
        {!isOpen && status === "idle" && (
          <>
            <span className="absolute inset-0 rounded-full border border-gold/30 orb-ring" />
            <span className="absolute inset-0 rounded-full border border-gold/20 orb-ring-delay" />
          </>
        )}

        {/* Icon */}
        {isOpen ? (
          <span className="text-white/60 text-lg">✕</span>
        ) : (
          <span className="text-black text-lg">✦</span>
        )}
      </button>
    </>
  )
}
