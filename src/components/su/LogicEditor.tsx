"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import { useLabStore, type LabObject, type LogicBlock, type Wire, type Condition, type ValueRef, type LogicAction, type ListenerNode } from "@/store/lab"
import { describeCondition, describeBlock } from "@/lib/logicEngine"

// ── Port Definitions ──

interface PortDef {
  name: string
  type: "boolean" | "number" | "string" | "any"
  direction: "out" | "in"
}

function getOutputPorts(obj: LabObject): PortDef[] {
  switch (obj.objectType) {
    case "button": {
      const style = obj.buttonConfig?.style
      return [{ name: "out", type: style === "toggle" ? "boolean" : "any", direction: "out" }]
    }
    case "timer":
      return [
        { name: "remaining", type: "number", direction: "out" },
        { name: "completed", type: "boolean", direction: "out" },
      ]
    case "input":
      return [{ name: "value", type: "string", direction: "out" }]
    case "slider":
      return [{ name: "value", type: "number", direction: "out" }]
    case "toggle":
      return [{ name: "is_on", type: "boolean", direction: "out" }]
    case "progress":
      return [{ name: "value", type: "number", direction: "out" }]
    case "dropdown":
      return [
        { name: "selected", type: "string", direction: "out" },
        { name: "index", type: "number", direction: "out" },
      ]
    case "counter":
      return [{ name: "value", type: "number", direction: "out" }]
    case "container":
      return [{ name: "tapped", type: "any", direction: "out" }]
    default:
      return [{ name: "out", type: "any", direction: "out" }]
  }
}

function getInputPorts(obj: LabObject): PortDef[] {
  const base: PortDef[] = [
    { name: "opacity", type: "number", direction: "in" },
    { name: "visible", type: "boolean", direction: "in" },
    { name: "color", type: "string", direction: "in" },
    { name: "width", type: "number", direction: "in" },
    { name: "height", type: "number", direction: "in" },
    { name: "animation", type: "string", direction: "in" },
  ]
  if (obj.objectType === "text") base.push({ name: "textContent", type: "string", direction: "in" })
  if (obj.objectType === "input") base.push({ name: "inputValue", type: "string", direction: "in" })
  return base
}

const PORT_COLORS: Record<string, string> = {
  boolean: "#22c55e",
  number: "#60a5fa",
  string: "#f59e0b",
  any: "#a78bfa",
}

// ── Props ──

interface LogicEditorProps {
  sourceObjectId: string
  onClose: () => void
}

// ── Main Component ──

export function LogicEditor({ sourceObjectId, onClose }: LogicEditorProps) {
  const objects = useLabStore((s) => s.objects)
  const logicGraph = useLabStore((s) => s.logicGraph)
  const addLogicBlock = useLabStore((s) => s.addLogicBlock)
  const deleteLogicBlock = useLabStore((s) => s.deleteLogicBlock)
  const updateLogicBlock = useLabStore((s) => s.updateLogicBlock)
  const addWire = useLabStore((s) => s.addWire)
  const deleteWire = useLabStore((s) => s.deleteWire)
  const addListener = useLabStore((s) => s.addListener)
  const deleteListener = useLabStore((s) => s.deleteListener)
  const updateListener = useLabStore((s) => s.updateListener)
  const undo = useLabStore((s) => s.undo)
  const redo = useLabStore((s) => s.redo)
  const canUndo = useLabStore((s) => s.canUndo)
  const canRedo = useLabStore((s) => s.canRedo)

  const [addDrawer, setAddDrawer] = useState(false)
  const [configBlock, setConfigBlock] = useState<string | null>(null)
  const [manualTargets, setManualTargets] = useState<string[]>([])
  const [draggingWire, setDraggingWire] = useState<{ fromNodeId: string; fromPort: string; x: number; y: number } | null>(null)
  const [draggingNode, setDraggingNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const sourceObj = objects.find((o) => o.id === sourceObjectId)

  // Collect all nodes that appear in this graph (source + logic blocks + target objects)
  const visibleObjectIds = useMemo(() => {
    const ids = new Set<string>([sourceObjectId])
    for (const w of logicGraph.wires) {
      ids.add(w.fromNodeId)
      ids.add(w.toNodeId)
    }
    for (const n of logicGraph.nodes) {
      const nodeWires = logicGraph.wires.filter((w) => w.fromNodeId === n.id || w.toNodeId === n.id)
      for (const w of nodeWires) {
        ids.add(w.fromNodeId)
        ids.add(w.toNodeId)
      }
    }
    // Listener watched objects
    for (const l of (logicGraph.listeners || [])) {
      ids.add(l.watchObjectId)
    }
    // Manual targets added from the object bar
    for (const id of manualTargets) ids.add(id)
    return ids
  }, [logicGraph, sourceObjectId, manualTargets])

  const [objectPositions, setObjectPositions] = useState<Record<string, { x: number; y: number }>>({})

  // Node positions: check overrides first, then defaults
  const getNodePos = useCallback((nodeId: string): { x: number; y: number } => {
    // Check local object position overrides
    if (objectPositions[nodeId]) return objectPositions[nodeId]
    // Logic block — stored position
    const lb = logicGraph.nodes.find((n) => n.id === nodeId)
    if (lb) return { x: lb.x, y: lb.y }
    // Source object — left side
    if (nodeId === sourceObjectId) return { x: 20, y: 60 }
    // Target objects — stacked below source, offset right
    const targetIds = [...visibleObjectIds].filter((id) => id !== sourceObjectId && !logicGraph.nodes.some((n) => n.id === id))
    const idx = targetIds.indexOf(nodeId)
    return { x: 20, y: 220 + (idx >= 0 ? idx * 130 : 0) }
  }, [logicGraph, sourceObjectId, visibleObjectIds, objectPositions])

  // ── Wire drag handling ──
  const handlePortDown = useCallback((nodeId: string, portName: string, e: React.PointerEvent) => {
    e.stopPropagation()
    const rect = editorRef.current?.getBoundingClientRect()
    if (!rect) return
    setDraggingWire({ fromNodeId: nodeId, fromPort: portName, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  const handleEditorPointerMove = useCallback((e: React.PointerEvent) => {
    const rect = editorRef.current?.getBoundingClientRect()
    if (!rect) return

    if (draggingWire) {
      setDraggingWire((d) => d ? { ...d, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
    }
    if (draggingNode) {
      const x = Math.max(0, e.clientX - rect.left - draggingNode.offsetX)
      const y = Math.max(0, e.clientY - rect.top - draggingNode.offsetY)
      // Logic block — update store
      if (logicGraph.nodes.some((n) => n.id === draggingNode.id)) {
        updateLogicBlock(draggingNode.id, { x, y })
      } else if ((logicGraph.listeners || []).some((l) => l.id === draggingNode.id)) {
        // Listener node — update store
        updateListener(draggingNode.id, { x, y })
      } else {
        // Object node — update local position state
        setObjectPositions((p) => ({ ...p, [draggingNode.id]: { x, y } }))
      }
    }
  }, [draggingWire, draggingNode, updateLogicBlock, updateListener])

  // Get all input port positions for hit-testing
  const getInputPortPositions = useCallback((): { nodeId: string; port: string; x: number; y: number }[] => {
    const result: { nodeId: string; port: string; x: number; y: number }[] = []
    // Logic block input ports
    for (const n of logicGraph.nodes) {
      const pos = getNodePos(n.id)
      result.push({ nodeId: n.id, port: "in", x: pos.x + 14, y: pos.y + 72 })
    }
    // Object input ports
    for (const id of visibleObjectIds) {
      if (id === sourceObjectId) continue
      if (logicGraph.nodes.some((n) => n.id === id)) continue
      const obj = objects.find((o) => o.id === id)
      if (!obj) continue
      const pos = getNodePos(id)
      const ports = getInputPorts(obj)
      ports.forEach((p, i) => {
        result.push({ nodeId: id, port: p.name, x: pos.x + 7, y: pos.y + 38 + i * 22 })
      })
    }
    return result
  }, [logicGraph, objects, sourceObjectId, visibleObjectIds, getNodePos])

  // Single nearest port — only one glows at a time
  const nearestPort: string | null = (() => {
    if (!draggingWire) return null
    const ports = getInputPortPositions()
    let best: { key: string; dist: number } | null = null
    for (const p of ports) {
      if (p.nodeId === draggingWire.fromNodeId) continue
      const dist = Math.hypot(draggingWire.x - p.x, draggingWire.y - p.y)
      if (dist < 50 && (!best || dist < best.dist)) {
        best = { key: `${p.nodeId}:${p.port}`, dist }
      }
    }
    return best?.key ?? null
  })()

  const handleEditorPointerUp = useCallback((e: React.PointerEvent) => {
    if (draggingWire) {
      const rect = editorRef.current?.getBoundingClientRect()
      if (rect) {
        const dropX = e.clientX - rect.left
        const dropY = e.clientY - rect.top
        const HIT_RADIUS = 35

        // Find nearest input port
        const ports = getInputPortPositions()
        let best: { nodeId: string; port: string; dist: number } | null = null
        for (const p of ports) {
          if (p.nodeId === draggingWire.fromNodeId) continue
          const dist = Math.hypot(dropX - p.x, dropY - p.y)
          if (dist < HIT_RADIUS && (!best || dist < best.dist)) {
            best = { nodeId: p.nodeId, port: p.port, dist }
          }
        }

        if (best) {
          const exists = logicGraph.wires.some((w) =>
            w.fromNodeId === draggingWire.fromNodeId && w.fromPort === draggingWire.fromPort &&
            w.toNodeId === best!.nodeId && w.toPort === best!.port
          )
          if (!exists) {
            addWire({ fromNodeId: draggingWire.fromNodeId, fromPort: draggingWire.fromPort, toNodeId: best.nodeId, toPort: best.port })
          }
        }
      }
    }
    setDraggingWire(null)
    setDraggingNode(null)
  }, [draggingWire, logicGraph.wires, addWire, getInputPortPositions])

  // objectPositions is declared above getNodePos

  const handleNodeDown = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation()
    const pos = getNodePos(id)
    const rect = editorRef.current?.getBoundingClientRect()
    if (!rect) return
    setDraggingNode({ id, offsetX: e.clientX - rect.left - pos.x, offsetY: e.clientY - rect.top - pos.y })
  }, [getNodePos])

  // ── Render a node ──
  const renderObjectNode = (obj: LabObject, role: "source" | "target") => {
    const pos = getNodePos(obj.id)
    const outPorts = role === "source" ? getOutputPorts(obj) : []
    const inPorts = role === "target" ? getInputPorts(obj) : []

    return (
      <div key={obj.id} className="absolute" style={{ left: pos.x, top: pos.y, width: 130, zIndex: 1 }}>
        <div onPointerDown={(e) => handleNodeDown(obj.id, e)}
          className="rounded-xl p-2.5 cursor-grab" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${obj.color}44`, touchAction: "none" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-3 h-3 rounded" style={{ background: obj.color, borderRadius: obj.shape === "circle" ? "50%" : "3px" }} />
            <span className="text-[11px] font-medium text-white/80">{obj.label}</span>
            <span className="text-[9px] text-white/30 ml-auto">{obj.objectType}</span>
          </div>
          {/* Output ports */}
          {outPorts.map((p) => (
            <div key={p.name} className="flex items-center justify-end gap-1 py-0.5">
              <span className="text-[9px] text-white/40">{p.name}</span>
              <div
                onPointerDown={(e) => handlePortDown(obj.id, p.name, e)}
                className="w-5 h-5 rounded-full cursor-pointer border-2 transition-all hover:scale-110"
                style={{ background: PORT_COLORS[p.type], borderColor: PORT_COLORS[p.type] + "88" }}
              />
            </div>
          ))}
          {/* Input ports */}
          {inPorts.map((p) => {
            const isGlowing = nearestPort === `${obj.id}:${p.name}`
            const color = PORT_COLORS[p.type]
            return (
              <div key={p.name} className="flex items-center gap-1 py-0.5">
                <div
                  data-port={`${obj.id}:${p.name}`}
                  className={`w-5 h-5 rounded-full cursor-pointer border-2 transition-all ${isGlowing ? "scale-125" : ""}`}
                  style={{
                    background: isGlowing ? color : "transparent",
                    borderColor: isGlowing ? color : color + "88",
                    boxShadow: isGlowing ? `0 0 12px ${color}, 0 0 24px ${color}44` : "none",
                  }}
                />
                <span className="text-[9px]" style={{ color: isGlowing ? color : "rgba(255,255,255,0.25)" }}>{p.name}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Block type colors
  const BLOCK_COLORS: Record<string, string> = {
    if_else: "#f97316", compare: "#22c55e", math: "#3b82f6",
    delay: "#eab308", set_variable: "#c2410c", get_variable: "#c2410c", loop: "#ea580c",
  }
  const BLOCK_ICONS: Record<string, string> = {
    if_else: "\u2B21", compare: "\u2260", math: "+",
    delay: "\u23F1", set_variable: "$=", get_variable: "$", loop: "\u{1F504}",
  }

  const renderLogicBlockNode = (block: LogicBlock) => {
    const pos = getNodePos(block.id)
    const bType = block.blockType || "if_else"
    const bColor = BLOCK_COLORS[bType] || "#a78bfa"
    const bIcon = BLOCK_ICONS[bType] || "\u2B21"
    const summary = describeBlock(block, objects)
    const wireCount = logicGraph.wires.filter((w) => w.fromNodeId === block.id || w.toNodeId === block.id).length

    return (
      <div key={block.id} className="absolute" style={{ left: pos.x, top: pos.y, width: 150 }}>
        <div
          onPointerDown={(e) => handleNodeDown(block.id, e)}
          className="rounded-xl p-2.5 cursor-grab"
          style={{ background: `${bColor}0d`, border: `1px solid ${bColor}44`, touchAction: "none" }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-bold" style={{ color: bColor }}>{bIcon}</span>
            <span className="text-[11px] font-medium" style={{ color: bColor }}>{block.label}</span>
            <span className="text-[9px] text-white/20 ml-auto">{wireCount}w</span>
          </div>
          <p className="text-[9px] text-white/40 leading-tight mb-2 truncate">{summary}</p>
          {/* Input + Output ports */}
          {(() => {
            const isGlowing = nearestPort === `${block.id}:in`
            return (
              <div className="flex items-center gap-1 py-0.5">
                <div
                  data-port={`${block.id}:in`}
                  className={`w-5 h-5 rounded-full cursor-pointer border-2 transition-all ${isGlowing ? "scale-125" : ""}`}
                  style={{
                    background: isGlowing ? bColor : "transparent",
                    borderColor: isGlowing ? bColor : `${bColor}88`,
                    boxShadow: isGlowing ? `0 0 12px ${bColor}, 0 0 24px ${bColor}44` : "none",
                  }}
                />
                <span className="text-[9px]" style={{ color: isGlowing ? bColor : "rgba(255,255,255,0.2)" }}>in</span>
                <span className="text-[9px] text-white/30 ml-auto">out</span>
                <div
                  onPointerDown={(e) => handlePortDown(block.id, "out", e)}
                  className="w-5 h-5 rounded-full cursor-pointer border-2 transition-all hover:scale-110"
                  style={{ background: bColor, borderColor: `${bColor}88` }}
                />
              </div>
            )
          })()}
          {/* Configure + Delete */}
          <div className="flex gap-1.5 mt-2">
            <button onClick={() => setConfigBlock(block.id)}
              className="flex-1 py-1 rounded-lg text-[9px] font-medium transition-all"
              style={{ background: `${bColor}18`, color: bColor, border: `1px solid ${bColor}28` }}>
              Config
            </button>
            <button onClick={() => deleteLogicBlock(block.id)}
              className="px-2 py-1 rounded-lg text-[9px] font-medium transition-all"
              style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}>
              {"\u2715"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Wire SVG ──
  const renderWires = () => {
    const getPortPos = (nodeId: string, portName: string, direction: "out" | "in"): { x: number; y: number } => {
      const pos = getNodePos(nodeId)
      const isLogic = logicGraph.nodes.some((n) => n.id === nodeId)
      if (isLogic) {
        return direction === "in" ? { x: pos.x + 14, y: pos.y + 72 } : { x: pos.x + 136, y: pos.y + 72 }
      }
      // Object node
      if (direction === "out") return { x: pos.x + 123, y: pos.y + 42 }
      // Input port — find index
      const obj = objects.find((o) => o.id === nodeId)
      const ports = obj ? getInputPorts(obj) : []
      const idx = ports.findIndex((p) => p.name === portName)
      return { x: pos.x + 7, y: pos.y + 38 + (idx >= 0 ? idx * 22 : 0) }
    }

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {logicGraph.wires.map((w) => {
          const from = getPortPos(w.fromNodeId, w.fromPort, "out")
          const to = getPortPos(w.toNodeId, w.toPort, "in")
          const dx = to.x - from.x
          const path = `M ${from.x} ${from.y} C ${from.x + Math.abs(dx) * 0.5} ${from.y}, ${to.x - Math.abs(dx) * 0.5} ${to.y}, ${to.x} ${to.y}`
          return (
            <g key={w.id}>
              <path d={path} stroke="rgba(167,139,250,0.3)" strokeWidth={2} fill="none" />
              {/* Click target for deletion */}
              <path d={path} stroke="transparent" strokeWidth={12} fill="none"
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
                onClick={() => { if (confirm("Delete wire?")) deleteWire(w.id) }}
              />
            </g>
          )
        })}
        {/* Dragging wire preview */}
        {draggingWire && (() => {
          const from = getPortPos(draggingWire.fromNodeId, draggingWire.fromPort, "out")
          const dx = draggingWire.x - from.x
          const path = `M ${from.x} ${from.y} C ${from.x + Math.abs(dx) * 0.5} ${from.y}, ${draggingWire.x - Math.abs(dx) * 0.5} ${draggingWire.y}, ${draggingWire.x} ${draggingWire.y}`
          return <path d={path} stroke="rgba(167,139,250,0.6)" strokeWidth={2} fill="none" strokeDasharray="6 4" />
        })()}
      </svg>
    )
  }

  // ── Tabbed Add Drawer ──
  const [drawerTab, setDrawerTab] = useState<"blocks" | "objects">("blocks")

  const renderAddDrawer = () => {
    const alreadyInGraph = new Set([...visibleObjectIds, ...logicGraph.nodes.map((n) => n.id)])

    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setAddDrawer(false)}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative rounded-t-2xl" style={{ background: "rgba(12,12,20,0.97)", borderTop: "1px solid rgba(167,139,250,0.2)", maxHeight: "60vh" }}
          onClick={(e) => e.stopPropagation()}>

          {/* Handle + tabs */}
          <div className="px-5 pt-4 pb-2">
            <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-3" />
            <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.03)" }}>
              <button onClick={() => setDrawerTab("blocks")}
                className="flex-1 py-2 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: drawerTab === "blocks" ? "rgba(167,139,250,0.15)" : "transparent",
                  color: drawerTab === "blocks" ? "#a78bfa" : "#555",
                  border: drawerTab === "blocks" ? "1px solid rgba(167,139,250,0.2)" : "1px solid transparent",
                }}>
                {"\u2B21"} Blocks
              </button>
              <button onClick={() => setDrawerTab("objects")}
                className="flex-1 py-2 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: drawerTab === "objects" ? "rgba(96,165,250,0.15)" : "transparent",
                  color: drawerTab === "objects" ? "#60a5fa" : "#555",
                  border: drawerTab === "objects" ? "1px solid rgba(96,165,250,0.2)" : "1px solid transparent",
                }}>
                {"\u25A0"} Objects ({objects.length})
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: "45vh" }}>
            {drawerTab === "blocks" && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {([
                  { type: "if_else" as const, icon: "\u2B21", label: "IF / ELSE", color: "#f97316", desc: "Branch" },
                  { type: "compare" as const, icon: "\u2260", label: "Compare", color: "#22c55e", desc: "Bool out" },
                  { type: "math" as const, icon: "+", label: "Math", color: "#3b82f6", desc: "Calculate" },
                  { type: "delay" as const, icon: "\u23F1", label: "Delay", color: "#eab308", desc: "Wait ms" },
                  { type: "set_variable" as const, icon: "$=", label: "Set Var", color: "#c2410c", desc: "Store" },
                  { type: "get_variable" as const, icon: "$", label: "Get Var", color: "#c2410c", desc: "Read" },
                  { type: "loop" as const, icon: "\u{1F504}", label: "Loop", color: "#ea580c", desc: "Repeat" },
                ] as const).map((b) => (
                  <button key={b.type} onClick={() => {
                    addLogicBlock(150, 80 + logicGraph.nodes.length * 110, b.type)
                    setAddDrawer(false)
                  }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all hover:bg-white/5"
                    style={{ border: `1px solid ${b.color}33` }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: `${b.color}18`, color: b.color }}>
                      {b.icon}
                    </div>
                    <span className="text-[10px]" style={{ color: b.color }}>{b.label}</span>
                    <span className="text-[8px] text-white/20">{b.desc}</span>
                  </button>
                ))}
                {/* Listener */}
                <button onClick={() => {
                  addListener({
                    x: 150, y: 80 + (logicGraph.nodes.length + (logicGraph.listeners || []).length) * 110,
                    watchObjectId: sourceObjectId,
                    watchProperty: "outputValue",
                    triggerType: "on_change",
                  })
                  setAddDrawer(false)
                }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all hover:bg-white/5"
                  style={{ border: "1px solid rgba(6,182,212,0.33)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: "rgba(6,182,212,0.18)", color: "#06b6d4" }}>
                    {"\u{1F441}"}
                  </div>
                  <span className="text-[10px]" style={{ color: "#06b6d4" }}>Listener</span>
                  <span className="text-[8px] text-white/20">Watch</span>
                </button>
              </div>
            )}

            {drawerTab === "objects" && (
              <div className="space-y-1.5 mt-2">
                {objects.map((obj) => {
                  const inGraph = alreadyInGraph.has(obj.id)
                  return (
                    <button key={obj.id}
                      disabled={inGraph}
                      onClick={() => {
                        setManualTargets((t) => [...t, obj.id])
                        setAddDrawer(false)
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                      style={{
                        background: inGraph ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${inGraph ? "rgba(255,255,255,0.03)" : obj.color + "33"}`,
                        opacity: inGraph ? 0.35 : 1,
                      }}>
                      <div className="w-6 h-6 rounded shrink-0"
                        style={{ background: obj.color, borderRadius: obj.shape === "circle" ? "50%" : "4px" }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-medium text-white/80 block">{obj.label}</span>
                        <span className="text-[9px] text-white/30">{obj.objectType} {obj.width}x{obj.height}</span>
                      </div>
                      {inGraph ? (
                        <span className="text-[9px] text-white/20 shrink-0">{"\u2713"} in graph</span>
                      ) : (
                        <span className="text-[9px] shrink-0" style={{ color: "#60a5fa" }}>+ add</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Logic Block Config Panel ──
  const renderConfigPanel = () => {
    const block = logicGraph.nodes.find((n) => n.id === configBlock)
    if (!block) return null

    // Find connected input source
    const inputWire = logicGraph.wires.find((w) => w.toNodeId === block.id)
    const inputSource = inputWire ? objects.find((o) => o.id === inputWire.fromNodeId) : null
    const inputType = inputSource?.objectType === "button" && inputSource?.buttonConfig?.style === "toggle" ? "boolean" : "any"

    // Find connected output target
    const outputWire = logicGraph.wires.find((w) => w.fromNodeId === block.id)
    const targetObj = outputWire ? objects.find((o) => o.id === outputWire.toNodeId) : null
    const targetPort = outputWire?.toPort || "opacity"

    // Current condition or defaults
    const cond: Condition = block.condition || {
      type: "if_else",
      test: { left: { type: "input" }, operator: "==", right: { type: "constant", value: 1 } },
      thenAction: { property: targetPort, value: { type: "constant", value: 1 } },
      elseAction: { property: targetPort, value: { type: "constant", value: 0 } },
    }

    const updateCond = (updates: Partial<Condition>) => {
      updateLogicBlock(block.id, { condition: { ...cond, ...updates } })
    }
    const updateTest = (updates: Partial<typeof cond.test>) => {
      updateCond({ test: { ...cond.test, ...updates } })
    }
    const updateThen = (updates: Partial<LogicAction>) => {
      updateCond({ thenAction: { ...cond.thenAction, ...updates } })
    }
    const updateElse = (updates: Partial<LogicAction>) => {
      updateCond({ elseAction: { ...(cond.elseAction || { property: targetPort, value: { type: "constant", value: 0 } }), ...updates } })
    }

    // Property options for target
    const propOptions = ["opacity", "visible", "width", "height", "animation"]

    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#07070f" }}>
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(167,139,250,0.15)" }}>
          <button onClick={() => { if (!block.condition) updateLogicBlock(block.id, { condition: cond }); setConfigBlock(null) }}
            className="text-xs text-white/40">{"\u2190"} Back</button>
          <span className="text-sm font-medium" style={{ color: "#a78bfa" }}>{block.label}</span>
          <button onClick={() => { updateLogicBlock(block.id, { condition: cond }); setConfigBlock(null) }}
            className="text-[11px] font-medium px-3 py-1 rounded-lg"
            style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>Save</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Block type badge */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: `${BLOCK_COLORS[block.blockType || "if_else"]}22`, color: BLOCK_COLORS[block.blockType || "if_else"] }}>
              {(block.blockType || "if_else").toUpperCase().replace("_", " ")}
            </span>
          </div>

          {/* Math config */}
          {block.blockType === "math" && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "#3b82f6" }}>Operation</span>
              <select value={block.mathOp || "add"} onChange={(e) => updateLogicBlock(block.id, { mathOp: e.target.value as any })}
                className="w-full rounded px-2 py-1.5 text-[11px] bg-transparent outline-none" style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }}>
                {[["add", "A + B"], ["subtract", "A - B"], ["multiply", "A x B"], ["divide", "A / B"], ["modulo", "A % B"], ["random", "Random(A, B)"]].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <div>
                <label className="text-[9px] text-zinc-500">Right operand (B)</label>
                <input type="number" value={(block.mathRight as any)?.value ?? 0}
                  onChange={(e) => updateLogicBlock(block.id, { mathRight: { type: "constant", value: Number(e.target.value) } })}
                  className="w-full rounded px-2 py-1 text-[11px] bg-transparent outline-none" style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
              </div>
            </div>
          )}

          {/* Delay config */}
          {block.blockType === "delay" && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.15)" }}>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "#eab308" }}>Delay (ms)</span>
              <input type="number" value={block.delayMs || 1000} min={100} max={10000} step={100}
                onChange={(e) => updateLogicBlock(block.id, { delayMs: Math.max(100, Number(e.target.value)) })}
                className="w-full rounded px-2 py-1.5 text-[11px] bg-transparent outline-none" style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
              <div className="flex gap-2">
                {[500, 1000, 2000, 5000].map((ms) => (
                  <button key={ms} onClick={() => updateLogicBlock(block.id, { delayMs: ms })}
                    className="flex-1 py-1 rounded text-[10px]" style={{ background: block.delayMs === ms ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.03)", color: block.delayMs === ms ? "#eab308" : "#666", border: `1px solid ${block.delayMs === ms ? "rgba(234,179,8,0.3)" : "rgba(255,255,255,0.06)"}` }}>{ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}</button>
                ))}
              </div>
            </div>
          )}

          {/* Variable config (Set/Get) */}
          {(block.blockType === "set_variable" || block.blockType === "get_variable") && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(194,65,12,0.04)", border: "1px solid rgba(194,65,12,0.15)" }}>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "#c2410c" }}>Variable Name</span>
              <input type="text" value={block.variableName || ""} placeholder="my_variable"
                onChange={(e) => updateLogicBlock(block.id, { variableName: e.target.value })}
                className="w-full rounded px-2 py-1.5 text-[11px] bg-transparent outline-none" style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
              {Object.keys(logicGraph.variables).length > 0 && (
                <div>
                  <label className="text-[9px] text-zinc-500">Existing variables</label>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {Object.keys(logicGraph.variables).map((v) => (
                      <button key={v} onClick={() => updateLogicBlock(block.id, { variableName: v })}
                        className="px-2 py-0.5 rounded text-[10px]" style={{ background: block.variableName === v ? "rgba(194,65,12,0.2)" : "rgba(255,255,255,0.03)", color: block.variableName === v ? "#c2410c" : "#888", border: `1px solid rgba(255,255,255,0.08)` }}>${v}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loop config */}
          {block.blockType === "loop" && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(234,88,12,0.04)", border: "1px solid rgba(234,88,12,0.15)" }}>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "#ea580c" }}>Loop</span>
              <div className="flex gap-1">
                {(["repeat", "while"] as const).map((t) => (
                  <button key={t} onClick={() => updateLogicBlock(block.id, { loopType: t })}
                    className="flex-1 py-1 rounded text-[10px]" style={{ background: (block.loopType || "repeat") === t ? "rgba(234,88,12,0.2)" : "rgba(255,255,255,0.03)", color: (block.loopType || "repeat") === t ? "#ea580c" : "#666", border: `1px solid ${(block.loopType || "repeat") === t ? "rgba(234,88,12,0.3)" : "rgba(255,255,255,0.06)"}` }}>{t}</button>
                ))}
              </div>
              <div>
                <label className="text-[9px] text-zinc-500">Count (max iterations)</label>
                <input type="number" value={block.loopCount ?? 3} min={1} max={100}
                  onChange={(e) => updateLogicBlock(block.id, { loopCount: Math.max(1, Math.min(100, Number(e.target.value))) })}
                  className="w-full rounded px-2 py-1 text-[11px] bg-transparent outline-none" style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
              </div>
            </div>
          )}

          {/* Input summary */}
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[10px] text-white/30 uppercase tracking-wide">Input</span>
            <p className="text-[11px] text-white/60 mt-1">
              {inputSource ? `${inputSource.label} (${inputType})` : "Not connected — wire a source first"}
            </p>
          </div>

          {/* Output summary */}
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[10px] text-white/30 uppercase tracking-wide">Output</span>
            <p className="text-[11px] text-white/60 mt-1">
              {targetObj ? `${targetObj.label} . ${targetPort}` : "Not connected — wire a target first"}
            </p>
          </div>

          {/* Condition */}
          <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.15)" }}>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "#a78bfa" }}>Condition</span>

            {/* Value ref picker — reusable for left and right */}
            {(() => {
              const selStyle = "rounded px-2 py-1 text-[11px] bg-transparent outline-none"
              const selBorder = { border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }
              const objProps = ["opacity", "width", "height", "x", "y", "hue", "zIndex"]

              const renderValuePicker = (val: ValueRef, onUpdate: (v: ValueRef) => void, label: string) => (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <select value={val.type} onChange={(e) => {
                    if (e.target.value === "input") onUpdate({ type: "input" })
                    else if (e.target.value === "property") onUpdate({ type: "property", objectId: objects[0]?.id || "", property: "opacity" })
                    else onUpdate({ type: "constant", value: 0 })
                  }} className={selStyle} style={selBorder}>
                    <option value="input">input</option>
                    <option value="constant">constant</option>
                    <option value="property">obj property</option>
                  </select>
                  {val.type === "constant" && (
                    inputType === "boolean" && label === "right" ? (
                      <select value={String((val as any).value ?? 1)} onChange={(e) => onUpdate({ type: "constant", value: Number(e.target.value) })}
                        className={selStyle} style={selBorder}>
                        <option value="1">1 (ON)</option>
                        <option value="0">0 (OFF)</option>
                      </select>
                    ) : (
                      <input type="number" value={(val as any).value ?? 0}
                        onChange={(e) => onUpdate({ type: "constant", value: Number(e.target.value) })}
                        className={`w-14 ${selStyle}`} style={selBorder} />
                    )
                  )}
                  {val.type === "property" && (
                    <>
                      <select value={(val as any).objectId || ""} onChange={(e) => onUpdate({ type: "property", objectId: e.target.value, property: (val as any).property || "opacity" })}
                        className={selStyle} style={selBorder}>
                        {objects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                      <span className="text-[9px] text-white/30">.</span>
                      <select value={(val as any).property || "opacity"} onChange={(e) => onUpdate({ type: "property", objectId: (val as any).objectId, property: e.target.value })}
                        className={selStyle} style={selBorder}>
                        {objProps.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </>
                  )}
                </div>
              )

              return (
                <>
                  {/* IF row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 rounded text-[11px] font-bold" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>IF</span>
                    {renderValuePicker(cond.test.left, (v) => updateTest({ left: v }), "left")}
                    <select value={cond.test.operator} onChange={(e) => updateTest({ operator: e.target.value as any })}
                      className={selStyle} style={selBorder}>
                      {["==", "!=", ">", "<", ">=", "<=", "contains"].map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                    {renderValuePicker(cond.test.right, (v) => updateTest({ right: v }), "right")}
                  </div>
                </>
              )
            })()}

            {/* THEN row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 rounded text-[11px] font-bold" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>THEN</span>
              <span className="text-[11px] text-white/40">set</span>
              <select value={cond.thenAction.property} onChange={(e) => updateThen({ property: e.target.value })}
                className="rounded px-2 py-1 text-[11px] bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }}>
                {propOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <span className="text-[11px] text-white/40">to</span>
              <input type="text" value={String((cond.thenAction.value as any).value ?? "")}
                onChange={(e) => {
                  const v = isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)
                  updateThen({ value: { type: "constant", value: v } })
                }}
                className="w-16 rounded px-2 py-1 text-[11px] bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
            </div>

            {/* ELSE row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 rounded text-[11px] font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>ELSE</span>
              <span className="text-[11px] text-white/40">set</span>
              <select value={cond.elseAction?.property || targetPort} onChange={(e) => updateElse({ property: e.target.value })}
                className="rounded px-2 py-1 text-[11px] bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }}>
                {propOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <span className="text-[11px] text-white/40">to</span>
              <input type="text" value={String((cond.elseAction?.value as any)?.value ?? "")}
                onChange={(e) => {
                  const v = isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)
                  updateElse({ value: { type: "constant", value: v } })
                }}
                className="w-16 rounded px-2 py-1 text-[11px] bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[10px] text-white/30 uppercase tracking-wide">Preview</span>
            <p className="text-[11px] mt-1" style={{ color: "#a78bfa" }}>
              {describeCondition(cond, objects)}
            </p>
            {inputSource && targetObj && (
              <p className="text-[10px] text-white/30 mt-1">
                When {inputSource.label} is tapped {"\u2192"} {targetObj.label} responds
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── If configuring a logic block, show that instead ──
  if (configBlock) return renderConfigPanel()

  // ── Main editor ──
  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "#07070f" }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(167,139,250,0.15)" }}>
        <button onClick={onClose} className="text-xs text-white/40">{"\u2190"} Back</button>
        <span className="text-sm font-medium" style={{ color: "#a78bfa" }}>Logic Editor</span>
        <div className="flex gap-2">
          <button onClick={() => undo()} disabled={!canUndo()} className="text-xs px-2 py-1 rounded transition-all"
            style={{ color: canUndo() ? "#a78bfa" : "#333", background: canUndo() ? "rgba(167,139,250,0.1)" : "transparent" }}>{"\u21A9"}</button>
          <button onClick={() => redo()} disabled={!canRedo()} className="text-xs px-2 py-1 rounded transition-all"
            style={{ color: canRedo() ? "#a78bfa" : "#333", background: canRedo() ? "rgba(167,139,250,0.1)" : "transparent" }}>{"\u21AA"}</button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 px-4 py-1.5 text-[9px] text-white/20 flex gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        <span>{logicGraph.nodes.length} logic blocks</span>
        <span>{logicGraph.wires.length} wires</span>
        <span>{logicGraph.nodes.filter((n) => n.condition).length} configured</span>
      </div>

      {/* Node canvas */}
      <div ref={editorRef} className="flex-1 relative overflow-auto"
        onPointerMove={handleEditorPointerMove}
        onPointerUp={handleEditorPointerUp}
        style={{ touchAction: "none" }}>

        {/* Wires SVG layer */}
        {renderWires()}

        {/* Source object */}
        {sourceObj && renderObjectNode(sourceObj, "source")}

        {/* Logic blocks */}
        {logicGraph.nodes.map((block) => renderLogicBlockNode(block))}

        {/* Listener nodes */}
        {(logicGraph.listeners || []).map((listener) => {
          const pos = { x: listener.x, y: listener.y }
          const watchObj = objects.find((o) => o.id === listener.watchObjectId)
          const lColor = "#06b6d4"
          return (
            <div key={listener.id} className="absolute" style={{ left: pos.x, top: pos.y, width: 150 }}>
              <div
                onPointerDown={(e) => handleNodeDown(listener.id, e)}
                className="rounded-xl p-2.5 cursor-grab"
                style={{ background: `${lColor}0d`, border: `1px solid ${lColor}44`, touchAction: "none" }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px]" style={{ color: lColor }}>{"\u{1F441}"}</span>
                  <span className="text-[11px] font-medium" style={{ color: lColor }}>{listener.label}</span>
                  <button onClick={() => deleteListener(listener.id)} className="ml-auto text-[9px] text-red-400/50 hover:text-red-400">x</button>
                </div>
                <p className="text-[9px] text-white/40 leading-tight mb-1">
                  {watchObj?.label || "?"}.{listener.watchProperty} ({listener.triggerType.replace("on_", "")})
                </p>
                {/* Config inline */}
                <select value={listener.watchObjectId} onChange={(e) => updateListener(listener.id, { watchObjectId: e.target.value })}
                  className="w-full rounded px-1 py-0.5 text-[9px] bg-transparent outline-none mb-1" style={{ border: `1px solid ${lColor}33`, color: "#ccc" }}>
                  {objects.map((o) => <option key={o.id} value={o.id}>{o.label} ({o.objectType})</option>)}
                </select>
                <select value={listener.watchProperty} onChange={(e) => updateListener(listener.id, { watchProperty: e.target.value })}
                  className="w-full rounded px-1 py-0.5 text-[9px] bg-transparent outline-none mb-1" style={{ border: `1px solid ${lColor}33`, color: "#ccc" }}>
                  {["outputValue", "opacity", "color", "width", "height", "sliderValue", "toggleState", "progressValue", "dropdownSelected", "counterValue", "inputValue", "timerElapsed"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select value={listener.triggerType} onChange={(e) => updateListener(listener.id, { triggerType: e.target.value as any })}
                  className="w-full rounded px-1 py-0.5 text-[9px] bg-transparent outline-none mb-1" style={{ border: `1px solid ${lColor}33`, color: "#ccc" }}>
                  <option value="on_change">On Change</option>
                  <option value="on_threshold">On Threshold</option>
                  <option value="on_interval">On Interval</option>
                </select>
                {listener.triggerType === "on_threshold" && (
                  <div className="flex gap-1 mb-1">
                    <select value={listener.thresholdOperator || ">"} onChange={(e) => updateListener(listener.id, { thresholdOperator: e.target.value as any })}
                      className="rounded px-1 py-0.5 text-[9px] bg-transparent outline-none" style={{ border: `1px solid ${lColor}33`, color: "#ccc", width: 40 }}>
                      {["==", "!=", ">", "<", ">=", "<="].map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                    <input type="number" value={listener.thresholdValue ?? 0} onChange={(e) => updateListener(listener.id, { thresholdValue: Number(e.target.value) })}
                      className="flex-1 rounded px-1 py-0.5 text-[9px] bg-transparent outline-none" style={{ border: `1px solid ${lColor}33`, color: "#ccc" }} />
                  </div>
                )}
                {listener.triggerType === "on_interval" && (
                  <input type="number" value={listener.intervalMs || 1000} min={100} step={100}
                    onChange={(e) => updateListener(listener.id, { intervalMs: Math.max(100, Number(e.target.value)) })}
                    placeholder="ms"
                    className="w-full rounded px-1 py-0.5 text-[9px] bg-transparent outline-none mb-1" style={{ border: `1px solid ${lColor}33`, color: "#ccc" }} />
                )}
                {/* Output port */}
                <div className="flex items-center gap-1 py-0.5 mt-1">
                  <span className="text-[9px] text-white/30 ml-auto">fires</span>
                  <div
                    onPointerDown={(e) => handlePortDown(listener.id, "out", e)}
                    className="w-5 h-5 rounded-full cursor-pointer border-2 transition-all hover:scale-110"
                    style={{ background: lColor, borderColor: `${lColor}88` }}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {/* Target objects already in graph */}
        {[...visibleObjectIds]
          .filter((id) => id !== sourceObjectId && !logicGraph.nodes.some((n) => n.id === id))
          .map((id) => {
            const obj = objects.find((o) => o.id === id)
            return obj ? renderObjectNode(obj, "target") : null
          })}

        {/* Empty state */}
        {logicGraph.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[11px] text-white/15">Tap [+] to add a Logic Block</p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 px-3 py-2 flex items-center gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => setAddDrawer(true)}
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg"
          style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px dashed rgba(167,139,250,0.3)" }}>+</button>
        <span className="text-[9px] text-white/20">
          {logicGraph.nodes.length} blocks {"\u00b7"} {[...visibleObjectIds].filter((id) => !logicGraph.nodes.some((n) => n.id === id)).length} objects {"\u00b7"} {logicGraph.wires.length} wires
        </span>
      </div>

      {/* Add drawer */}
      {addDrawer && renderAddDrawer()}
    </div>
  )
}
