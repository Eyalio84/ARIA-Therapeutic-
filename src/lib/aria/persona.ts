/**
 * PersonaConfig — defines who Aria is in a given context.
 *
 * Aria is the platform. Personas are the personalities that run on it.
 * A game narrator, a therapist, a Jarvis-style assistant, a coding helper —
 * all are personas. The engine doesn't care which one is loaded.
 */

import type { FunctionDeclaration, FunctionCall } from "../aria-core/types/provider"

export interface PersonaConfig {
  /** Unique identifier: "aria-su", "game-maya", "therapist", etc. */
  id: string

  /** Display name shown in UI */
  name: string

  /** System prompt — static string or dynamic builder (called fresh on each connect) */
  systemPrompt: string | (() => string)

  /** Function declarations this persona can execute */
  functions: FunctionDeclaration[]

  /** Gemini voice name */
  voice: string

  /**
   * Handle a function call from Gemini.
   * Returns a JSON-serializable result that Gemini will narrate.
   * If null, falls through to default handling.
   */
  onFunctionCall: (fc: FunctionCall) => Promise<Record<string, unknown> | null>

  /** UI behavior mode */
  mode: "game" | "su" | "app"
}

/** Registry of available personas */
const _personas = new Map<string, PersonaConfig>()

export function registerPersona(persona: PersonaConfig): void {
  _personas.set(persona.id, persona)
}

export function getPersona(id: string): PersonaConfig | undefined {
  return _personas.get(id)
}

export function listPersonas(): PersonaConfig[] {
  return Array.from(_personas.values())
}

export function clearPersonas(): void {
  _personas.clear()
}
