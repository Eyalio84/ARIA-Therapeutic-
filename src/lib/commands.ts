import type { CommandHandler } from "./aria-core/types/command"

/**
 * Personal Aria command handlers.
 * These are wired to the personal context — Aria can call them when
 * the user asks for specific actions.
 */
export const personalCommands: CommandHandler[] = [
  {
    name: "open_url",
    contexts: [],
    async execute(args, ctx) {
      ctx.dispatchUI({ type: "OPEN_URL", url: args.url as string })
      return { type: "silent" }
    },
  },

  {
    name: "copy_to_clipboard",
    contexts: [],
    async execute(args) {
      if (typeof navigator !== "undefined") {
        await navigator.clipboard.writeText(args.text as string)
      }
      return { type: "speak", text: "Copied." }
    },
  },

  {
    name: "set_reminder",
    contexts: [],
    async execute(args) {
      // Placeholder — host app can wire this to a real reminder system
      return {
        type: "speak",
        text: `Noted: ${args.note as string}. (Reminder persistence not yet wired.)`,
      }
    },
  },
]

/**
 * Personal context definition — what Aria can do in personal mode.
 */
import type { FunctionDeclaration } from "./aria-core/types/provider"

export const personalContextFunctions: FunctionDeclaration[] = [
  {
    name: "open_url",
    description: "Open a URL in the browser. Use when the user says 'open', 'go to', 'navigate to' a website.",
    parameters: {
      type: "OBJECT",
      properties: {
        url: { type: "STRING", description: "Full URL including https://" },
      },
      required: ["url"],
    },
  },
  {
    name: "copy_to_clipboard",
    description: "Copy text to clipboard. Use when the user says 'copy this', 'put that in clipboard'.",
    parameters: {
      type: "OBJECT",
      properties: {
        text: { type: "STRING", description: "Text to copy" },
      },
      required: ["text"],
    },
  },
  {
    name: "set_reminder",
    description: "Note something to remember. Use when user says 'remind me', 'note this', 'remember that'.",
    parameters: {
      type: "OBJECT",
      properties: {
        note: { type: "STRING", description: "What to remember" },
        when: { type: "STRING", description: "Optional: when to surface this reminder" },
      },
      required: ["note"],
    },
  },
]
