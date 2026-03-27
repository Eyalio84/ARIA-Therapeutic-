/**
 * Persona contracts — personality as data, not hardcoded strings.
 */

/** Silence rule: how verbose Aria should be after executing a command */
export type SilenceLevel = "silent" | "brief" | "normal" | "verbose"

/** Voice configuration */
export interface VoiceConfig {
  name: string
  sampleRate?: number
}

/** Response style guidelines */
export interface ResponseStyle {
  maxSentences: number
  tone: string
}

/** A changelog entry describing a capability */
export interface ChangelogEntry {
  date: string
  version: string
  capability: string
  description: string
}

/** Context-specific greeting instructions */
export type GreetingMap = Record<string, string>

/** Full persona configuration */
export interface PersonaConfig {
  name: string
  voice: VoiceConfig
  personality: string
  responseStyle: ResponseStyle
  silenceRules: Record<string, SilenceLevel>
  greetings: GreetingMap
  changelog: ChangelogEntry[]
}
