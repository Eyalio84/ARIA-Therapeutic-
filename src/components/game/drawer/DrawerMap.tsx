"use client"

import { useMemo, useCallback } from "react"
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { MapNode as GameMapNode } from "@/types/game"

// ── Custom circle node ──
function MapCircleNode({ data }: NodeProps) {
  const d = data as { label: string; discovered: boolean; current: boolean; atmosphere?: string }
  const isCurrent = d.current
  const isDiscovered = d.discovered

  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer">
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <div
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500
          ${isCurrent
            ? "border-[var(--gold,#c9a84c)] bg-[var(--gold,#c9a84c)]/20 shadow-[0_0_16px_var(--gold,#c9a84c),0_0_32px_rgba(201,168,76,0.2)]"
            : isDiscovered
              ? "border-white/20 bg-[var(--bg-surface,#1a1a26)] hover:border-[var(--gold-dim,#8a7235)] hover:bg-[var(--bg-elevated,#222233)]"
              : "border-white/[0.06] bg-white/[0.02]"
          }`}
      >
        {isCurrent && <div className="w-2.5 h-2.5 rounded-full bg-[var(--gold,#c9a84c)] animate-pulse" />}
        {isDiscovered && !isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white/30" />}
      </div>
      <span
        className={`font-mono text-[8px] text-center max-w-[64px] leading-tight
          ${isCurrent
            ? "text-[var(--gold,#c9a84c)] font-medium"
            : isDiscovered
              ? "text-[var(--text-secondary,#9a9690)]"
              : "text-white/[0.15]"
          }`}
      >
        {isDiscovered ? d.label : "???"}
      </span>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />
    </div>
  )
}

const nodeTypes = { mapCircle: MapCircleNode }

// ── Map component ──
interface Props {
  nodes: GameMapNode[]
  onNodeClick: (nodeId: string) => void
}

export default function DrawerMap({ nodes, onNodeClick }: Props) {
  // Convert game nodes to React Flow nodes with auto-layout
  const flowNodes: Node[] = useMemo(() => {
    const cols = 3
    return nodes.map((n, i) => ({
      id: n.id,
      type: "mapCircle",
      position: {
        x: (i % cols) * 100 + 30 + (Math.floor(i / cols) % 2) * 50, // offset odd rows
        y: Math.floor(i / cols) * 90 + 20,
      },
      data: {
        label: n.label,
        discovered: n.discovered,
        current: n.current,
        atmosphere: n.atmosphere,
      },
      draggable: false,
    }))
  }, [nodes])

  // Create edges between consecutive nodes
  const flowEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = []
    for (let i = 0; i < nodes.length - 1; i++) {
      const src = nodes[i]
      const tgt = nodes[i + 1]
      edges.push({
        id: `e-${src.id}-${tgt.id}`,
        source: src.id,
        target: tgt.id,
        style: {
          stroke: src.discovered && tgt.discovered
            ? "rgba(201,168,76,0.25)"
            : "rgba(255,255,255,0.06)",
          strokeWidth: 1.5,
          strokeDasharray: src.discovered && tgt.discovered ? "none" : "4 4",
        },
        animated: src.discovered && tgt.discovered,
      })
    }
    return edges
  }, [nodes])

  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    const gameNode = nodes.find((n) => n.id === node.id)
    if (gameNode?.discovered) onNodeClick(node.id)
  }, [nodes, onNodeClick])

  if (nodes.length === 0) {
    return <div className="text-center text-[var(--text-dim,#5a5854)] font-mono text-[10px] py-6">No locations discovered</div>
  }

  return (
    <div className="w-full h-[200px] rounded-lg overflow-hidden border border-white/[0.04]" style={{ background: "var(--bg-deep, #0a0a0f)" }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.5}
        maxZoom={2}
        panOnDrag
        zoomOnPinch
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={0.5} color="rgba(255,255,255,0.02)" />
      </ReactFlow>
    </div>
  )
}
