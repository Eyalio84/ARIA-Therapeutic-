"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

// ── Object State ──
export type ObjectType = "shape" | "image" | "button" | "text" | "input" | "timer" | "container" | "slider" | "toggle" | "progress" | "dropdown" | "counter"

export interface ButtonConfig {
  targetType: "object" | "device" | "url"
  targetLabel: string
  action: string
  actionArgs: Record<string, any>
  style: "toggle" | "oneshot" | "link"
  buttonLabel: string
  toggleState: boolean
}

// ── Logic Graph Types ──

export type ValueRef =
  | { type: "input" }
  | { type: "constant"; value: number | string | boolean }
  | { type: "property"; objectId: string; property: string }
  | { type: "variable"; name: string }

export type CompareOp = "==" | "!=" | ">" | "<" | ">=" | "<=" | "contains"

export interface LogicAction {
  property: string
  value: ValueRef
}

export interface Condition {
  type: "if_else"
  test: {
    left: ValueRef
    operator: CompareOp
    right: ValueRef
  }
  thenAction: LogicAction
  elseAction: LogicAction | null
  // Compound conditions (AND/OR)
  compound?: {
    logic: "and" | "or"
    extra: Array<{ left: ValueRef; operator: CompareOp; right: ValueRef }>
  }
}

export type LogicBlockType = "if_else" | "compare" | "math" | "delay" | "set_variable" | "get_variable" | "loop" | "collision"

export interface LogicBlock {
  id: string
  label: string
  x: number
  y: number
  blockType: LogicBlockType
  condition: Condition | null
  // Math block
  mathOp?: "add" | "subtract" | "multiply" | "divide" | "modulo" | "random"
  mathLeft?: ValueRef   // if set, overrides inputValue as left operand
  mathRight?: ValueRef
  // Delay block
  delayMs?: number
  // Variable block
  variableName?: string
  variableValue?: ValueRef
  // Loop block
  loopType?: "repeat" | "while"
  loopCount?: number
  // Collision block
  collisionObjectA?: string
  collisionObjectB?: string
  collisionThreshold?: number
}

export interface ListenerNode {
  id: string
  label: string
  x: number
  y: number
  watchObjectId: string
  watchProperty: string
  triggerType: "on_change" | "on_threshold" | "on_interval"
  thresholdOperator?: CompareOp
  thresholdValue?: number | string
  intervalMs?: number
  lastValue?: any
}

export interface Wire {
  id: string
  fromNodeId: string
  fromPort: string
  toNodeId: string
  toPort: string
}

export interface LogicGraph {
  nodes: LogicBlock[]
  listeners: ListenerNode[]
  wires: Wire[]
  variables: Record<string, any>
}

export interface LabObject {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  color: string
  hue: number
  shape: "circle" | "square" | "triangle"
  zIndex: number
  groupId: string | null
  animation: string | null
  animSpeed: number
  orbitTarget: string | null
  // Typed objects
  objectType: ObjectType
  imageSrc: string | null
  buttonConfig: ButtonConfig | null
  // Text
  textContent: string
  fontSize: number
  textAlign: "left" | "center" | "right"
  // Input
  inputType: "text" | "number"
  inputValue: string
  placeholder: string
  // Timer
  timerDuration: number   // total seconds
  timerElapsed: number    // seconds elapsed
  timerRunning: boolean
  // Container
  parentId: string | null
  containerLayout: "free" | "vertical" | "horizontal"
  containerPadding: number
  containerGap: number
  // Slider
  sliderMin: number
  sliderMax: number
  sliderValue: number
  sliderStep: number
  // Toggle
  toggleState: boolean
  toggleLabel: string
  // Progress
  progressValue: number
  progressColor: string
  // Dropdown
  dropdownOptions: string[]
  dropdownSelected: string
  dropdownOpen: boolean
  // Counter
  counterValue: number
  counterLabel: string
  counterStep: number
  // Logic output
  outputValue: any
}

interface LabStore {
  objects: LabObject[]
  selectedId: string | null
  nextLetter: number

  // Canvas state
  canvasZoom: number
  canvasBg: string
  showGrid: boolean
  snapToGrid: boolean
  gridSize: number
  playMode: boolean

  // Presets
  presets: Record<string, { objects: LabObject[]; canvasBg: string; logicGraph?: LogicGraph }>

  // Logic Graph
  logicGraph: LogicGraph

  // CRUD
  addObject: (overrides?: Partial<LabObject>) => string
  duplicateObject: (id: string) => string | null
  deleteObject: (id: string) => void
  updateObject: (id: string, updates: Partial<LabObject>) => void

  // Selection
  selectObject: (id: string) => void
  selectByLabel: (label: string) => void

  // Canvas
  setZoom: (level: number) => void
  setBg: (color: string) => void
  setShowGrid: (v: boolean) => void
  setSnapToGrid: (v: boolean) => void
  setPlayMode: (v: boolean) => void
  clearCanvas: () => void

  // Presets
  savePreset: (name: string) => void
  loadPreset: (name: string) => boolean

  // Logic CRUD
  addLogicBlock: (x?: number, y?: number, blockType?: LogicBlockType) => string
  deleteLogicBlock: (id: string) => void
  updateLogicBlock: (id: string, updates: Partial<LogicBlock>) => void
  // Listener CRUD
  addListener: (listener: Omit<ListenerNode, "id" | "label" | "lastValue">) => string
  deleteListener: (id: string) => void
  updateListener: (id: string, updates: Partial<ListenerNode>) => void

  addWire: (wire: Omit<Wire, "id">) => string
  deleteWire: (id: string) => void
  getWiresForNode: (nodeId: string) => Wire[]

  // Project save/load
  exportProject: () => string
  importProject: (json: string) => boolean

  // Undo/Redo
  _history: string[]
  _historyIndex: number
  _pushSnapshot: () => void
  undo: () => boolean
  redo: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean

  // Bulk
  resetAll: () => void
}

const MAX_OBJECTS = 20

function genId(): string {
  return "obj_" + Math.random().toString(36).slice(2, 8)
}

function autoLabel(index: number): string {
  // A-Z, then AA, AB, etc.
  if (index < 26) return String.fromCharCode(65 + index)
  return String.fromCharCode(65 + Math.floor(index / 26) - 1) + String.fromCharCode(65 + (index % 26))
}

function nextAvailableLabel(objects: LabObject[], startFrom: number): { label: string; index: number } {
  let i = startFrom
  while (i < 200) {
    const label = autoLabel(i)
    if (!objects.some((o) => o.label === label)) return { label, index: i + 1 }
    i++
  }
  return { label: autoLabel(startFrom), index: startFrom + 1 }
}

const DEFAULT_COLORS = [
  { hue: 350, color: "hsl(350,70%,60%)" },
  { hue: 170, color: "hsl(170,70%,55%)" },
  { hue: 220, color: "hsl(220,70%,60%)" },
  { hue: 40, color: "hsl(40,70%,55%)" },
  { hue: 280, color: "hsl(280,70%,60%)" },
  { hue: 100, color: "hsl(100,60%,50%)" },
  { hue: 0, color: "hsl(0,70%,60%)" },
  { hue: 200, color: "hsl(200,70%,55%)" },
]

const INITIAL_OBJECTS: LabObject[] = [
  { id: genId(), label: "A", x: 80, y: 150, width: 70, height: 70, opacity: 1, color: "hsl(350,70%,60%)", hue: 350, shape: "circle", zIndex: 1, groupId: null, animation: null, animSpeed: 2, orbitTarget: null, objectType: "shape", imageSrc: null, buttonConfig: null, textContent: "", fontSize: 16, textAlign: "left", inputType: "text", inputValue: "", placeholder: "", timerDuration: 60, timerElapsed: 0, timerRunning: false, parentId: null, containerLayout: "free", containerPadding: 8, containerGap: 8, sliderMin: 0, sliderMax: 100, sliderValue: 50, sliderStep: 1, toggleState: false, toggleLabel: "", progressValue: 50, progressColor: "", dropdownOptions: [], dropdownSelected: "", dropdownOpen: false, counterValue: 0, counterLabel: "", counterStep: 1, outputValue: null },
  { id: genId(), label: "B", x: 220, y: 350, width: 70, height: 70, opacity: 1, color: "hsl(170,70%,55%)", hue: 170, shape: "square", zIndex: 2, groupId: null, animation: null, animSpeed: 2, orbitTarget: null, objectType: "shape", imageSrc: null, buttonConfig: null, textContent: "", fontSize: 16, textAlign: "left", inputType: "text", inputValue: "", placeholder: "", timerDuration: 60, timerElapsed: 0, timerRunning: false, parentId: null, containerLayout: "free", containerPadding: 8, containerGap: 8, sliderMin: 0, sliderMax: 100, sliderValue: 50, sliderStep: 1, toggleState: false, toggleLabel: "", progressValue: 50, progressColor: "", dropdownOptions: [], dropdownSelected: "", dropdownOpen: false, counterValue: 0, counterLabel: "", counterStep: 1, outputValue: null },
]

export const useLabStore = create<LabStore>()(
  persist(
    (set, get) => ({
      objects: INITIAL_OBJECTS,
      selectedId: INITIAL_OBJECTS[0].id,
      nextLetter: 2,

      // Canvas defaults
      canvasZoom: 1,
      canvasBg: "#0a0a14",
      showGrid: true,
      snapToGrid: false,
      gridSize: 20,
      playMode: false,

      // Presets
      presets: {},

      // Logic
      logicGraph: { nodes: [], listeners: [], wires: [], variables: {} } as LogicGraph,

      // Undo
      _history: [] as string[],
      _historyIndex: -1,

      addObject: (overrides) => {
        get()._pushSnapshot()
        const state = get()
        if (state.objects.length >= MAX_OBJECTS) return ""

        const { label, index } = nextAvailableLabel(state.objects, state.nextLetter)
        const colorIdx = state.objects.length % DEFAULT_COLORS.length
        const { hue, color } = DEFAULT_COLORS[colorIdx]

        // Spawn near center with random offset
        const cx = 160 + (Math.random() - 0.5) * 80
        const cy = 300 + (Math.random() - 0.5) * 100

        const newObj: LabObject = {
          id: genId(),
          label,
          x: Math.round(cx),
          y: Math.round(cy),
          width: 60,
          height: 60,
          opacity: 1,
          color,
          hue,
          shape: "circle",
          zIndex: state.objects.length + 1,
          groupId: null,
          animation: null,
          animSpeed: 2,
          orbitTarget: null,
          objectType: "shape" as ObjectType,
          imageSrc: null,
          buttonConfig: null,
          textContent: "",
          fontSize: 16,
          textAlign: "left" as const,
          inputType: "text" as const,
          inputValue: "",
          placeholder: "",
          timerDuration: 60,
          timerElapsed: 0,
          timerRunning: false,
          parentId: null,
          containerLayout: "free" as const,
          containerPadding: 8,
          containerGap: 8,
          sliderMin: 0,
          sliderMax: 100,
          sliderValue: 50,
          sliderStep: 1,
          toggleState: false,
          toggleLabel: "",
          progressValue: 50,
          progressColor: "",
          dropdownOptions: ["Option 1", "Option 2", "Option 3"],
          dropdownSelected: "",
          dropdownOpen: false,
          counterValue: 0,
          counterLabel: "",
          counterStep: 1,
          outputValue: null,
          ...overrides,
        }

        set({ objects: [...state.objects, newObj], selectedId: newObj.id, nextLetter: index })
        return newObj.id
      },

      duplicateObject: (id) => {
        get()._pushSnapshot()
        const state = get()
        const source = state.objects.find((o) => o.id === id)
        if (!source || state.objects.length >= MAX_OBJECTS) return null

        const { label, index } = nextAvailableLabel(state.objects, state.nextLetter)
        const newObj: LabObject = {
          ...source,
          id: genId(),
          label,
          x: source.x + 30,
          y: source.y + 30,
        }

        set({ objects: [...state.objects, newObj], selectedId: newObj.id, nextLetter: index })
        return newObj.id
      },

      deleteObject: (id) => {
        get()._pushSnapshot()
        const state = get()
        if (state.objects.length <= 1) return // Keep at least 1

        // Unparent children if deleting a container
        const remaining = state.objects
          .filter((o) => o.id !== id)
          .map((o) => o.parentId === id ? { ...o, parentId: null } : o)
        const newSelected = state.selectedId === id
          ? remaining[0]?.id || null
          : state.selectedId

        // Cleanup logic graph — remove wires referencing this object
        const cleanWires = state.logicGraph.wires.filter((w) => w.fromNodeId !== id && w.toNodeId !== id)

        set({ objects: remaining, selectedId: newSelected, logicGraph: { ...state.logicGraph, wires: cleanWires } })
      },

      updateObject: (id, updates) => {
        // Snapshot is NOT pushed here — callers that need undo
        // should call _pushSnapshot() themselves (e.g., voice commands).
        // Drag operations push once on pointerDown via pushDragSnapshot().
        set((state) => ({
          objects: state.objects.map((o) => {
            if (o.id !== id) return o
            const next = { ...o, ...updates }
            if (updates.hue !== undefined) {
              next.color = `hsl(${updates.hue},70%,60%)`
            }
            // Backward compat: if 'size' is passed (from voice), set both dimensions
            if ((updates as any).size !== undefined) {
              next.width = (updates as any).size
              next.height = (updates as any).size
            }
            // Ensure minimums
            if (next.width < 10) next.width = 10
            if (next.height < 10) next.height = 10
            // Pixel-perfect: round position and dimensions to integers
            if (updates.x !== undefined) next.x = Math.round(next.x)
            if (updates.y !== undefined) next.y = Math.round(next.y)
            if (updates.width !== undefined) next.width = Math.round(next.width)
            if (updates.height !== undefined) next.height = Math.round(next.height)
            return next
          }),
        }))
      },

      selectObject: (id) => set({ selectedId: id }),

      selectByLabel: (label) => {
        const obj = get().objects.find((o) => o.label.toLowerCase() === label.toLowerCase())
        if (obj) set({ selectedId: obj.id })
      },

      // Canvas
      setZoom: (level) => set({ canvasZoom: Math.round(Math.max(0.5, Math.min(2, level)) * 10) / 10 }),
      setBg: (color) => set({ canvasBg: color }),
      setShowGrid: (v) => set({ showGrid: v }),
      setSnapToGrid: (v) => set({ snapToGrid: v }),
      setPlayMode: (v) => set({ playMode: v }),
      clearCanvas: () => {
        get()._pushSnapshot()
        const obj: LabObject = { id: genId(), label: "A", x: 150, y: 300, width: 60, height: 60, opacity: 1, color: "hsl(220,70%,60%)", hue: 220, shape: "circle", zIndex: 1, groupId: null, animation: null, animSpeed: 2, orbitTarget: null, objectType: "shape", imageSrc: null, buttonConfig: null, textContent: "", fontSize: 16, textAlign: "left", inputType: "text", inputValue: "", placeholder: "", timerDuration: 60, timerElapsed: 0, timerRunning: false, parentId: null, containerLayout: "free", containerPadding: 8, containerGap: 8, sliderMin: 0, sliderMax: 100, sliderValue: 50, sliderStep: 1, toggleState: false, toggleLabel: "", progressValue: 50, progressColor: "", dropdownOptions: [], dropdownSelected: "", dropdownOpen: false, counterValue: 0, counterLabel: "", counterStep: 1, outputValue: null }
        set({ objects: [obj], selectedId: obj.id, nextLetter: 1 })
      },

      // Presets
      savePreset: (name) => {
        const { objects, canvasBg, logicGraph, presets } = get()
        set({ presets: { ...presets, [name]: { objects: objects.map((o) => ({ ...o })), canvasBg, logicGraph: { ...logicGraph } } } })
      },
      loadPreset: (name) => {
        const preset = get().presets[name]
        if (!preset) return false
        const restored = preset.objects.map((o) => ({ ...o, id: genId() }))
        set({ objects: restored, selectedId: restored[0]?.id || null, canvasBg: preset.canvasBg, nextLetter: restored.length, logicGraph: preset.logicGraph || { nodes: [], listeners: [], wires: [], variables: {} } })
        return true
      },

      // Logic CRUD
      addLogicBlock: (x = 200, y = 150, blockType: LogicBlockType = "if_else") => {
        get()._pushSnapshot()
        const id = "logic_" + Math.random().toString(36).slice(2, 6)
        const num = get().logicGraph.nodes.length + 1
        const typeLabels: Record<LogicBlockType, string> = { if_else: "IF", compare: "CMP", math: "Math", delay: "Delay", set_variable: "Set", get_variable: "Get", loop: "Loop", collision: "Hit" }
        const block: LogicBlock = { id, label: `${typeLabels[blockType]} ${num}`, x, y, blockType, condition: null }
        set((s) => ({ logicGraph: { ...s.logicGraph, nodes: [...s.logicGraph.nodes, block] } }))
        return id
      },
      deleteLogicBlock: (id) => {
        get()._pushSnapshot()
        set((s) => ({
          logicGraph: {
            ...s.logicGraph,
            nodes: s.logicGraph.nodes.filter((n) => n.id !== id),
            wires: s.logicGraph.wires.filter((w) => w.fromNodeId !== id && w.toNodeId !== id),
          },
        }))
      },
      updateLogicBlock: (id, updates) => {
        get()._pushSnapshot()
        set((s) => ({
          logicGraph: {
            ...s.logicGraph,
            nodes: s.logicGraph.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
          },
        }))
      },
      // Listener CRUD
      addListener: (listener) => {
        get()._pushSnapshot()
        const id = "listen_" + Math.random().toString(36).slice(2, 6)
        const num = (get().logicGraph.listeners || []).length + 1
        const full: ListenerNode = { ...listener, id, label: `Watch ${num}`, lastValue: undefined }
        set((s) => ({ logicGraph: { ...s.logicGraph, listeners: [...(s.logicGraph.listeners || []), full] } }))
        return id
      },
      deleteListener: (id) => {
        get()._pushSnapshot()
        set((s) => ({
          logicGraph: {
            ...s.logicGraph,
            listeners: (s.logicGraph.listeners || []).filter((l) => l.id !== id),
            wires: s.logicGraph.wires.filter((w) => w.fromNodeId !== id && w.toNodeId !== id),
          },
        }))
      },
      updateListener: (id, updates) => {
        get()._pushSnapshot()
        set((s) => ({
          logicGraph: {
            ...s.logicGraph,
            listeners: (s.logicGraph.listeners || []).map((l) => (l.id === id ? { ...l, ...updates } : l)),
          },
        }))
      },

      addWire: (wire) => {
        get()._pushSnapshot()
        const id = "wire_" + Math.random().toString(36).slice(2, 6)
        const full: Wire = { ...wire, id }
        set((s) => ({ logicGraph: { ...s.logicGraph, wires: [...s.logicGraph.wires, full] } }))
        return id
      },
      deleteWire: (id) => {
        get()._pushSnapshot()
        set((s) => ({ logicGraph: { ...s.logicGraph, wires: s.logicGraph.wires.filter((w) => w.id !== id) } }))
      },
      getWiresForNode: (nodeId) => {
        return get().logicGraph.wires.filter((w) => w.fromNodeId === nodeId || w.toNodeId === nodeId)
      },

      // Undo/Redo
      _pushSnapshot: () => {
        const { objects, logicGraph, canvasBg, canvasZoom, showGrid, snapToGrid, selectedId, _history, _historyIndex } = get()
        const snap = JSON.stringify({ objects, logicGraph, canvasBg, canvasZoom, showGrid, snapToGrid, selectedId })
        // Truncate future history if we're not at the end
        const trimmed = _history.slice(0, _historyIndex + 1)
        trimmed.push(snap)
        // Cap at 30
        if (trimmed.length > 30) trimmed.shift()
        set({ _history: trimmed, _historyIndex: trimmed.length - 1 })
      },
      undo: () => {
        const { _history, _historyIndex } = get()
        if (_historyIndex <= 0) return false
        const newIndex = _historyIndex - 1
        const snap = JSON.parse(_history[newIndex])
        set({ ...snap, _history, _historyIndex: newIndex })
        return true
      },
      redo: () => {
        const { _history, _historyIndex } = get()
        if (_historyIndex >= _history.length - 1) return false
        const newIndex = _historyIndex + 1
        const snap = JSON.parse(_history[newIndex])
        set({ ...snap, _history, _historyIndex: newIndex })
        return true
      },
      canUndo: () => get()._historyIndex > 0,
      canRedo: () => get()._historyIndex < get()._history.length - 1,

      // Project save/load
      exportProject: () => {
        const { objects, logicGraph, canvasBg, canvasZoom, showGrid, snapToGrid, gridSize } = get()
        const project = {
          version: 1,
          exportedAt: new Date().toISOString(),
          canvas: { canvasBg, canvasZoom, showGrid, snapToGrid, gridSize },
          objects: objects.map((o) => ({ ...o, imageSrc: null })),
          logicGraph,
        }
        return JSON.stringify(project, null, 2)
      },
      importProject: (json) => {
        get()._pushSnapshot()
        try {
          const project = JSON.parse(json)
          if (!project.objects || !Array.isArray(project.objects)) return false
          // Regenerate IDs to avoid conflicts
          const idMap = new Map<string, string>()
          const objects = project.objects.map((o: any) => {
            const newId = genId()
            idMap.set(o.id, newId)
            return { ...o, id: newId, imageSrc: null, outputValue: null }
          })
          // Remap logic graph IDs
          let logicGraph = project.logicGraph || { nodes: [], listeners: [], wires: [], variables: {} }
          logicGraph = {
            nodes: logicGraph.nodes.map((n: any) => ({ ...n, id: "logic_" + Math.random().toString(36).slice(2, 6) })),
            wires: logicGraph.wires.map((w: any) => ({
              ...w,
              id: "wire_" + Math.random().toString(36).slice(2, 6),
              fromNodeId: idMap.get(w.fromNodeId) || w.fromNodeId,
              toNodeId: idMap.get(w.toNodeId) || w.toNodeId,
            })),
          }
          // Remap logic block IDs in wires
          const oldLogicIds = (project.logicGraph?.nodes || []).map((n: any) => n.id)
          const newLogicIds = logicGraph.nodes.map((n: any) => n.id)
          for (let i = 0; i < oldLogicIds.length; i++) {
            logicGraph.wires = logicGraph.wires.map((w: any) => ({
              ...w,
              fromNodeId: w.fromNodeId === oldLogicIds[i] ? newLogicIds[i] : w.fromNodeId,
              toNodeId: w.toNodeId === oldLogicIds[i] ? newLogicIds[i] : w.toNodeId,
            }))
          }
          const canvas = project.canvas || {}
          set({
            objects,
            selectedId: objects[0]?.id || null,
            nextLetter: objects.length,
            logicGraph,
            canvasBg: canvas.canvasBg || "#0a0a14",
            canvasZoom: canvas.canvasZoom || 1,
            showGrid: canvas.showGrid ?? true,
            snapToGrid: canvas.snapToGrid ?? false,
          })
          return true
        } catch { return false }
      },

      resetAll: () => {
        const fresh = INITIAL_OBJECTS.map((o) => ({ ...o, id: genId() }))
        set({ objects: fresh, selectedId: fresh[0].id, nextLetter: 2, canvasZoom: 1, canvasBg: "#0a0a14", showGrid: true, snapToGrid: false, logicGraph: { nodes: [], listeners: [], wires: [], variables: {} } })
      },
    }),
    {
      name: "aria-lab-state-v2",
      partialize: (state) => ({
        objects: state.objects.map((o) => ({ ...o, imageSrc: null })),
        logicGraph: state.logicGraph,
        selectedId: state.selectedId,
        nextLetter: state.nextLetter,
        canvasZoom: state.canvasZoom,
        canvasBg: state.canvasBg,
        showGrid: state.showGrid,
        snapToGrid: state.snapToGrid,
        // Strip imageSrc from presets too
        presets: Object.fromEntries(
          Object.entries(state.presets).map(([k, v]) => [k, { ...v, objects: v.objects.map((o) => ({ ...o, imageSrc: null })) }])
        ),
      }),
    }
  )
)
