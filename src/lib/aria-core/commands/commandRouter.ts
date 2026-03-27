/**
 * CommandRouter — routes FunctionCall events from provider → handler → result.
 *
 * Result types:
 *   silent  → send empty string back to provider (allows function to "complete")
 *   speak   → feed text back to provider as tool_response so Aria speaks it
 *   dispatch → emit UI command to host app (navigate, scroll, etc.)
 */

import type { FunctionCall } from "../types/provider"
import type { CommandContext, CommandResult } from "../types/command"
import type { CommandRegistry } from "./commandRegistry"

export interface RouterCallbacks {
  sendFunctionResponse: (callId: string, name: string, result: string) => void
  dispatchUI: (command: { type: string; [key: string]: unknown }) => void
  onError: (name: string, error: unknown) => void
}

export class CommandRouter {
  constructor(
    private _registry: CommandRegistry,
    private _callbacks: RouterCallbacks,
  ) {}

  /** Route a batch of function calls from the provider */
  async routeAll(
    calls: FunctionCall[],
    ctx: Omit<CommandContext, "dispatchUI">,
  ): Promise<void> {
    await Promise.all(calls.map((call) => this.route(call, ctx)))
  }

  /** Route a single function call */
  async route(
    call: FunctionCall,
    ctx: Omit<CommandContext, "dispatchUI">,
  ): Promise<void> {
    const handler = this._registry.resolve(call.name, ctx.contextId)

    if (!handler) {
      // Unknown command — respond with empty string to unblock Gemini
      this._callbacks.sendFunctionResponse(call.id, call.name, "")
      return
    }

    const commandCtx: CommandContext = {
      ...ctx,
      dispatchUI: (command) => this._callbacks.dispatchUI(command),
    }

    let result: CommandResult
    try {
      result = await handler.execute(call.args, commandCtx)
    } catch (err) {
      this._callbacks.onError(call.name, err)
      this._callbacks.sendFunctionResponse(call.id, call.name, "")
      return
    }

    switch (result.type) {
      case "silent":
        this._callbacks.sendFunctionResponse(call.id, call.name, "")
        break

      case "speak":
        this._callbacks.sendFunctionResponse(call.id, call.name, result.text)
        break

      case "dispatch":
        this._callbacks.dispatchUI(result.command)
        this._callbacks.sendFunctionResponse(call.id, call.name, "")
        break
    }
  }
}
