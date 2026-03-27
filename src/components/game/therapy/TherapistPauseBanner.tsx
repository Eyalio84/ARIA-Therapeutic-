"use client"

interface TherapistPauseBannerProps {
  message: string
}

/**
 * Banner shown when therapist has paused the game session.
 * Polls /api/dashboard/user/{id}/controls for pause state.
 */
export function TherapistPauseBanner({ message }: TherapistPauseBannerProps) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 10000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(8px)",
    }}>
      <div className="glass-strong" style={{
        padding: "2rem",
        borderRadius: "1rem",
        textAlign: "center",
        maxWidth: "20rem",
        border: "1px solid rgba(201,169,110,0.2)",
      }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{"\u23f8\ufe0f"}</div>
        <p style={{ color: "#e4e4e7", fontSize: "0.95rem", marginBottom: "0.5rem" }}>
          Session Paused
        </p>
        <p style={{ color: "#a1a1aa", fontSize: "0.8rem" }}>
          {message || "Your therapist has paused the session. It will resume when they're ready."}
        </p>
      </div>
    </div>
  )
}
