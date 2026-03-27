/**
 * useAriaBackend — React hook for Python backend integration.
 *
 * Provides:
 * - fetchPersonaState(): Get computed 4D persona state
 * - fetchSystemPrompt(): Get system prompt with 4D + NAI injection
 * - validateResponse(): Check response against 4D state
 * - searchProducts(): NAI-powered product search
 *
 * The backend handles:
 * - NAI IntentGraph search over the jewelry KG
 * - 4D Persona computation (emotional, relational, linguistic, temporal)
 * - Introspection validation (anti-injection guardrail)
 */

import { useCallback, useRef, useState } from "react"

const BACKEND_URL = process.env.NEXT_PUBLIC_ARIA_BACKEND ?? "http://localhost:8000"

interface PersonaState {
  x: { mood: string; value: number; intensity: number; reason: string }
  y: { activated: boolean; relation_type: string | null; target: string | null }
  z: { dialect: string; distinctiveness: number }
  t: { step: number; memory: string[] }
  derived: { intensity: number; stability: number; authenticity: number }
}

interface RespondResult {
  system_prompt: string
  persona_state: PersonaState
  kg_results: { results: Array<{ id: string; name: string; description: string; score: number; price?: number }>; intent: string }
  kg_context: string
  intent: string
  methods: string[]
}

interface ValidationResult {
  valid: boolean
  score: number
  recommendation: "pass" | "warn" | "block"
  deviations: Array<{ type: string; severity: string; detail: string }>
}

async function backendPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Backend ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

export function useAriaBackend() {
  const sessionIdRef = useRef(`session-${Date.now()}`)
  const [personaState, setPersonaState] = useState<PersonaState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const historyRef = useRef<Array<{ role: string; content: string }>>([])

  /**
   * Fetch complete response context — system prompt with 4D + NAI.
   * Call this BEFORE connecting to Gemini Live to inject the context.
   */
  const fetchResponseContext = useCallback(async (userMessage: string): Promise<RespondResult> => {
    setIsLoading(true)
    try {
      historyRef.current.push({ role: "user", content: userMessage })

      const result = await backendPost<RespondResult>("/api/aria/respond", {
        message: userMessage,
        conversation_history: historyRef.current.slice(-10),
        session_id: sessionIdRef.current,
      })

      setPersonaState(result.persona_state)
      return result
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Validate a response AFTER generation, BEFORE sending to user.
   */
  const validateResponse = useCallback(async (response: string): Promise<ValidationResult> => {
    const result = await backendPost<ValidationResult>("/api/aria/validate", {
      response,
      persona_state: personaState,
    })
    return result
  }, [personaState])

  /**
   * Record assistant response in history.
   */
  const recordResponse = useCallback((assistantMessage: string) => {
    historyRef.current.push({ role: "assistant", content: assistantMessage })
  }, [])

  /**
   * Check backend health.
   */
  const checkHealth = useCallback(async () => {
    const res = await fetch(`${BACKEND_URL}/api/aria/health`)
    return res.json()
  }, [])

  return {
    fetchResponseContext,
    validateResponse,
    recordResponse,
    checkHealth,
    personaState,
    isLoading,
    sessionId: sessionIdRef.current,
  }
}
