/**
 * CommandRegistry — replaces the 46-case switch statement.
 *
 * Host apps register handlers; the registry routes function calls to them.
 * Each handler declares which contexts it's available in (empty = all contexts).
 */

import type { CommandHandler } from "../types/command"

export class CommandRegistry {
  private _handlers = new Map<string, CommandHandler>()

  /** Register a single command handler */
  register(handler: CommandHandler): void {
    this._handlers.set(handler.name, handler)
  }

  /** Register multiple handlers at once */
  registerAll(handlers: CommandHandler[]): void {
    for (const h of handlers) this.register(h)
  }

  /** Get all handlers available in a given context */
  getForContext(contextId: string): CommandHandler[] {
    return Array.from(this._handlers.values()).filter(
      (h) => h.contexts.length === 0 || h.contexts.includes(contextId),
    )
  }

  /** Resolve a handler by name, checking context availability */
  resolve(name: string, contextId: string): CommandHandler | undefined {
    const h = this._handlers.get(name)
    if (!h) return undefined
    if (h.contexts.length === 0 || h.contexts.includes(contextId)) return h
    return undefined
  }

  /** Check if a handler is registered (context-independent) */
  has(name: string): boolean {
    return this._handlers.has(name)
  }

  get size(): number {
    return this._handlers.size
  }

  get names(): string[] {
    return Array.from(this._handlers.keys())
  }
}
