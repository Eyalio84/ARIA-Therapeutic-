/**
 * cartridgeLoader — converts AriaPersonaJSON → PersonaConfig.
 *
 * Three exports:
 *   validateCartridge  — parse unknown JSON, throw readable ZodError if invalid
 *   personaFromCartridge — convert validated cartridge to runtime PersonaConfig
 *   enabledTools       — return the tools Set for CommandRegistry filtering
 */

import type { PersonaConfig } from "../types/persona"
import type { AriaPersonaJSON } from "./cartridgeTypes"
import { cartridgeSchema } from "./cartridgeSchema"

// ── Public API ──────────────────────────────────────────────────────────────

/** Parse and validate unknown JSON as a cartridge. Throws ZodError if invalid. */
export function validateCartridge(json: unknown): AriaPersonaJSON {
  return cartridgeSchema.parse(json) as AriaPersonaJSON
}

/**
 * Convert a validated AriaPersonaJSON cartridge to the runtime PersonaConfig.
 *
 * Mapping:
 *   identity.personality + domain → personality (assembled block)
 *   identity.voice                → voice.name
 *   identity.greetings            → greetings record
 *   rules.silence[]               → silenceRules Record<string, "silent">
 *   rules.responseMaxSentences    → responseStyle.maxSentences
 *   rules.tone                    → responseStyle.tone
 *   changelog                     → changelog (fallback to [])
 *
 * Note: tools is NOT in PersonaConfig — use enabledTools() separately.
 */
export function personaFromCartridge(json: AriaPersonaJSON): PersonaConfig {
  return {
    name:        json.name,
    voice:       { name: json.identity.voice },
    personality: assemblePersonality(json),
    responseStyle: {
      maxSentences: json.rules.responseMaxSentences,
      tone:         json.rules.tone,
    },
    silenceRules: Object.fromEntries(
      json.rules.silence.map((cmd) => [cmd, "silent" as const]),
    ),
    greetings: {
      default:   json.identity.greetings.default,
      returning: json.identity.greetings.returning,
      ...(json.identity.greetings.project
        ? { project: json.identity.greetings.project }
        : {}),
    },
    changelog: json.changelog ?? [],
  }
}

/**
 * Return the set of enabled tool names for this persona.
 * Empty set means all registered commands are available.
 */
export function enabledTools(json: AriaPersonaJSON): Set<string> {
  return new Set(json.tools)
}

// ── Internal ────────────────────────────────────────────────────────────────

/**
 * Assemble the full personality string from identity.personality + domain.
 * Domain facts/faq/context are appended as a grounded knowledge block so they
 * sit in the prime context window position alongside the core personality.
 */
function assemblePersonality(json: AriaPersonaJSON): string {
  const parts: string[] = [json.identity.personality]

  const { facts, faq, context } = json.domain

  if (facts.length > 0 || faq?.length || context) {
    parts.push("\n[Domain knowledge]")

    for (const fact of facts) {
      parts.push(`• ${fact}`)
    }

    if (faq?.length) {
      for (const { q, a } of faq) {
        parts.push(`Q: ${q}\nA: ${a}`)
      }
    }

    if (context) {
      parts.push(context)
    }
  }

  return parts.join("\n")
}
