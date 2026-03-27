/**
 * Zod schema for AriaPersonaJSON validation.
 * Used by validateCartridge() to give readable errors at load time.
 */

import { z } from "zod"

const VALID_VOICES = ["Aoede", "Charon", "Fenrir", "Kore", "Puck", "Schedar", "Leda", "Orus"] as const

export const cartridgeSchema = z.object({
  $schema: z.literal("aria-persona/1.0"),
  name: z.string().min(1),

  identity: z.object({
    personality: z.string().min(10),
    voice: z.enum(VALID_VOICES),
    greetings: z.object({
      default:   z.string().min(1),
      returning: z.string().min(1),
      project:   z.string().optional(),
    }),
  }),

  tools: z.array(z.string().min(1)),

  rules: z.object({
    silence:              z.array(z.string().min(1)),
    responseMaxSentences: z.number().int().min(1).max(10),
    tone:                 z.enum(["warm", "professional", "casual", "direct", "terse"]),
    language:             z.string().min(2),
  }),

  domain: z.object({
    facts:   z.array(z.string().min(1)),
    faq:     z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).optional(),
    context: z.string().optional(),
  }),

  changelog: z.array(z.object({
    date:        z.string(),
    version:     z.string(),
    capability:  z.string(),
    description: z.string(),
  })).optional(),
})
