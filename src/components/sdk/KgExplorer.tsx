"use client"

import { useCallback, useEffect, useState } from "react"
import { ReactFlow, Background, Controls, MiniMap, type NodeProps, type Node, type Edge, Handle, Position, useNodesState, useEdgesState, type Connection } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useKgStore, NODE_COLORS } from "@/store/kg"

function KgNode({ data }: NodeProps) {
  const nodeData = data as { label: string; type: string; description: string; price?: number; stock?: number }
  const color = NODE_COLORS[nodeData.type] ?? "#888"
  const { setEditingNode, setSelectedNode } = useKgStore()

  return (
    <div
      className="px-3 py-2 rounded-lg border cursor-pointer hover:scale-105 transition-transform"
      style={{ background: `${color}15`, borderColor: `${color}40`, minWidth: 120, maxWidth: 180 }}
      onClick={() => {
        setSelectedNode(nodeData.label)
        setEditingNode({ ...nodeData, id: nodeData.label })
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8 }} />
      <div className="text-[10px] font-mono px-1.5 py-0.5 rounded mb-1 inline-block" style={{ background: `${color}30`, color }}>
        {nodeData.type}
      </div>
      <div className="text-xs font-medium text-white truncate">{nodeData.label}</div>
      {nodeData.price != null && (
        <div className="text-[10px] text-white/40">${nodeData.price}</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8 }} />
    </div>
  )
}

const nodeTypes = { kgNode: KgNode }

export function KgExplorer() {
  const { nodes: kgNodes, edges: kgEdges, isLoading, fetchGraph, kgStats, addEdge: addKgEdge, setEditingEdge, exportGraph } = useKgStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[])
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[])
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  useEffect(() => {
    let filtered = kgNodes
    if (filter) {
      filtered = kgNodes.filter((n) => (n.data as { type: string }).type === filter)
    }
    setNodes(filtered)
    setEdges(kgEdges)
  }, [kgNodes, kgEdges, filter, setNodes, setEdges])

  const onConnect = useCallback((conn: Connection) => {
    if (conn.source && conn.target) {
      setEditingEdge({ source: conn.source, target: conn.target, type: "relates_to" })
    }
  }, [setEditingEdge])

  const handleExport = async () => {
    const json = await exportGraph()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "jewelry-kg-export.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const types = kgStats?.node_types ? Object.keys(kgStats.node_types) : []

  return (
    <div className="glass rounded-xl overflow-hidden" style={{ height: 400 }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        <h3 className="text-xs font-semibold tracking-widest uppercase text-gold mr-2">KG Explorer</h3>
        <button
          onClick={() => setFilter(null)}
          className={`text-[10px] px-2 py-0.5 rounded ${!filter ? "bg-gold/20 text-gold" : "text-white/40 hover:text-white/60"}`}
        >
          All
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className="text-[10px] px-2 py-0.5 rounded transition"
            style={{
              background: filter === t ? `${NODE_COLORS[t] ?? "#888"}20` : undefined,
              color: filter === t ? NODE_COLORS[t] ?? "#888" : "rgba(255,255,255,0.3)",
            }}
          >
            {t.replace("_", " ")}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button onClick={handleExport} className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-white/40 hover:text-white/60">
            Export
          </button>
          {kgStats && (
            <span className="text-[10px] text-white/20">{kgStats.nodes}n / {kgStats.edges}e</span>
          )}
        </div>
      </div>

      {/* React Flow Canvas */}
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(255,255,255,0.03)" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={(n) => NODE_COLORS[(n.data as { type: string })?.type] ?? "#888"}
            maskColor="rgba(7,7,15,0.8)"
          />
        </ReactFlow>
      )}
    </div>
  )
}
