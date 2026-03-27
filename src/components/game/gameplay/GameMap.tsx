"use client"

import type { MapNode } from "@/types/game"

interface Props {
  nodes: MapNode[]
  onNodeClick: (nodeId: string) => void
}

export default function GameMap({ nodes, onNodeClick }: Props) {
  if (nodes.length === 0) return null

  return (
    <div className="bg-[var(--bg-mid,#12121a)] border-b border-white/[0.04] px-4 py-2 shrink-0 overflow-x-auto flex gap-1.5 items-center">
      {nodes.map((node, i) => (
        <div key={node.id} className="flex items-center gap-1.5 shrink-0">
          {i > 0 && <div className="w-3 h-px bg-white/[0.08] shrink-0" />}
          <button
            onClick={() => node.discovered && onNodeClick(node.id)}
            disabled={!node.discovered}
            className={`px-2.5 py-1 rounded-xl font-mono text-[10px] whitespace-nowrap border transition-all duration-300 shrink-0
              ${node.current
                ? "text-[var(--gold,#c9a84c)] border-[var(--gold-dim,#8a7235)] bg-[var(--gold,#c9a84c)]/[0.15]"
                : node.discovered
                  ? "text-[var(--text-secondary,#9a9690)] border-white/10 cursor-pointer hover:border-[var(--gold-dim,#8a7235)]"
                  : "text-[var(--text-dim,#5a5854)] border-white/[0.06] cursor-default"
              }`}
          >
            {node.label}
          </button>
        </div>
      ))}
    </div>
  )
}
