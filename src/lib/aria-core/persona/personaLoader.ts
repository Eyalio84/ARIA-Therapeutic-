/**
 * Persona loader — validates and merges PersonaConfig objects.
 */

import type { PersonaConfig } from "../types/persona"
import { personaSchema } from "./personaSchema"

/** Load and validate a persona config. Throws if invalid. */
export function loadPersona(config: PersonaConfig): PersonaConfig {
  return personaSchema.parse(config)
}

/** Merge context-specific overrides into a base persona */
export function mergePersonaOverrides(
  base: PersonaConfig,
  overrides: Partial<PersonaConfig>,
): PersonaConfig {
  return {
    ...base,
    ...overrides,
    voice: { ...base.voice, ...overrides.voice },
    responseStyle: { ...base.responseStyle, ...overrides.responseStyle },
    silenceRules: { ...base.silenceRules, ...overrides.silenceRules },
    greetings: { ...base.greetings, ...overrides.greetings },
    changelog: overrides.changelog ?? base.changelog,
  }
}
