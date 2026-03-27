/**
 * Zod schema for PersonaConfig validation.
 * Validates persona data at load time to catch config errors early.
 */

import { z } from "zod"

export const voiceConfigSchema = z.object({
  name: z.string().min(1),
  sampleRate: z.number().optional(),
})

export const responseStyleSchema = z.object({
  maxSentences: z.number().min(1).max(10),
  tone: z.string().min(1),
})

export const changelogEntrySchema = z.object({
  date: z.string(),
  version: z.string(),
  capability: z.string(),
  description: z.string(),
})

export const personaSchema = z.object({
  name: z.string().min(1),
  voice: voiceConfigSchema,
  personality: z.string().min(10),
  responseStyle: responseStyleSchema,
  silenceRules: z.record(z.string(), z.enum(["silent", "brief", "normal", "verbose"])),
  greetings: z.record(z.string(), z.string()),
  changelog: z.array(changelogEntrySchema),
})

export type ValidatedPersonaConfig = z.infer<typeof personaSchema>
