"use client"

export interface SlashCommand {
  trigger: string
  description: string
  args?: string
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { trigger: "/connect",        description: "Connect Aria" },
  { trigger: "/disconnect",     description: "Disconnect Aria" },
  { trigger: "/clear",          description: "Clear chat history" },
  { trigger: "/status",         description: "Show connection status" },
  { trigger: "/context",        description: "Switch context", args: "<personal>" },
  { trigger: "/voice",          description: "Change voice", args: "<Aoede | Puck | Charon | Kore | Fenrir>" },
  { trigger: "/mic",            description: "Toggle mic on/off" },
  { trigger: "/persona",        description: "Show current persona" },
  { trigger: "/snapshot",       description: "Save current session as a named snapshot" },
]

interface SlashMenuProps {
  filter: string
  onSelect: (trigger: string) => void
}

export function SlashMenu({ filter, onSelect }: SlashMenuProps) {
  const matches = SLASH_COMMANDS.filter((c) =>
    c.trigger.startsWith(filter.toLowerCase()),
  )

  if (matches.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-panel border border-border rounded-xl overflow-hidden shadow-2xl">
      {matches.map((cmd) => (
        <button
          key={cmd.trigger}
          type="button"
          onClick={() => onSelect(cmd.trigger)}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 transition-colors text-left"
        >
          <span className="text-aria font-mono text-sm font-semibold min-w-[120px]">
            {cmd.trigger}
            {cmd.args && <span className="text-zinc-600 ml-1">{cmd.args}</span>}
          </span>
          <span className="text-zinc-500 text-xs">{cmd.description}</span>
        </button>
      ))}
    </div>
  )
}
