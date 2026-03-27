/**
 * Navigation + utility handlers.
 */

import type { CommandHandler } from "@/lib/aria-core/types/command"

export const navigationHandlers: CommandHandler[] = [
  {
    name: "navigate",
    contexts: [],
    async execute(args, ctx) {
      ctx.dispatchUI({ type: "NAVIGATE", url: args.url as string })
      return { type: "silent" }
    },
  },

  {
    name: "scroll_page",
    contexts: [],
    async execute(args, ctx) {
      ctx.dispatchUI({ type: "SCROLL", direction: args.direction as string, amount: args.amount as number | undefined })
      return { type: "silent" }
    },
  },

  {
    name: "save_memory",
    contexts: [],
    async execute(args) {
      const key = args.key as string
      const value = args.value as string
      // Store in localStorage for now
      const memories = JSON.parse(localStorage.getItem("aria-memories") ?? "{}")
      memories[key] = value
      localStorage.setItem("aria-memories", JSON.stringify(memories))
      return { type: "silent" }
    },
  },
]
