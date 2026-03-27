/**
 * Context contracts — dynamic system prompt assembly.
 */

import type { FunctionDeclaration } from "./provider"

/** Injects dynamic content into the system prompt at build time */
export interface ContextInjector {
  /** Unique identifier */
  id: string
  /** Priority (lower = earlier in prompt). Default: 100 */
  priority?: number
  /** Return prompt text to inject, or null to skip */
  inject: (contextId: string, hostState: Record<string, unknown>) => string | null
}

/** Definition of a named context (e.g. "platform", "template", "member") */
export interface ContextDefinition {
  /** Unique context identifier */
  id: string
  /** Human-readable label */
  label: string
  /** Functions available in this context */
  functions: FunctionDeclaration[]
  /** Opening/greeting instructions for this context */
  greeting?: string
  /** Additional system prompt text specific to this context */
  systemPromptSuffix?: string
  /** Injectors that provide dynamic state */
  injectors?: ContextInjector[]
}
