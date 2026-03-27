/**
 * ContextEngine — manages active context, available commands, injector pipeline.
 *
 * The engine holds the registry of available contexts and the currently active one.
 * Switching context triggers a system prompt rebuild via PromptBuilder.
 */

import type { ContextDefinition, ContextInjector } from "../types/context"
import type { PersonaConfig } from "../types/persona"
import type { FunctionDeclaration } from "../types/provider"
import { PromptBuilder } from "./promptBuilder"

export class ContextEngine {
  private _contexts = new Map<string, ContextDefinition>()
  private _activeId = "default"
  private _globalInjectors: ContextInjector[] = []
  private _promptBuilder = new PromptBuilder()

  /** Register a context definition */
  register(context: ContextDefinition): void {
    this._contexts.set(context.id, context)
  }

  /** Register multiple contexts at once */
  registerAll(contexts: ContextDefinition[]): void {
    for (const c of contexts) this.register(c)
  }

  /** Switch active context */
  setActive(contextId: string): void {
    if (!this._contexts.has(contextId)) {
      throw new Error(`Unknown context: "${contextId}". Register it first.`)
    }
    this._activeId = contextId
  }

  /** Get the active context definition */
  getActive(): ContextDefinition {
    const ctx = this._contexts.get(this._activeId)
    if (!ctx) throw new Error(`No active context "${this._activeId}"`)
    return ctx
  }

  /** Add a global injector (runs in all contexts) */
  addGlobalInjector(injector: ContextInjector): void {
    this._globalInjectors.push(injector)
  }

  /** Get all functions available in the current context */
  getActiveFunctions(): FunctionDeclaration[] {
    return this.getActive().functions
  }

  /** Build the full system prompt for the current context */
  buildSystemPrompt(
    persona: PersonaConfig,
    hostState: Record<string, unknown> = {},
  ): string {
    return this._promptBuilder.build(
      persona,
      this.getActive(),
      hostState,
      this._globalInjectors,
    )
  }

  get activeContextId(): string {
    return this._activeId
  }

  get registeredContextIds(): string[] {
    return Array.from(this._contexts.keys())
  }
}
