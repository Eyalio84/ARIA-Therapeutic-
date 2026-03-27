/**
 * Built-in commands — provider-agnostic, aria-core owns these.
 *
 * These 5 commands are available in every host app without registration:
 *   get_changelog    — reads persona changelog entries
 *   write_to_report  — adds entry to report pad store
 *   clear_report     — clears report pad entries
 *   summarize_session — writes a session summary to report pad
 *   save_memory      — hook for host app memory persistence
 *
 * Host apps can override any of these by registering a handler with the same name.
 */

import type { CommandHandler, CommandResult } from "../types/command"
import type { ChangelogEntry } from "../types/persona"

/** Factory — creates builtin commands with access to changelog data */
export function createBuiltinCommands(
  changelog: ChangelogEntry[],
  getReportEntries: () => Array<{ timestamp: string; type: string; text: string }>,
  addReportEntry: (text: string, type: string) => void,
  clearReport: () => void,
  onSaveMemory?: (key: string, value: string) => Promise<void>,
): CommandHandler[] {
  return [
    {
      name: "get_changelog",
      contexts: [],
      async execute(): Promise<CommandResult> {
        const text = changelog
          .slice(0, 5)
          .map((e) => `• ${e.capability} (${e.date}): ${e.description}`)
          .join("\n")
        return { type: "speak", text }
      },
    },

    {
      name: "write_to_report",
      contexts: [],
      async execute(args): Promise<CommandResult> {
        addReportEntry(args.text as string, args.type as string)
        return { type: "silent" }
      },
    },

    {
      name: "clear_report",
      contexts: [],
      async execute(): Promise<CommandResult> {
        clearReport()
        return { type: "silent" }
      },
    },

    {
      name: "summarize_session",
      contexts: [],
      async execute(args): Promise<CommandResult> {
        const entries = getReportEntries()
        const focus = args.focus as string | undefined
        const counts = entries.reduce<Record<string, number>>((acc, e) => {
          acc[e.type] = (acc[e.type] ?? 0) + 1
          return acc
        }, {})
        const countStr = Object.entries(counts)
          .map(([t, n]) => `${n} ${t}`)
          .join(", ")
        const recent = entries
          .slice(-5)
          .map((e) => `[${e.timestamp}] ${e.type}: ${e.text}`)
          .join("\n")
        const summary = [
          `## Session Summary${focus ? ` — ${focus}` : ""}`,
          `**Total entries:** ${entries.length} (${countStr || "none"})`,
          `**Recent activity:**\n${recent || "No entries yet."}`,
        ].join("\n")
        addReportEntry(summary, "summary")
        return { type: "silent" }
      },
    },

    {
      name: "save_memory",
      contexts: [],
      async execute(args): Promise<CommandResult> {
        if (onSaveMemory) {
          await onSaveMemory(args.key as string, args.value as string)
        }
        return { type: "silent" }
      },
    },
  ]
}

/** Default no-op builtin commands (when host app doesn't provide callbacks) */
export const BUILTIN_COMMANDS: CommandHandler[] = createBuiltinCommands(
  [],
  () => [],
  () => {},
  () => {},
)
