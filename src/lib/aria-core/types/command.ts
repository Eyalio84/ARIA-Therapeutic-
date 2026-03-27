/**
 * Command system contracts — pluggable command handlers.
 */

export type CommandResultType = "silent" | "speak" | "dispatch"

/** Result returned by a command handler */
export type CommandResult =
  | { type: "silent" }
  | { type: "speak"; text: string }
  | { type: "dispatch"; command: UICommand }

/** A UI-level command emitted to the host app */
export interface UICommand {
  type: string
  [key: string]: unknown
}

/** Context passed to command handlers at execution time */
export interface CommandContext {
  /** Current Aria context (e.g. "platform", "template", "member") */
  contextId: string
  /** Current page pathname */
  currentPage: string
  /** Arbitrary state the host app injects */
  hostState: Record<string, unknown>
  /** Dispatch a UI command to the host app */
  dispatchUI: (command: UICommand) => void
}

/** A single command handler */
export interface CommandHandler {
  /** Unique command name (matches function_call name from provider) */
  name: string
  /** Which contexts this command is available in (empty = all) */
  contexts: string[]
  /** Execute the command. Return undefined for silent. */
  execute: (args: Record<string, unknown>, ctx: CommandContext) => Promise<CommandResult>
}
