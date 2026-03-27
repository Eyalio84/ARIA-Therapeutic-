"use client"

import { useState, useEffect } from "react"

interface AchievementToastProps {
  achievement: { id: string; title: string; description: string } | null
  onDone: () => void
}

/**
 * Achievement toast notification — slides up from bottom, auto-dismisses.
 * Triggered when game_kg_bridge awards a new achievement during gameplay.
 */
export function AchievementToast({ achievement, onDone }: AchievementToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (achievement) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(onDone, 300) // wait for exit animation
      }, 3500)
      return () => clearTimeout(timer)
    }
  }, [achievement, onDone])

  if (!achievement) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: visible ? "1.5rem" : "-5rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        transition: "bottom 0.3s cubic-bezier(0.32,0,0.15,1)",
        pointerEvents: "none",
      }}
    >
      <div className="glass-strong glow-gold" style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1.25rem",
        borderRadius: "1rem",
        border: "1px solid rgba(201,169,110,0.3)",
        minWidth: "200px",
      }}>
        <span style={{ fontSize: "1.5rem" }}>{"\u2b50"}</span>
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#c9a96e" }}>
            {achievement.title}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#a1a1aa" }}>
            {achievement.description}
          </div>
        </div>
      </div>
    </div>
  )
}
