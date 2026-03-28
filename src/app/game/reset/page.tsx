"use client"

import { useEffect } from "react"

export default function ResetGame() {
  useEffect(() => {
    localStorage.removeItem("aria-game-state")
    window.location.href = "/game"
  }, [])

  return <p style={{ color: "#999", padding: 40 }}>Resetting...</p>
}
