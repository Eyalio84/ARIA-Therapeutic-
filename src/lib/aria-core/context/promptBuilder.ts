/**
 * PromptBuilder — assembles system prompts from persona + context + injectors.
 *
 * Build order (priority ascending = earlier):
 *   1. Base personality text         (always first)
 *   2. Context-specific opening      (from ContextDefinition.greeting)
 *   3. Context suffix                (from ContextDefinition.systemPromptSuffix)
 *   4. Available functions list      (silent rules + capabilities)
 *   5. Injected state (context injectors, sorted by priority)
 *   6. Response guidelines
 */

import type { PersonaConfig, SilenceLevel } from "../types/persona"
import type { ContextDefinition, ContextInjector } from "../types/context"

const SILENCE_RULE_TEXT: Record<SilenceLevel, string> = {
  silent:  "execute silently. Say NOTHING.",
  brief:   "respond with one brief confirmation sentence only.",
  normal:  "respond naturally in 1-3 sentences.",
  verbose: "respond with a full explanation.",
}

export class PromptBuilder {
  build(
    persona: PersonaConfig,
    context: ContextDefinition,
    hostState: Record<string, unknown> = {},
    extraInjectors: ContextInjector[] = [],
  ): string {
    const parts: string[] = []

    // 1. Base personality
    parts.push(persona.personality)

    // 2. Context-specific greeting instructions
    const contextGreeting = persona.greetings[context.id] ?? persona.greetings["default"]
    if (contextGreeting) parts.push(contextGreeting)

    // 3. Context suffix
    if (context.systemPromptSuffix) parts.push(context.systemPromptSuffix)

    // 4. Silence rules — only emit rules that are relevant to available functions
    const availableNames = new Set(context.functions.map((f) => f.name))
    const silenceRules = Object.entries(persona.silenceRules)
      .filter(([name]) => availableNames.has(name))
      .map(([name, level]) => `- ${name}: ${SILENCE_RULE_TEXT[level]}`)

    if (silenceRules.length > 0) {
      parts.push(`\nSTRICT SILENCE RULES — follow exactly:\n${silenceRules.join("\n")}`)
    }

    // 5. Context injectors (sorted by priority, lowest first)
    const allInjectors = [
      ...(context.injectors ?? []),
      ...extraInjectors,
    ].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))

    for (const injector of allInjectors) {
      const text = injector.inject(context.id, hostState)
      if (text) parts.push(text)
    }

    // 6. Response guidelines
    parts.push(
      `\nVoice style: concise (1-${persona.responseStyle.maxSentences} sentences), ${persona.responseStyle.tone} — never robotic.`,
    )

    return parts.filter(Boolean).join("\n\n")
  }
}
