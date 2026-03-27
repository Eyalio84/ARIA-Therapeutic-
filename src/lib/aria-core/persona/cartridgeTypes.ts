/**
 * AriaPersonaJSON — the portable .aria.json cartridge format.
 *
 * This is the *authored* format: human-friendly keys, flat structure, designed
 * for editing in any text editor. It is distinct from PersonaConfig, which is
 * the internal runtime representation consumed by AriaCore.
 *
 * personaFromCartridge() converts between the two at load time.
 */

export interface AriaPersonaJSON {
  /** Schema version — must be "aria-persona/1.0" */
  $schema: "aria-persona/1.0"

  /** Display name for this persona */
  name: string

  identity: {
    /** Base system prompt text — Aria's core personality */
    personality: string

    /**
     * Gemini voice name.
     * Options: Aoede | Charon | Fenrir | Kore | Puck | Schedar | Leda | Orus
     */
    voice: string

    greetings: {
      /** Used on first open or when no recent session exists */
      default: string
      /**
       * Used when auto-resuming a session within 24h.
       * May contain {{last_topic}} — replaced with session summary first sentence.
       */
      returning: string
      /** Optional per-project greeting override */
      project?: string
    }
  }

  /**
   * Enabled command names for this persona.
   * Empty array = all registered commands are available.
   * Unknown names are silently ignored at connect time.
   */
  tools: string[]

  rules: {
    /**
     * Command names that execute silently (no spoken response).
     * Maps to silenceRules Record<string, "silent"> in PersonaConfig.
     */
    silence: string[]
    responseMaxSentences: number
    tone: "warm" | "professional" | "casual" | "direct" | "terse"
    /** BCP-47 language tag, e.g. "en", "he", "fr" */
    language: string
  }

  domain: {
    /**
     * Static facts injected into the system prompt.
     * Each string becomes a bullet in the personality block.
     */
    facts: string[]
    /** Optional FAQ pairs — injected as Q&A lines in the personality block */
    faq?: Array<{ q: string; a: string }>
    /** Optional free-form domain paragraph appended after facts */
    context?: string
  }

  changelog?: Array<{
    date: string
    version: string
    capability: string
    description: string
  }>
}
