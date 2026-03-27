"use client"

import { useEffect, useState, useCallback } from "react"
import { useDashboardStore } from "@/store/dashboard"
import ReactFlow, {
  Background, Controls, MiniMap, useNodesState, useEdgesState,
  type Node, type Edge,
} from "reactflow"
import "reactflow/dist/style.css"

const API = process.env.NEXT_PUBLIC_GAME_API || ""

const NODE_COLORS: Record<string, string> = {
  concern: "#ef4444",
  emotion: "#f59e0b",
  trigger: "#f97316",
  coping: "#22c55e",
  breakthrough: "#a78bfa",
  media: "#60a5fa",
  goal: "#06b6d4",
  session: "#6b7280",
}

export function TherapyKGTab() {
  const userId = useDashboardStore((s) => s.userId)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(false)
  const [selectedNode, setSelectedNode] = useState<any>(null)

  const loadGraph = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/therapy/user/${userId}/graph`)
      if (!res.ok) throw new Error("Failed to load graph")
      const data = await res.json()

      // React Flow format from TherapyKG.to_react_flow()
      setNodes((data.nodes || []).map((n: any) => ({
        ...n,
        style: {
          background: `${NODE_COLORS[n.data?.type] || "#6b7280"}22`,
          border: `2px solid ${NODE_COLORS[n.data?.type] || "#6b7280"}`,
          borderRadius: "12px",
          padding: "8px 12px",
          color: "#e4e4e7",
          fontSize: "12px",
          minWidth: "80px",
          textAlign: "center" as const,
        },
      })))
      setEdges((data.edges || []).map((e: any) => ({
        ...e,
        style: { stroke: "rgba(255,255,255,0.15)" },
        labelStyle: { fill: "#c9a96e", fontSize: 10 },
        animated: e.data?.type === "triggers",
      })))
    } catch (err) {
      console.error("KG load error:", err)
    } finally {
      setLoading(false)
    }
  }, [userId, setNodes, setEdges])

  useEffect(() => { loadGraph() }, [loadGraph])

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.data)
  }, [])

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1 text-xs text-zinc-500">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              {type}
            </span>
          ))}
        </div>
        <button onClick={loadGraph} disabled={loading}
          className="text-xs px-2 py-1 rounded glass hover:bg-white/10 transition">
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* React Flow canvas */}
      <div className="flex-1 glass rounded-xl overflow-hidden" style={{ minHeight: "400px" }}>
        {nodes.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            No therapy KG data yet. Play a game session to grow the graph.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} color="rgba(255,255,255,0.03)" />
            <Controls />
            <MiniMap nodeColor={(n) => NODE_COLORS[n.data?.type] || "#6b7280"} />
          </ReactFlow>
        )}
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium" style={{ color: NODE_COLORS[selectedNode.type] || "#e4e4e7" }}>
              {selectedNode.label || selectedNode.name}
            </h3>
            <button onClick={() => setSelectedNode(null)} className="text-zinc-500 text-xs">close</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
            <div>Type: <span className="text-zinc-300">{selectedNode.type}</span></div>
            <div>Intensity: <span className="text-zinc-300">{((selectedNode.intensity || 0) * 100).toFixed(0)}%</span></div>
            {selectedNode.description && (
              <div className="col-span-2">Description: <span className="text-zinc-300">{selectedNode.description}</span></div>
            )}
            {selectedNode.session_count && (
              <div>Sessions: <span className="text-zinc-300">{selectedNode.session_count}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
