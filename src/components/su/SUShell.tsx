"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { getAriaEngine } from "@/lib/aria/engine"
import { useGameVoiceStore } from "@/store/gameVoice"
import { useLabStore, type LabObject, type ButtonConfig } from "@/store/lab"
import { trainingLogger } from "@/lib/trainingLogger"
import { executeFromSource, hasLogicWires } from "@/lib/logicEngine"
import { graphToBehaviors, behaviorToGraph, removeBehaviorFromGraph, BEHAVIOR_PRESETS, type Behavior } from "@/lib/behaviorSync"
import { getAvailableRecipes, executeStep, type Recipe, type RunnerState } from "@/lib/recipeRunner"
import { initRecipes } from "@/lib/recipes"
import { LogicEditor } from "./LogicEditor"
import { ColorPicker } from "./ColorPicker"
import type { PersonaConfig } from "@/lib/aria/persona"

// ── Debug Entry ──
interface DebugEntry {
  id: string
  timestamp: string
  message: string
  type: "signal" | "conversion" | "connection" | "system" | "voice" | "error"
}

// ── Voice function declarations — split by context ──

// Shared across all views
const SHARED_FUNCTIONS = [
  { name: "select_object", description: "Select by label", parameters: { type: "object", properties: { label: { type: "string" } }, required: ["label"] } },
  { name: "get_state", description: "Show states", parameters: { type: "object", properties: {} } },
  { name: "list_objects", description: "List all", parameters: { type: "object", properties: {} } },
  { name: "clipboard_copy", description: "Copy clipboard", parameters: { type: "object", properties: { text: { type: "string" } } } },
  { name: "toggle_torch", description: "Flashlight", parameters: { type: "object", properties: { on: { type: "boolean" } }, required: ["on"] } },
  { name: "check_battery", description: "Battery", parameters: { type: "object", properties: {} } },
  { name: "set_volume", description: "Volume", parameters: { type: "object", properties: { level: { type: "number" } }, required: ["level"] } },
]

// Canvas view — object manipulation, creation, canvas controls
const CANVAS_FUNCTIONS = [
  // Object manipulation
  { name: "set_size", description: "Set size", parameters: { type: "object", properties: { size: { type: "number" } }, required: ["size"] } },
  { name: "set_color", description: "Set color", parameters: { type: "object", properties: { color: { type: "string" } }, required: ["color"] } },
  { name: "set_opacity", description: "Set opacity 0-1", parameters: { type: "object", properties: { opacity: { type: "number" } }, required: ["opacity"] } },
  { name: "move_object", description: "Move direction", parameters: { type: "object", properties: { direction: { type: "string" }, pixels: { type: "number" } }, required: ["direction"] } },
  { name: "set_position", description: "Set x,y", parameters: { type: "object", properties: { x: { type: "number" }, y: { type: "number" } }, required: ["x", "y"] } },
  { name: "transform_shape", description: "Set shape", parameters: { type: "object", properties: { shape: { type: "string" } }, required: ["shape"] } },
  { name: "set_width", description: "Set width", parameters: { type: "object", properties: { width: { type: "number" } }, required: ["width"] } },
  { name: "set_height", description: "Set height", parameters: { type: "object", properties: { height: { type: "number" } }, required: ["height"] } },
  { name: "rename_object", description: "Rename", parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  // CRUD
  { name: "add_object", description: "Create object", parameters: { type: "object", properties: { shape: { type: "string" }, color: { type: "string" } } } },
  { name: "duplicate_object", description: "Duplicate", parameters: { type: "object", properties: {} } },
  { name: "delete_object", description: "Delete", parameters: { type: "object", properties: {} } },
  { name: "reset_objects", description: "Reset all", parameters: { type: "object", properties: {} } },
  // Config
  { name: "open_config", description: "Open config", parameters: { type: "object", properties: {} } },
  { name: "close_config", description: "Close config", parameters: { type: "object", properties: {} } },
  { name: "edit_shape", description: "Resize handles on", parameters: { type: "object", properties: {} } },
  { name: "done_editing", description: "Resize handles off", parameters: { type: "object", properties: {} } },
  // Canvas
  { name: "zoom_canvas", description: "Zoom 0.5-2", parameters: { type: "object", properties: { level: { type: "number" } }, required: ["level"] } },
  { name: "set_background", description: "Background color", parameters: { type: "object", properties: { color: { type: "string" } }, required: ["color"] } },
  { name: "toggle_grid", description: "Grid on/off", parameters: { type: "object", properties: { visible: { type: "boolean" } }, required: ["visible"] } },
  { name: "clear_canvas", description: "Clear all", parameters: { type: "object", properties: {} } },
  { name: "snap_to_grid", description: "Snap on/off", parameters: { type: "object", properties: { enabled: { type: "boolean" } }, required: ["enabled"] } },
  // Presets
  { name: "save_preset", description: "Save layout", parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "load_preset", description: "Load layout", parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  // Project
  { name: "save_project", description: "Export project as file", parameters: { type: "object", properties: { name: { type: "string" } } } },
  { name: "load_project", description: "Import project from file", parameters: { type: "object", properties: {} } },
  // Text
  { name: "add_text", description: "Add text label", parameters: { type: "object", properties: { text: { type: "string" }, size: { type: "number" } } } },
  { name: "set_text", description: "Set text content", parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } },
  // Undo
  // Input
  { name: "add_input", description: "Add input field", parameters: { type: "object", properties: { input_type: { type: "string" }, placeholder: { type: "string" } } } },
  { name: "set_placeholder", description: "Set input placeholder", parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } },
  // Timer
  { name: "add_timer", description: "Add countdown timer", parameters: { type: "object", properties: { duration: { type: "number" } } } },
  { name: "start_timer", description: "Start selected timer", parameters: { type: "object", properties: {} } },
  { name: "stop_timer", description: "Stop selected timer", parameters: { type: "object", properties: {} } },
  { name: "reset_timer", description: "Reset selected timer", parameters: { type: "object", properties: {} } },
  // Undo
  { name: "undo", description: "Undo last action", parameters: { type: "object", properties: {} } },
  { name: "redo", description: "Redo last undo", parameters: { type: "object", properties: {} } },
  // Relationships
  { name: "align_objects", description: "Align all", parameters: { type: "object", properties: { axis: { type: "string" } }, required: ["axis"] } },
  { name: "set_layer", description: "Layer order", parameters: { type: "object", properties: { position: { type: "string" } }, required: ["position"] } },
  { name: "group_objects", description: "Group by labels", parameters: { type: "object", properties: { labels: { type: "string" } }, required: ["labels"] } },
  { name: "ungroup_objects", description: "Ungroup", parameters: { type: "object", properties: {} } },
  { name: "distribute_evenly", description: "Space evenly", parameters: { type: "object", properties: { axis: { type: "string" } }, required: ["axis"] } },
  { name: "export_layout", description: "Export json/css/html", parameters: { type: "object", properties: { format: { type: "string" } }, required: ["format"] } },
  // Animation
  { name: "animate", description: "Animate spin/bounce/pulse", parameters: { type: "object", properties: { type: { type: "string" }, speed: { type: "number" } }, required: ["type"] } },
  { name: "stop_animation", description: "Stop animation", parameters: { type: "object", properties: {} } },
  { name: "orbit", description: "Orbit around label", parameters: { type: "object", properties: { target: { type: "string" }, speed: { type: "number" } }, required: ["target"] } },
  // Device
  { name: "send_notification", description: "Notify", parameters: { type: "object", properties: { title: { type: "string" }, text: { type: "string" } }, required: ["title", "text"] } },
  // Typed creation
  { name: "add_image", description: "Add image container", parameters: { type: "object", properties: {} } },
  { name: "add_button", description: "Add interactive button", parameters: { type: "object", properties: { button_label: { type: "string" }, target: { type: "string" }, action: { type: "string" } } } },
  { name: "set_image", description: "Set image source", parameters: { type: "object", properties: { source: { type: "string" } }, required: ["source"] } },
  { name: "take_photo", description: "Camera photo", parameters: { type: "object", properties: {} } },
  // New object types
  { name: "add_slider", description: "Add a slider control", parameters: { type: "object", properties: { min: { type: "number" }, max: { type: "number" } } } },
  { name: "set_slider_value", description: "Set slider value", parameters: { type: "object", properties: { value: { type: "number" } }, required: ["value"] } },
  { name: "add_toggle", description: "Add a toggle switch", parameters: { type: "object", properties: { label: { type: "string" } } } },
  { name: "set_toggle", description: "Set toggle on/off", parameters: { type: "object", properties: { on: { type: "boolean" } }, required: ["on"] } },
  { name: "add_progress", description: "Add a progress bar", parameters: { type: "object", properties: {} } },
  { name: "set_progress", description: "Set progress 0-100", parameters: { type: "object", properties: { value: { type: "number" } }, required: ["value"] } },
  { name: "add_dropdown", description: "Add a dropdown select", parameters: { type: "object", properties: { options: { type: "string" } } } },
  { name: "set_options", description: "Set dropdown options (comma separated)", parameters: { type: "object", properties: { options: { type: "string" } }, required: ["options"] } },
  { name: "select_option", description: "Select a dropdown option", parameters: { type: "object", properties: { option: { type: "string" } }, required: ["option"] } },
  { name: "add_counter", description: "Add a counter display", parameters: { type: "object", properties: { label: { type: "string" } } } },
  { name: "increment_counter", description: "Increment counter", parameters: { type: "object", properties: {} } },
  { name: "decrement_counter", description: "Decrement counter", parameters: { type: "object", properties: {} } },
  { name: "reset_counter", description: "Reset counter to 0", parameters: { type: "object", properties: {} } },
  // Container
  { name: "add_container", description: "Add a container to group objects", parameters: { type: "object", properties: { layout: { type: "string" } } } },
  { name: "set_layout", description: "Set container layout: free, vertical, horizontal", parameters: { type: "object", properties: { layout: { type: "string" } }, required: ["layout"] } },
  { name: "add_to_container", description: "Move object into a container", parameters: { type: "object", properties: { object_label: { type: "string" }, container_label: { type: "string" } }, required: ["object_label", "container_label"] } },
  { name: "remove_from_container", description: "Remove object from its container", parameters: { type: "object", properties: { label: { type: "string" } }, required: ["label"] } },
  // Behaviors
  { name: "create_behavior", description: "Create a WHEN/THEN behavior between objects", parameters: { type: "object", properties: { source_label: { type: "string" }, trigger: { type: "string" }, target_label: { type: "string" }, property: { type: "string" }, value: { type: "string" } }, required: ["source_label", "target_label"] } },
  { name: "list_behaviors", description: "List behaviors on selected object", parameters: { type: "object", properties: {} } },
  // Navigation
  { name: "open_logic_editor", description: "Open logic editor for any object", parameters: { type: "object", properties: {} } },
]

// Logic editor view — wiring, blocks, configuration
const LOGIC_FUNCTIONS = [
  { name: "add_logic_block", description: "Add IF/ELSE logic block", parameters: { type: "object", properties: { block_type: { type: "string" } } } },
  { name: "add_compare_block", description: "Add comparison block (bool output)", parameters: { type: "object", properties: {} } },
  { name: "add_math_block", description: "Add math block (+,-,x,/)", parameters: { type: "object", properties: { operation: { type: "string" }, value: { type: "number" } } } },
  { name: "add_delay_block", description: "Add delay/wait block", parameters: { type: "object", properties: { ms: { type: "number" } } } },
  { name: "set_variable", description: "Add set variable block", parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "get_variable", description: "Add get variable block", parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "add_loop_block", description: "Add loop/repeat block", parameters: { type: "object", properties: { count: { type: "number" } } } },
  { name: "configure_math", description: "Configure math block operands", parameters: { type: "object", properties: { label: { type: "string" }, operation: { type: "string" }, left_object: { type: "string" }, left_property: { type: "string" }, right_object: { type: "string" }, right_property: { type: "string" }, value: { type: "number" } }, required: ["label"] } },
  { name: "delete_logic_block", description: "Delete a logic block", parameters: { type: "object", properties: { label: { type: "string" } }, required: ["label"] } },
  { name: "connect_wire", description: "Connect two nodes with a wire", parameters: { type: "object", properties: { from_label: { type: "string" }, to_label: { type: "string" }, to_port: { type: "string" } }, required: ["from_label", "to_label"] } },
  { name: "disconnect_wire", description: "Remove wire between nodes", parameters: { type: "object", properties: { from_label: { type: "string" }, to_label: { type: "string" } }, required: ["from_label", "to_label"] } },
  { name: "configure_logic", description: "Set condition on a logic block", parameters: { type: "object", properties: { label: { type: "string" }, operator: { type: "string" }, value: { type: "number" }, then_property: { type: "string" }, then_value: { type: "number" }, else_property: { type: "string" }, else_value: { type: "number" } }, required: ["label"] } },
  { name: "add_canvas_object", description: "Add existing canvas object to logic graph", parameters: { type: "object", properties: { label: { type: "string" } }, required: ["label"] } },
  { name: "add_listener", description: "Add a property watcher/listener", parameters: { type: "object", properties: { object_label: { type: "string" }, property: { type: "string" }, trigger: { type: "string" } }, required: ["object_label"] } },
  { name: "delete_listener", description: "Remove a listener", parameters: { type: "object", properties: { label: { type: "string" } }, required: ["label"] } },
  { name: "close_logic_editor", description: "Close logic editor, back to canvas", parameters: { type: "object", properties: {} } },
  { name: "show_logic_state", description: "Show all blocks, wires, listeners, conditions", parameters: { type: "object", properties: {} } },
]

// Combined for current context — computed at render time
const OBJECT_FUNCTIONS = [...SHARED_FUNCTIONS, ...CANVAS_FUNCTIONS]

// Helper to get functions for a given context
type ViewContext = "canvas" | "logic"
function getFunctionsForContext(ctx: ViewContext) {
  return ctx === "logic"
    ? [...SHARED_FUNCTIONS, ...LOGIC_FUNCTIONS]
    : [...SHARED_FUNCTIONS, ...CANVAS_FUNCTIONS]
}


const COLOR_MAP: Record<string, number> = {
  red: 0, orange: 30, yellow: 60, green: 120, cyan: 180,
  blue: 240, purple: 270, pink: 330, white: 0,
}

function compareForListener(val: any, threshold: any, op: string): boolean {
  switch (op) {
    case "==": return val == threshold
    case "!=": return val != threshold
    case ">": return Number(val) > Number(threshold)
    case "<": return Number(val) < Number(threshold)
    case ">=": return Number(val) >= Number(threshold)
    case "<=": return Number(val) <= Number(threshold)
    case "contains": return String(val).includes(String(threshold))
    default: return false
  }
}

export default function SUShell() {
  const [authorized, setAuthorized] = useState(false)
  const [authCode, setAuthCode] = useState("")
  const [configOpen, setConfigOpen] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [creationDrawer, setCreationDrawer] = useState(false)
  const [logicEditorFor, setLogicEditorFor] = useState<string | null>(null)
  const [inlineEditId, setInlineEditId] = useState<string | null>(null) // Phase 1A: text inline editing
  const [actionDrawer, setActionDrawer] = useState(false)
  const [tutorialBrowser, setTutorialBrowser] = useState(false)
  const [tutorialRunner, setTutorialRunner] = useState<{ recipe: any; stepIndex: number; running: boolean } | null>(null)
  const logicGraph = useLabStore((s) => s.logicGraph) // shape edit mode with resize handles
  const [debugLog, setDebugLog] = useState<DebugEntry[]>([])
  const [showDebug, setShowDebug] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const lastTapRef = useRef<{ id: string; time: number }>({ id: "", time: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const handleDragRef = useRef<{ id: string; handle: string; startX: number; startY: number; startW: number; startH: number; startObjX: number; startObjY: number } | null>(null)

  // ── Lab Store ──
  const objects = useLabStore((s) => s.objects)
  const selectedId = useLabStore((s) => s.selectedId)
  const selectObject = useLabStore((s) => s.selectObject)
  const selectByLabel = useLabStore((s) => s.selectByLabel)
  const updateObject = useLabStore((s) => s.updateObject)
  const addObject = useLabStore((s) => s.addObject)
  const duplicateObject = useLabStore((s) => s.duplicateObject)
  const deleteObject = useLabStore((s) => s.deleteObject)
  const resetAll = useLabStore((s) => s.resetAll)
  const canvasZoom = useLabStore((s) => s.canvasZoom)
  const canvasBg = useLabStore((s) => s.canvasBg)
  const showGrid = useLabStore((s) => s.showGrid)
  const snapToGrid = useLabStore((s) => s.snapToGrid)
  const gridSize = useLabStore((s) => s.gridSize)
  const setZoom = useLabStore((s) => s.setZoom)
  const setBg = useLabStore((s) => s.setBg)
  const setShowGrid = useLabStore((s) => s.setShowGrid)
  const setSnapToGrid = useLabStore((s) => s.setSnapToGrid)
  const clearCanvas = useLabStore((s) => s.clearCanvas)
  const playMode = useLabStore((s) => s.playMode)
  const setPlayMode = useLabStore((s) => s.setPlayMode)
  const savePreset = useLabStore((s) => s.savePreset)
  const loadPreset = useLabStore((s) => s.loadPreset)
  const exportProject = useLabStore((s) => s.exportProject)
  const importProject = useLabStore((s) => s.importProject)
  const undo = useLabStore((s) => s.undo)
  const redo = useLabStore((s) => s.redo)

  // Phase 1B: Image gallery helpers
  const saveToImageGallery = useCallback((dataUrl: string) => {
    if (!dataUrl || !dataUrl.startsWith("data:")) return
    try {
      const stored = JSON.parse(localStorage.getItem("su_image_gallery") || "[]") as string[]
      const filtered = stored.filter((s) => s !== dataUrl) // deduplicate
      filtered.unshift(dataUrl)
      localStorage.setItem("su_image_gallery", JSON.stringify(filtered.slice(0, 8)))
    } catch {}
  }, [])
  const getImageGallery = useCallback((): string[] => {
    try { return JSON.parse(localStorage.getItem("su_image_gallery") || "[]") } catch { return [] }
  }, [])

  // Refs for stable closure access
  const objectsRef = useRef(objects)
  const selectedRef = useRef(selectedId)
  const lastUtteranceRef = useRef("")
  useEffect(() => { objectsRef.current = objects }, [objects])

  // Timer tick — update running timers every second
  useEffect(() => {
    const hasRunning = objects.some((o) => o.objectType === "timer" && o.timerRunning)
    if (!hasRunning) return
    const interval = setInterval(() => {
      const objs = useLabStore.getState().objects
      for (const obj of objs) {
        if (obj.objectType === "timer" && obj.timerRunning) {
          const newElapsed = (obj.timerElapsed || 0) + 1
          const remaining = Math.max(0, (obj.timerDuration || 60) - newElapsed)
          useLabStore.getState().updateObject(obj.id, { timerElapsed: newElapsed, outputValue: remaining } as any)
          if (remaining <= 0) {
            useLabStore.getState().updateObject(obj.id, { timerRunning: false } as any)
          }
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [objects.filter((o) => o.timerRunning).length])
  useEffect(() => { selectedRef.current = selectedId }, [selectedId])

  // Listener engine — detect property changes and fire listener wires
  const prevObjectsRef = useRef<string>("")
  useEffect(() => {
    const state = useLabStore.getState()
    const listeners = state.logicGraph.listeners || []
    if (listeners.length === 0) return

    const currentSnap = JSON.stringify(objects.map((o) => ({ id: o.id, props: { opacity: o.opacity, color: o.color, width: o.width, height: o.height, sliderValue: o.sliderValue, toggleState: o.toggleState, progressValue: o.progressValue, dropdownSelected: o.dropdownSelected, counterValue: o.counterValue, inputValue: o.inputValue, timerRunning: o.timerRunning, timerElapsed: o.timerElapsed, outputValue: o.outputValue } })))
    const prevSnap = prevObjectsRef.current
    prevObjectsRef.current = currentSnap
    if (!prevSnap || prevSnap === currentSnap) return

    const prev = JSON.parse(prevSnap) as Array<{ id: string; props: Record<string, any> }>
    const curr = JSON.parse(currentSnap) as Array<{ id: string; props: Record<string, any> }>

    for (const listener of listeners) {
      const prevObj = prev.find((o) => o.id === listener.watchObjectId)
      const currObj = curr.find((o) => o.id === listener.watchObjectId)
      if (!prevObj || !currObj) continue

      const prevVal = prevObj.props[listener.watchProperty]
      const currVal = currObj.props[listener.watchProperty]

      let shouldFire = false

      if (listener.triggerType === "on_change") {
        shouldFire = prevVal !== currVal
      } else if (listener.triggerType === "on_threshold") {
        const threshold = listener.thresholdValue ?? 0
        const op = listener.thresholdOperator || ">"
        const prevMet = compareForListener(prevVal, threshold, op)
        const currMet = compareForListener(currVal, threshold, op)
        shouldFire = !prevMet && currMet // crossed the threshold
      }

      if (shouldFire) {
        executeFromSource(listener.id, currVal, state.logicGraph, objects, state.updateObject)
      }
    }
  }, [objects])

  // on_interval listeners — separate timer
  useEffect(() => {
    const state = useLabStore.getState()
    const intervalListeners = (state.logicGraph.listeners || []).filter((l) => l.triggerType === "on_interval")
    if (intervalListeners.length === 0) return

    const intervals = intervalListeners.map((listener) => {
      return setInterval(() => {
        const s = useLabStore.getState()
        const obj = s.objects.find((o) => o.id === listener.watchObjectId)
        if (!obj) return
        const val = (obj as any)[listener.watchProperty] ?? null
        executeFromSource(listener.id, val, s.logicGraph, s.objects, s.updateObject)
      }, listener.intervalMs || 1000)
    })

    return () => intervals.forEach(clearInterval)
  }, [(logicGraph.listeners || []).filter((l) => l.triggerType === "on_interval").length])

  const isConnected = useGameVoiceStore((s) => s.isConnected)

  // Auth check + recipe init
  useEffect(() => {
    initRecipes()
    if (typeof window !== "undefined" && localStorage.getItem("aria_su_authorized") === "true") {
      setAuthorized(true)
    }
  }, [])

  // ── Debug Logger ──
  const addDebug = useCallback((message: string, type: DebugEntry["type"] = "signal") => {
    setDebugLog((prev) => {
      const entry: DebugEntry = { id: crypto.randomUUID(), timestamp: new Date().toLocaleTimeString(), message, type }
      const next = [...prev, entry]
      return next.length > 80 ? next.slice(-80) : next
    })
  }, [])

  // ── Voice Function Handler ──
  const handleFunction = useCallback(async (name: string, args: Record<string, any>): Promise<{ narrative: string }> => {
    // Read fresh state from store — refs may be stale during recipe execution
    const sel = useLabStore.getState().selectedId
    const objs = useLabStore.getState().objects
    const selObj = sel ? objs.find((o) => o.id === sel) : null

    addDebug(`\u{1F3A4} VOICE: ${name}(${JSON.stringify(args)})`, "voice")

    // Snapshot for undo — skip for:
    // - Read-only: undo, redo, get_state, list_objects, show_logic_state
    // - Store-managed (these call _pushSnapshot internally): add_object, duplicate_object,
    //   delete_object, reset_objects, clear_canvas, add_logic_block, delete_logic_block,
    //   update_logic_block (was: configure_logic), add_wire (was: connect_wire),
    //   delete_wire (was: disconnect_wire), add_image, add_button, add_text, add_input, add_timer
    const SKIP_SNAPSHOT = [
      "undo", "redo", "get_state", "list_objects", "show_logic_state",
      "add_object", "duplicate_object", "delete_object", "reset_objects", "clear_canvas",
      "add_logic_block", "add_compare_block", "add_math_block", "add_delay_block", "add_collision_block",
      "set_variable", "get_variable", "add_loop_block",
      "add_listener", "delete_listener",
      "configure_math",
      "delete_logic_block", "configure_logic", "connect_wire", "disconnect_wire",
      "add_image", "add_button", "add_text", "add_input", "add_timer", "add_container",
      "add_slider", "add_toggle", "add_progress", "add_dropdown", "add_counter",
      "open_config", "close_config", "open_logic_editor", "close_logic_editor",
      "save_preset", "save_project", "load_project", "load_preset", "export_layout",
      "toggle_torch", "check_battery", "send_notification", "clipboard_copy",
      "add_canvas_object",
    ]
    if (!SKIP_SNAPSHOT.includes(name)) {
      useLabStore.getState()._pushSnapshot()
    }

    switch (name) {
      case "set_size": {
        if (!sel) return { narrative: "No object selected" }
        const size = Math.max(10, Math.min(300, args.size))
        addDebug(`\u{1F517} ROUTE: voice \u2192 ${selObj?.label}.size = ${size}`, "connection")
        updateObject(sel, { width: size, height: size } as any)
        return { narrative: `Size set to ${size}px` }
      }
      case "set_color": {
        if (!sel) return { narrative: "No object selected" }
        const colorInput = String(args.color).toLowerCase()
        let hue: number
        if (COLOR_MAP[colorInput] !== undefined) {
          hue = COLOR_MAP[colorInput]
        } else {
          hue = Math.max(0, Math.min(360, parseInt(args.color) || 0))
        }
        const color = colorInput === "white" ? "hsl(0,0%,90%)" : colorInput === "black" ? "hsl(0,0%,10%)" : colorInput === "gray" || colorInput === "grey" ? "hsl(0,0%,40%)" : `hsl(${hue},70%,60%)`
        addDebug(`\u{1F517} ROUTE: voice \u2192 ${selObj?.label}.color = ${color}`, "connection")
        updateObject(sel, { hue, color })
        return { narrative: `Color set to ${colorInput}` }
      }
      case "set_opacity": {
        if (!sel) return { narrative: "No object selected" }
        let opacity = args.opacity
        if (opacity > 1) opacity = opacity / 100
        opacity = Math.max(0, Math.min(1, opacity))
        addDebug(`\u{1F517} ROUTE: voice \u2192 ${selObj?.label}.opacity = ${opacity}`, "connection")
        updateObject(sel, { opacity })
        return { narrative: `Opacity set to ${(opacity * 100).toFixed(0)}%` }
      }
      case "move_object": {
        if (!sel || !selObj) return { narrative: "No object selected" }
        const px = args.pixels || 30
        const dir = String(args.direction).toLowerCase()
        let { x, y } = selObj
        if (dir === "up") y -= px
        else if (dir === "down") y += px
        else if (dir === "left") x -= px
        else if (dir === "right") x += px
        addDebug(`\u{1F517} ROUTE: voice \u2192 ${selObj.label}.pos (${dir} ${px}px)`, "connection")
        updateObject(sel, { x: Math.max(0, x), y: Math.max(0, y) })
        return { narrative: `Moved ${dir} ${px}px` }
      }
      case "set_position": {
        if (!sel) return { narrative: "No object selected" }
        addDebug(`\u{1F517} ROUTE: voice \u2192 ${selObj?.label}.pos = (${args.x}, ${args.y})`, "connection")
        updateObject(sel, { x: args.x, y: args.y })
        return { narrative: `Position set to (${args.x}, ${args.y})` }
      }
      case "transform_shape": {
        if (!sel) return { narrative: "No object selected" }
        const shape = args.shape as LabObject["shape"]
        if (!["circle", "square", "triangle"].includes(shape)) return { narrative: "Unknown shape" }
        addDebug(`\u{1F517} ROUTE: voice \u2192 ${selObj?.label}.shape = ${shape}`, "connection")
        updateObject(sel, { shape })
        return { narrative: `Shape changed to ${shape}` }
      }
      case "select_object": {
        const label = String(args.label || args.object || "").toUpperCase()
        selectByLabel(label)
        addDebug(`\u{1F3AF} SELECT: "${label}"`, "system")
        return { narrative: `Selected ${label}` }
      }
      case "get_state": {
        const state = objs.map((o) => `${o.label}: (${Math.round(o.x)},${Math.round(o.y)}) ${o.width}x${o.height} ${o.shape} ${(o.opacity * 100).toFixed(0)}%`)
        return { narrative: state.join("\n") }
      }
      case "reset_objects": {
        resetAll()
        addDebug(`\u{1F504} RESET: All objects restored`, "system")
        return { narrative: "Reset to initial state" }
      }
      case "add_object": {
        const shape = (args.shape as LabObject["shape"]) || "circle"
        const overrides: Partial<LabObject> = { shape }
        if (args.color) {
          const c = String(args.color).toLowerCase()
          if (c === "black") {
            overrides.hue = 0
            overrides.color = "hsl(0,0%,10%)"
          } else if (c === "white") {
            overrides.hue = 0
            overrides.color = "hsl(0,0%,90%)"
          } else if (c === "gray" || c === "grey") {
            overrides.hue = 0
            overrides.color = "hsl(0,0%,40%)"
          } else {
            const hue = COLOR_MAP[c] !== undefined ? COLOR_MAP[c] : parseInt(args.color) || 0
            overrides.hue = hue
            overrides.color = `hsl(${hue},70%,60%)`
          }
        }
        const newId = addObject(overrides)
        if (!newId) return { narrative: "Max 20 objects reached" }
        const newObj = useLabStore.getState().objects.find((o) => o.id === newId)
        addDebug(`\u{2795} ADD: ${newObj?.label} (${shape})`, "system")
        return { narrative: `Created ${newObj?.label} (${shape})` }
      }
      case "duplicate_object": {
        if (!sel) return { narrative: "No object selected" }
        const newId = duplicateObject(sel)
        if (!newId) return { narrative: "Max 20 objects reached" }
        const newObj = useLabStore.getState().objects.find((o) => o.id === newId)
        addDebug(`\u{1F4CB} DUPLICATE: ${selObj?.label} \u2192 ${newObj?.label}`, "connection")
        return { narrative: `Duplicated as ${newObj?.label}` }
      }
      case "delete_object": {
        if (!sel) return { narrative: "No object selected" }
        if (objs.length <= 1) return { narrative: "Can't delete the last object" }
        const label = selObj?.label
        deleteObject(sel)
        addDebug(`\u{1F5D1} DELETE: ${label}`, "system")
        return { narrative: `Deleted ${label}` }
      }
      case "list_objects": {
        const list = objs.map((o) => `${o.label} (${o.shape})`).join(", ")
        return { narrative: `${objs.length} objects: ${list}` }
      }
      case "open_config": {
        if (sel) setConfigOpen(sel)
        return { narrative: `Config opened for ${selObj?.label}` }
      }
      case "close_config": {
        setConfigOpen(null)
        return { narrative: "Config closed" }
      }
      case "rename_object": {
        if (!sel) return { narrative: "No object selected" }
        const newName = String(args.name).slice(0, 12)
        updateObject(sel, { label: newName })
        addDebug(`\u{270f}\ufe0f RENAME: ${selObj?.label} \u2192 "${newName}"`, "connection")
        return { narrative: `Renamed to "${newName}"` }
      }
      case "edit_shape": {
        setEditMode(true)
        addDebug(`\u{270f}\ufe0f EDIT MODE: ON \u2014 resize handles visible`, "system")
        return { narrative: "Edit mode on. Drag corners to resize, drag sides to stretch." }
      }
      case "done_editing": {
        setEditMode(false)
        addDebug(`\u{270f}\ufe0f EDIT MODE: OFF`, "system")
        return { narrative: "Edit mode off" }
      }
      case "set_width": {
        if (!sel) return { narrative: "No object selected" }
        const w = Math.max(10, Math.min(500, args.width))
        updateObject(sel, { width: w })
        addDebug(`\u{1F517} ROUTE: voice \u2192 ${selObj?.label}.width = ${w}`, "connection")
        return { narrative: `Width set to ${w}px` }
      }
      case "set_height": {
        if (!sel) return { narrative: "No object selected" }
        const h = Math.max(10, Math.min(500, args.height))
        updateObject(sel, { height: h })
        addDebug(`\u{1F517} ROUTE: voice \u2192 ${selObj?.label}.height = ${h}`, "connection")
        return { narrative: `Height set to ${h}px` }
      }

      // ── Canvas commands ──
      case "zoom_canvas": {
        let level = args.level
        // Handle relative: if level is small (like 0.2), treat as delta from current
        // If level > 3, treat as percentage (150 = 1.5x)
        if (level > 3) level = level / 100
        level = Math.round(Math.max(0.5, Math.min(2, level)) * 10) / 10 // Clamp 0.5-2x, round to 0.1
        setZoom(level)
        addDebug(`\u{1F50D} ZOOM: ${(level * 100).toFixed(0)}%`, "system")
        return { narrative: `Zoom ${(level * 100).toFixed(0)}%` }
      }
      case "set_background": {
        const c = String(args.color).toLowerCase()
        let bg = args.color
        if (COLOR_MAP[c] !== undefined) bg = `hsl(${COLOR_MAP[c]},30%,10%)`
        else if (c === "white") bg = "#e0e0e0"
        else if (c === "black" || c === "dark") bg = "#0a0a14"
        setBg(bg)
        addDebug(`\u{1F3A8} BG: ${bg}`, "system")
        return { narrative: `Background set to ${c}` }
      }
      case "toggle_grid": {
        const visible = args.visible !== false
        setShowGrid(visible)
        addDebug(`\u{1F4CF} GRID: ${visible ? "ON" : "OFF"}`, "system")
        return { narrative: `Grid ${visible ? "shown" : "hidden"}` }
      }
      case "clear_canvas": {
        clearCanvas()
        addDebug(`\u{1F5D1} CLEAR: Canvas cleared`, "system")
        return { narrative: "Canvas cleared" }
      }
      case "snap_to_grid": {
        const enabled = args.enabled !== false
        setSnapToGrid(enabled)
        addDebug(`\u{1F9F2} SNAP: ${enabled ? "ON" : "OFF"}`, "system")
        return { narrative: `Snap to grid ${enabled ? "enabled" : "disabled"}` }
      }

      // ── Preset commands ──
      case "save_preset": {
        const pName = String(args.name).slice(0, 30)
        savePreset(pName)
        addDebug(`\u{1F4BE} SAVE PRESET: "${pName}"`, "system")
        return { narrative: `Layout saved as "${pName}"` }
      }
      case "load_preset": {
        const pName = String(args.name)
        const ok = loadPreset(pName)
        if (!ok) return { narrative: `Preset "${pName}" not found` }
        addDebug(`\u{1F4C2} LOAD PRESET: "${pName}"`, "system")
        return { narrative: `Loaded preset "${pName}"` }
      }

      // ── Project save/load ──
      case "save_project": {
        const json = exportProject()
        const name = args.name || "su-lab-project"
        const blob = new Blob([json], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${name.replace(/\s+/g, "-")}-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
        addDebug(`\u{1F4BE} PROJECT SAVED: ${name} (${(json.length / 1024).toFixed(1)}KB)`, "system")
        return { narrative: `Project exported as ${name}` }
      }
      case "load_project": {
        // Trigger file picker
        const input = document.createElement("input")
        input.type = "file"
        input.accept = ".json"
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = (ev) => {
            const ok = importProject(ev.target?.result as string)
            if (ok) {
              addDebug(`\u{1F4C2} PROJECT LOADED: ${file.name}`, "system")
            } else {
              addDebug(`\u{274C} PROJECT LOAD FAILED: invalid format`, "error")
            }
          }
          reader.readAsText(file)
        }
        input.click()
        return { narrative: "Opening file picker..." }
      }

      // ── Text commands ──
      case "add_text": {
        const text = args.text || "Text"
        const fontSize = args.size || 16
        const id = addObject({ objectType: "text" as any, shape: "square", width: 150, height: 40, textContent: text, fontSize } as any)
        if (!id) return { narrative: "Max objects reached" }
        const newObj = useLabStore.getState().objects.find((o) => o.id === id)
        addDebug(`\u{1F524} ADD TEXT: ${newObj?.label} "${text}"`, "system")
        return { narrative: `Text "${text}" added as ${newObj?.label}` }
      }
      case "set_text": {
        if (!sel) return { narrative: "No object selected" }
        updateObject(sel, { textContent: args.text } as any)
        addDebug(`\u{1F524} TEXT: ${selObj?.label} = "${args.text}"`, "connection")
        return { narrative: `Text set to "${args.text}"` }
      }

      // ── Input commands ──
      case "add_input": {
        const inputType = (args.input_type === "number" ? "number" : "text") as "text" | "number"
        const placeholder = args.placeholder || (inputType === "number" ? "0" : "Type here...")
        const id = addObject({ objectType: "input" as any, shape: "square", width: 180, height: 40, placeholder, inputType } as any)
        if (!id) return { narrative: "Max objects reached" }
        const newObj = useLabStore.getState().objects.find((o) => o.id === id)
        addDebug(`\u{1F4DD} ADD INPUT: ${newObj?.label} (${inputType})`, "system")
        return { narrative: `${inputType} input added as ${newObj?.label}` }
      }
      case "set_placeholder": {
        if (!sel) return { narrative: "No object selected" }
        updateObject(sel, { placeholder: args.text } as any)
        addDebug(`\u{1F4DD} PLACEHOLDER: ${selObj?.label} = "${args.text}"`, "connection")
        return { narrative: `Placeholder set to "${args.text}"` }
      }

      // ── Timer commands ──
      case "add_timer": {
        const dur = args.duration || 60
        const id = addObject({ objectType: "timer" as any, shape: "square", width: 120, height: 60, timerDuration: dur } as any)
        if (!id) return { narrative: "Max objects reached" }
        const newObj = useLabStore.getState().objects.find((o) => o.id === id)
        addDebug(`\u{23F1} ADD TIMER: ${newObj?.label} (${dur}s)`, "system")
        return { narrative: `Timer added: ${dur} seconds` }
      }
      case "start_timer": {
        if (!sel || selObj?.objectType !== "timer") return { narrative: "Select a timer first" }
        updateObject(sel, { timerRunning: true } as any)
        addDebug(`\u{25B6} TIMER START: ${selObj.label}`, "system")
        return { narrative: `Timer ${selObj.label} started` }
      }
      case "stop_timer": {
        if (!sel || selObj?.objectType !== "timer") return { narrative: "Select a timer first" }
        updateObject(sel, { timerRunning: false } as any)
        addDebug(`\u{23F8} TIMER STOP: ${selObj.label}`, "system")
        return { narrative: `Timer ${selObj.label} stopped` }
      }
      case "reset_timer": {
        if (!sel || selObj?.objectType !== "timer") return { narrative: "Select a timer first" }
        updateObject(sel, { timerElapsed: 0, timerRunning: false } as any)
        addDebug(`\u{23EE} TIMER RESET: ${selObj.label}`, "system")
        return { narrative: `Timer ${selObj.label} reset` }
      }

      // ── Undo/Redo ──
      case "undo": {
        const ok = undo()
        addDebug(`\u{21A9} UNDO: ${ok ? "done" : "nothing to undo"}`, "system")
        return { narrative: ok ? "Undone" : "Nothing to undo" }
      }
      case "redo": {
        const ok = redo()
        addDebug(`\u{21AA} REDO: ${ok ? "done" : "nothing to redo"}`, "system")
        return { narrative: ok ? "Redone" : "Nothing to redo" }
      }

      // ── Device commands ──
      case "toggle_torch": {
        const on = args.on !== false
        fetch(`/api/termux/torch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on }) }).catch(() => {})
        addDebug(`\u{1F526} TORCH: ${on ? "ON" : "OFF"}`, "system")
        return { narrative: `Flashlight ${on ? "on" : "off"}` }
      }
      case "check_battery": {
        try {
          const res = await fetch(`/api/termux/battery`)
          if (res.ok) {
            const d = await res.json()
            const msg = `Battery ${d.percentage}%, ${d.status}, ${d.temperature}°C`
            addDebug(`\u{1F50B} ${msg}`, "system")
            return { narrative: msg }
          }
        } catch {}
        return { narrative: "Battery check failed" }
      }
      case "send_notification": {
        fetch(`/api/termux/notification`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: args.title, content: args.text }) }).catch(() => {})
        addDebug(`\u{1F514} NOTIFY: ${args.title}`, "system")
        return { narrative: `Notification sent: ${args.title}` }
      }
      case "set_volume": {
        const lvl = Math.max(0, Math.min(15, args.level))
        fetch(`/api/termux/volume`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stream: "music", volume: lvl }) }).catch(() => {})
        addDebug(`\u{1F50A} VOLUME: ${lvl}`, "system")
        return { narrative: `Volume set to ${lvl}` }
      }
      case "clipboard_copy": {
        const text = args.text || objs.map((o) => `${o.label}:(${Math.round(o.x)},${Math.round(o.y)}) ${o.width}x${o.height} ${o.shape}`).join("; ")
        if (typeof navigator !== "undefined") navigator.clipboard?.writeText(text)
        addDebug(`\u{1F4CB} CLIPBOARD: ${text.slice(0, 60)}`, "system")
        return { narrative: "Copied to clipboard" }
      }

      // ── Typed creation ──
      case "add_image": {
        const id = addObject({ objectType: "image" as any, shape: "square", width: 120, height: 120 })
        if (!id) return { narrative: "Max objects reached" }
        const newObj = useLabStore.getState().objects.find((o) => o.id === id)
        addDebug(`\u{1F5BC} ADD IMAGE: ${newObj?.label}`, "system")
        return { narrative: `Image container ${newObj?.label} created. Double-tap to load image.` }
      }
      case "add_button": {
        const btnLabel = args.button_label || "Tap"
        const btnConfig: ButtonConfig = {
          targetType: args.target ? "object" : "device",
          targetLabel: args.target || "",
          action: args.action || "toggle_visibility",
          actionArgs: {},
          style: "oneshot",
          buttonLabel: btnLabel,
          toggleState: false,
        }
        const id = addObject({ objectType: "button" as any, shape: "square", width: 100, height: 44, buttonConfig: btnConfig as any })
        if (!id) return { narrative: "Max objects reached" }
        const newObj = useLabStore.getState().objects.find((o) => o.id === id)
        addDebug(`\u{1F518} ADD BUTTON: ${newObj?.label} "${btnLabel}"`, "system")
        return { narrative: `Button ${newObj?.label} created: "${btnLabel}"` }
      }
      case "set_image": {
        if (!sel) return { narrative: "No object selected" }
        if (selObj?.objectType !== "image") return { narrative: "Selected object is not an image container" }
        const src = String(args.source || "").toLowerCase()
        // Phase 1B: "camera" or "gallery" as source
        if (src === "camera" || src === "photo") {
          // Open config panel so user can tap Camera button (opens viewfinder)
          setConfigOpen(sel)
          return { narrative: `Open config to use camera for ${selObj.label}` }
        }
        if (src === "gallery") {
          setConfigOpen(sel)
          return { narrative: `Open config to pick from gallery` }
        }
        updateObject(sel, { imageSrc: args.source } as any)
        saveToImageGallery(args.source)
        addDebug(`\u{1F5BC} IMAGE SRC: ${selObj.label} \u2192 ${String(args.source).slice(0, 40)}`, "connection")
        return { narrative: `Image set on ${selObj.label}` }
      }
      case "take_photo": {
        if (!sel || selObj?.objectType !== "image") return { narrative: "Select an image object first" }
        try {
          addDebug(`\u{1F4F7} Taking photo for ${selObj.label}...`, "system")
          const res = await fetch("/api/termux/camera/photo", { method: "POST" })
          if (res.ok) {
            const data = await res.json()
            if (data.base64) {
              updateObject(sel, { imageSrc: `data:image/jpeg;base64,${data.base64}` } as any)
              addDebug(`\u{1F4F7} PHOTO: ${selObj.label} loaded (${(data.base64.length / 1024).toFixed(0)}KB)`, "system")
              return { narrative: `Photo captured for ${selObj.label}` }
            }
          }
        } catch {}
        return { narrative: "Camera capture failed" }
      }

      // ── Relationship commands ──
      case "align_objects": {
        const axis = String(args.axis).toLowerCase()
        const xs = objs.map((o) => o.x)
        const ys = objs.map((o) => o.y)
        const ws = objs.map((o) => o.width)
        const hs = objs.map((o) => o.height)

        objs.forEach((o) => {
          switch (axis) {
            case "left": updateObject(o.id, { x: Math.min(...xs) }); break
            case "right": updateObject(o.id, { x: Math.max(...xs.map((x, i) => x + ws[i])) - o.width }); break
            case "top": updateObject(o.id, { y: Math.min(...ys) }); break
            case "bottom": updateObject(o.id, { y: Math.max(...ys.map((y, i) => y + hs[i])) - o.height }); break
            case "center-h": case "center": {
              const avgX = objs.reduce((s, o2) => s + o2.x + o2.width / 2, 0) / objs.length
              updateObject(o.id, { x: avgX - o.width / 2 })
              break
            }
            case "center-v": {
              const avgY = objs.reduce((s, o2) => s + o2.y + o2.height / 2, 0) / objs.length
              updateObject(o.id, { y: avgY - o.height / 2 })
              break
            }
          }
        })
        addDebug(`\u{1F4D0} ALIGN: ${axis}`, "connection")
        return { narrative: `Aligned ${axis}` }
      }

      case "set_layer": {
        if (!sel || !selObj) return { narrative: "No object selected" }
        const pos = String(args.position).toLowerCase()
        const maxZ = Math.max(...objs.map((o) => o.zIndex || 0))
        const minZ = Math.min(...objs.map((o) => o.zIndex || 0))
        let newZ = selObj.zIndex || 1

        switch (pos) {
          case "front": newZ = maxZ + 1; break
          case "back": newZ = Math.max(0, minZ - 1); break
          case "forward": newZ = (selObj.zIndex || 1) + 1; break
          case "backward": newZ = Math.max(0, (selObj.zIndex || 1) - 1); break
        }
        updateObject(sel, { zIndex: newZ })
        addDebug(`\u{1F4DA} LAYER: ${selObj.label} \u2192 z:${newZ} (${pos})`, "connection")
        return { narrative: `${selObj.label} moved to ${pos} (z:${newZ})` }
      }

      case "group_objects": {
        const labels = String(args.labels).split(",").map((l) => l.trim().toUpperCase())
        const groupId = "grp_" + Math.random().toString(36).slice(2, 6)
        let grouped = 0
        objs.forEach((o) => {
          if (labels.includes(o.label.toUpperCase())) {
            updateObject(o.id, { groupId })
            grouped++
          }
        })
        if (grouped < 2) return { narrative: "Need at least 2 objects to group" }
        addDebug(`\u{1F517} GROUP: ${labels.join("+")} \u2192 ${groupId}`, "connection")
        return { narrative: `Grouped ${labels.join(", ")} (${grouped} objects)` }
      }

      case "ungroup_objects": {
        if (!sel || !selObj) return { narrative: "No object selected" }
        const gid = selObj.groupId
        if (!gid) return { narrative: `${selObj.label} is not in a group` }
        objs.forEach((o) => {
          if (o.groupId === gid) updateObject(o.id, { groupId: null })
        })
        addDebug(`\u{1F513} UNGROUP: ${gid}`, "connection")
        return { narrative: `Ungrouped all objects from ${gid}` }
      }

      case "distribute_evenly": {
        const axis = String(args.axis).toLowerCase()
        if (objs.length < 3) return { narrative: "Need at least 3 objects to distribute" }

        const sorted = [...objs].sort((a, b) => axis === "horizontal" ? a.x - b.x : a.y - b.y)
        const first = sorted[0]
        const last = sorted[sorted.length - 1]

        if (axis === "horizontal" || axis === "h") {
          const totalSpan = (last.x + last.width) - first.x
          const totalObjWidth = sorted.reduce((s, o) => s + o.width, 0)
          const gap = (totalSpan - totalObjWidth) / (sorted.length - 1)
          let currentX = first.x
          sorted.forEach((o) => {
            updateObject(o.id, { x: Math.round(currentX) })
            currentX += o.width + gap
          })
        } else {
          const totalSpan = (last.y + last.height) - first.y
          const totalObjHeight = sorted.reduce((s, o) => s + o.height, 0)
          const gap = (totalSpan - totalObjHeight) / (sorted.length - 1)
          let currentY = first.y
          sorted.forEach((o) => {
            updateObject(o.id, { y: Math.round(currentY) })
            currentY += o.height + gap
          })
        }
        addDebug(`\u{1F4CF} DISTRIBUTE: ${axis}`, "connection")
        return { narrative: `Distributed evenly ${axis}` }
      }

      // ── Animation commands ──
      case "animate": {
        if (!sel) return { narrative: "No object selected" }
        const type = String(args.type || "spin").toLowerCase()
        if (!["spin", "bounce", "pulse"].includes(type)) return { narrative: "Animations: spin, bounce, pulse" }
        const speed = args.speed || 2
        updateObject(sel, { animation: type, animSpeed: speed, orbitTarget: null })
        addDebug(`\u{1F3AC} ANIMATE: ${selObj?.label} \u2192 ${type} (${speed}s)`, "connection")
        return { narrative: `${selObj?.label} now ${type}s (${speed}s cycle)` }
      }
      case "stop_animation": {
        if (!sel) return { narrative: "No object selected" }
        updateObject(sel, { animation: null, orbitTarget: null })
        addDebug(`\u23f9 STOP: ${selObj?.label} animation stopped`, "connection")
        return { narrative: `${selObj?.label} stopped` }
      }
      case "orbit": {
        if (!sel || !selObj) return { narrative: "No object selected" }
        const targetLabel = String(args.target || args.target_label || "").toUpperCase()
        const target = objs.find((o) => o.label.toUpperCase() === targetLabel)
        if (!target) return { narrative: `Object "${targetLabel}" not found` }
        if (target.id === sel) return { narrative: "Can't orbit around itself" }
        const speed = args.speed || 3
        updateObject(sel, { animation: "orbit", animSpeed: speed, orbitTarget: target.label })
        addDebug(`\u{1F30D} ORBIT: ${selObj.label} around ${target.label} (${speed}s)`, "connection")
        return { narrative: `${selObj.label} orbiting ${target.label}` }
      }

      // ── Export ──
      case "export_layout": {
        const format = String(args.format).toLowerCase()
        let output = ""

        if (format === "json") {
          output = JSON.stringify(objs.map((o) => ({
            label: o.label, x: Math.round(o.x), y: Math.round(o.y),
            width: o.width, height: o.height, shape: o.shape,
            color: o.color, opacity: o.opacity, zIndex: o.zIndex,
          })), null, 2)
        } else if (format === "css") {
          output = objs.map((o) => (
            `.${o.label.toLowerCase()} {\n` +
            `  position: absolute;\n` +
            `  left: ${Math.round(o.x)}px;\n` +
            `  top: ${Math.round(o.y)}px;\n` +
            `  width: ${o.width}px;\n` +
            `  height: ${o.height}px;\n` +
            `  background: ${o.color};\n` +
            `  opacity: ${o.opacity};\n` +
            `  border-radius: ${o.shape === "circle" ? "50%" : o.shape === "square" ? "8px" : "0"};\n` +
            `  z-index: ${o.zIndex || 1};\n` +
            `}`
          )).join("\n\n")
        } else if (format === "html") {
          const divs = objs.map((o) =>
            `<div class="${o.label.toLowerCase()}" style="position:absolute;left:${Math.round(o.x)}px;top:${Math.round(o.y)}px;` +
            `width:${o.width}px;height:${o.height}px;background:${o.color};opacity:${o.opacity};` +
            `border-radius:${o.shape === "circle" ? "50%" : "8px"};z-index:${o.zIndex || 1}">${o.label}</div>`
          ).join("\n  ")
          output = `<div style="position:relative;width:100%;height:100%;background:${useLabStore.getState().canvasBg}">\n  ${divs}\n</div>`
        } else {
          return { narrative: "Unknown format. Use json, css, or html." }
        }

        if (typeof navigator !== "undefined") navigator.clipboard?.writeText(output)
        addDebug(`\u{1F4E4} EXPORT: ${format} (${output.length} chars, copied)`, "system")
        return { narrative: `Exported as ${format} (${output.length} chars, copied to clipboard)` }
      }

      // ── Logic editor commands ──
      case "open_logic_editor": {
        if (!sel) return { narrative: "Select an object first" }
        setLogicEditorFor(sel)
        setConfigOpen(null)
        addDebug(`\u{26A1} LOGIC EDITOR: opened for ${selObj?.label}`, "system")
        return { narrative: `Logic editor opened for ${selObj?.label}` }
      }
      case "close_logic_editor": {
        setLogicEditorFor(null)
        addDebug(`\u{26A1} LOGIC EDITOR: closed`, "system")
        return { narrative: "Logic editor closed" }
      }
      case "add_logic_block": {
        const bt = (args.block_type || "if_else") as any
        const id = useLabStore.getState().addLogicBlock(undefined, undefined, bt)
        if (args.label) useLabStore.getState().updateLogicBlock(id, { label: args.label })
        addDebug(`\u{2B21} LOGIC: added ${bt} block ${args.label || id}`, "system")
        return { narrative: `${bt} logic block "${args.label || id}" added` }
      }
      case "add_compare_block": {
        const id = useLabStore.getState().addLogicBlock(undefined, undefined, "compare")
        addDebug(`\u{2260} LOGIC: added compare block`, "system")
        return { narrative: "Compare block added" }
      }
      case "add_math_block": {
        const id = useLabStore.getState().addLogicBlock(undefined, undefined, "math")
        if (args.label) useLabStore.getState().updateLogicBlock(id, { label: args.label })
        if (args.operation) useLabStore.getState().updateLogicBlock(id, { mathOp: args.operation as any })
        if (args.value !== undefined) useLabStore.getState().updateLogicBlock(id, { mathRight: { type: "constant", value: args.value } })
        addDebug(`\u{2795} LOGIC: added math block "${args.label || "Math"}" (${args.operation || "add"})`, "system")
        return { narrative: `Math block "${args.label || "Math"}" added (${args.operation || "add"})` }
      }
      case "add_delay_block": {
        const id = useLabStore.getState().addLogicBlock(undefined, undefined, "delay")
        if (args.ms) useLabStore.getState().updateLogicBlock(id, { delayMs: args.ms })
        addDebug(`\u{23F1} LOGIC: added delay block (${args.ms || 1000}ms)`, "system")
        return { narrative: `Delay block added (${args.ms || 1000}ms)` }
      }
      case "set_variable": {
        const id = useLabStore.getState().addLogicBlock(undefined, undefined, "set_variable")
        useLabStore.getState().updateLogicBlock(id, { variableName: args.name })
        addDebug(`\u{1F4BE} LOGIC: set variable $${args.name}`, "system")
        return { narrative: `Set variable block for $${args.name}` }
      }
      case "get_variable": {
        const id = useLabStore.getState().addLogicBlock(undefined, undefined, "get_variable")
        useLabStore.getState().updateLogicBlock(id, { variableName: args.name })
        addDebug(`\u{1F4C4} LOGIC: get variable $${args.name}`, "system")
        return { narrative: `Get variable block for $${args.name}` }
      }
      case "add_loop_block": {
        const id = useLabStore.getState().addLogicBlock(undefined, undefined, "loop")
        if (args.count) useLabStore.getState().updateLogicBlock(id, { loopCount: args.count })
        addDebug(`\u{1F504} LOGIC: added loop block (${args.count || 3}x)`, "system")
        return { narrative: `Loop block added (${args.count || 3}x)` }
      }
      case "add_collision_block": {
        const id = useLabStore.getState().addLogicBlock(undefined, undefined, "collision" as any)
        if (args.label) useLabStore.getState().updateLogicBlock(id, { label: args.label })
        const freshObjs = useLabStore.getState().objects
        const updates: any = {}
        if (args.object_a) {
          const a = freshObjs.find((o) => o.label.toUpperCase() === String(args.object_a).toUpperCase())
          if (a) updates.collisionObjectA = a.id
        }
        if (args.object_b) {
          const b = freshObjs.find((o) => o.label.toUpperCase() === String(args.object_b).toUpperCase())
          if (b) updates.collisionObjectB = b.id
        }
        if (args.threshold) updates.collisionThreshold = Number(args.threshold)
        if (Object.keys(updates).length) useLabStore.getState().updateLogicBlock(id, updates)
        addDebug(`\u{1F4A5} COLLISION: ${args.object_a} \u2194 ${args.object_b} (${args.threshold || 30}px)`, "system")
        return { narrative: `Collision block: ${args.object_a} ↔ ${args.object_b}` }
      }
      case "configure_math": {
        const label = String(args.label)
        const state = useLabStore.getState()
        const block = state.logicGraph.nodes.find((n) => n.label.toLowerCase() === label.toLowerCase())
        if (!block) return { narrative: `Math block "${label}" not found` }
        // Read fresh objects from store (not stale objectsRef)
        const freshObjs = state.objects
        const updates: any = {}
        if (args.operation) updates.mathOp = args.operation
        if (args.left_object) {
          const leftObj = freshObjs.find((o) => o.label.toUpperCase() === String(args.left_object).toUpperCase())
          if (leftObj) updates.mathLeft = { type: "property", objectId: leftObj.id, property: args.left_property || "outputValue" }
        }
        if (args.right_object) {
          const rightObj = freshObjs.find((o) => o.label.toUpperCase() === String(args.right_object).toUpperCase())
          if (rightObj) updates.mathRight = { type: "property", objectId: rightObj.id, property: args.right_property || "outputValue" }
        } else if (args.value !== undefined) {
          updates.mathRight = { type: "constant", value: Number(args.value) }
        }
        state.updateLogicBlock(block.id, updates)
        addDebug(`\u{2795} MATH CONFIG: ${label} = ${args.operation || "add"}(${args.left_object || "input"}, ${args.right_object || args.value || "?"})`, "system")
        return { narrative: `Math block "${label}" configured: ${args.left_object || "input"} ${args.operation || "add"} ${args.right_object || args.value}` }
      }
      case "delete_logic_block": {
        const label = String(args.label)
        const block = useLabStore.getState().logicGraph.nodes.find((n) => n.label.toLowerCase() === label.toLowerCase())
        if (!block) return { narrative: `Logic block "${label}" not found` }
        useLabStore.getState().deleteLogicBlock(block.id)
        addDebug(`\u{1F5D1} LOGIC: deleted ${label}`, "system")
        return { narrative: `Deleted logic block "${label}"` }
      }
      case "connect_wire": {
        const fromLabel = String(args.from_label).toUpperCase()
        const toLabel = String(args.to_label).toUpperCase()
        const toPort = args.to_port || "in"
        const fromObj = objs.find((o) => o.label.toUpperCase() === fromLabel)
        const toObj = objs.find((o) => o.label.toUpperCase() === toLabel)
        const fromBlock = useLabStore.getState().logicGraph.nodes.find((n) => n.label.toLowerCase() === fromLabel.toLowerCase())
        const toBlock = useLabStore.getState().logicGraph.nodes.find((n) => n.label.toLowerCase() === toLabel.toLowerCase())
        const fromId = fromObj?.id || fromBlock?.id
        const toId = toObj?.id || toBlock?.id
        if (!fromId || !toId) return { narrative: `Can't find "${fromLabel}" or "${toLabel}"` }
        useLabStore.getState().addWire({ fromNodeId: fromId, fromPort: "out", toNodeId: toId, toPort })
        addDebug(`\u{1F517} WIRE: ${fromLabel} \u2192 ${toLabel}.${toPort}`, "connection")
        return { narrative: `Connected ${fromLabel} to ${toLabel}` }
      }
      case "disconnect_wire": {
        const fromLabel = String(args.from_label).toUpperCase()
        const toLabel = String(args.to_label).toUpperCase()
        const state = useLabStore.getState()
        const fromObj = objs.find((o) => o.label.toUpperCase() === fromLabel)
        const toObj = objs.find((o) => o.label.toUpperCase() === toLabel)
        const fromBlock = state.logicGraph.nodes.find((n) => n.label.toLowerCase() === fromLabel.toLowerCase())
        const toBlock = state.logicGraph.nodes.find((n) => n.label.toLowerCase() === toLabel.toLowerCase())
        const fromId = fromObj?.id || fromBlock?.id
        const toId = toObj?.id || toBlock?.id
        const wire = state.logicGraph.wires.find((w) => w.fromNodeId === fromId && w.toNodeId === toId)
        if (!wire) return { narrative: `No wire from ${fromLabel} to ${toLabel}` }
        state.deleteWire(wire.id)
        addDebug(`\u{2702} WIRE: ${fromLabel} \u2192 ${toLabel} removed`, "connection")
        return { narrative: `Disconnected ${fromLabel} from ${toLabel}` }
      }
      case "add_canvas_object": {
        const label = String(args.label).toUpperCase()
        const obj = objs.find((o) => o.label.toUpperCase() === label)
        if (!obj) return { narrative: `Object "${label}" not found on canvas` }
        addDebug(`\u{25A0} LOGIC: added ${label} to graph`, "system")
        return { narrative: `${label} added to logic graph` }
      }
      case "configure_logic": {
        const label = String(args.label)
        const block = useLabStore.getState().logicGraph.nodes.find((n) => n.label.toLowerCase() === label.toLowerCase())
        if (!block) return { narrative: `Logic block "${label}" not found` }
        const condition = {
          type: "if_else" as const,
          test: {
            left: { type: "input" as const },
            operator: (args.operator || "==") as any,
            right: { type: "constant" as const, value: args.value ?? 1 },
          },
          thenAction: { property: args.then_property || "opacity", value: { type: "constant" as const, value: args.then_value ?? 1 } },
          elseAction: args.else_property ? { property: args.else_property, value: { type: "constant" as const, value: args.else_value ?? 0 } } : null,
        }
        useLabStore.getState().updateLogicBlock(block.id, { condition })
        addDebug(`\u{2699} LOGIC: configured ${label}`, "system")
        return { narrative: `Logic block "${label}" configured` }
      }
      case "add_listener": {
        const label = String(args.object_label || "").toUpperCase()
        const obj = objs.find((o) => o.label.toUpperCase() === label)
        if (!obj) return { narrative: `Object "${label}" not found` }
        const prop = args.property || "outputValue"
        const trigger = (args.trigger || "on_change") as "on_change" | "on_threshold" | "on_interval"
        const id = useLabStore.getState().addListener({ x: 200, y: 150, watchObjectId: obj.id, watchProperty: prop, triggerType: trigger })
        addDebug(`\u{1F441} LISTENER: watching ${label}.${prop} (${trigger})`, "system")
        return { narrative: `Listener added: watching ${label}.${prop}` }
      }
      case "delete_listener": {
        const label = String(args.label)
        const listener = useLabStore.getState().logicGraph.listeners.find((l) => l.label.toLowerCase() === label.toLowerCase())
        if (!listener) return { narrative: `Listener "${label}" not found` }
        useLabStore.getState().deleteListener(listener.id)
        addDebug(`\u{1F5D1} LISTENER: deleted ${label}`, "system")
        return { narrative: `Deleted listener "${label}"` }
      }
      case "show_logic_state": {
        const g = useLabStore.getState().logicGraph
        const summary = `${g.nodes.length} blocks, ${g.listeners.length} listeners, ${g.wires.length} wires. ` +
          g.nodes.map((n) => `${n.label}: ${n.condition ? "configured" : "empty"}`).join(", ")
        addDebug(`\u{1F4CA} LOGIC: ${summary}`, "system")
        return { narrative: summary || "No logic blocks" }
      }

      // ── Behavior commands ──
      case "create_behavior": {
        const srcLabel = String(args.source_label || "").toUpperCase()
        const tgtLabel = String(args.target_label || "").toUpperCase()
        const srcObj = objs.find((o) => o.label.toUpperCase() === srcLabel)
        const tgtObj = objs.find((o) => o.label.toUpperCase() === tgtLabel)
        if (!srcObj) return { narrative: `Object "${srcLabel}" not found` }
        if (!tgtObj) return { narrative: `Object "${tgtLabel}" not found` }
        const prop = args.property || "opacity"
        const val = args.value !== undefined ? (isNaN(Number(args.value)) ? args.value : Number(args.value)) : 1
        const trigger = (args.trigger || "tap") as "tap" | "change"
        const state = useLabStore.getState()
        const behavior: Behavior = {
          id: "beh_" + Math.random().toString(36).slice(2, 6),
          trigger: { type: trigger, sourceObjectId: srcObj.id, property: trigger === "change" ? "outputValue" : undefined },
          condition: null,
          actions: [{ targetObjectId: tgtObj.id, property: prop, value: { type: "constant", value: val } }],
          label: "", createdVia: "voice",
          _wireIds: [], _blockIds: [], _listenerIds: [],
        }
        behaviorToGraph(behavior, state.logicGraph, state.addWire, state.addLogicBlock, state.updateLogicBlock, state.addListener)
        addDebug(`\u{1F4A1} BEHAVIOR: ${srcLabel} \u2192 ${tgtLabel}.${prop}`, "connection")
        return { narrative: `Behavior: when ${srcLabel} ${trigger}, set ${tgtLabel}.${prop} to ${val}` }
      }
      case "list_behaviors": {
        if (!sel) return { narrative: "Select an object first" }
        const behaviors = graphToBehaviors(sel, useLabStore.getState().logicGraph, objs)
        if (behaviors.length === 0) return { narrative: `No behaviors on ${selObj?.label}` }
        return { narrative: behaviors.map((b) => b.label).join("\n") }
      }

      // ── New object commands ──
      case "add_slider": {
        const id = addObject({ objectType: "slider" as any, shape: "square", width: 160, height: 40, sliderMin: args.min ?? 0, sliderMax: args.max ?? 100 } as any)
        if (!id) return { narrative: "Max objects reached" }
        const o = useLabStore.getState().objects.find((o) => o.id === id)
        addDebug(`\u{1F39A} ADD SLIDER: ${o?.label}`, "system")
        return { narrative: `Slider ${o?.label} created (${args.min ?? 0}-${args.max ?? 100})` }
      }
      case "set_slider_value": {
        if (!sel || selObj?.objectType !== "slider") return { narrative: "Select a slider first" }
        const v = Math.max(selObj.sliderMin, Math.min(selObj.sliderMax, args.value))
        updateObject(sel, { sliderValue: v, outputValue: v } as any)
        return { narrative: `Slider set to ${v}` }
      }
      case "add_toggle": {
        const id = addObject({ objectType: "toggle" as any, shape: "square", width: 80, height: 36, toggleLabel: args.label || "" } as any)
        if (!id) return { narrative: "Max objects reached" }
        const o = useLabStore.getState().objects.find((o) => o.id === id)
        addDebug(`\u{1F504} ADD TOGGLE: ${o?.label}`, "system")
        return { narrative: `Toggle ${o?.label} created` }
      }
      case "set_toggle": {
        if (!sel || selObj?.objectType !== "toggle") return { narrative: "Select a toggle first" }
        updateObject(sel, { toggleState: args.on, outputValue: args.on } as any)
        return { narrative: `Toggle ${args.on ? "ON" : "OFF"}` }
      }
      case "add_progress": {
        const id = addObject({ objectType: "progress" as any, shape: "square", width: 160, height: 28 } as any)
        if (!id) return { narrative: "Max objects reached" }
        const o = useLabStore.getState().objects.find((o) => o.id === id)
        addDebug(`\u{1F4CA} ADD PROGRESS: ${o?.label}`, "system")
        return { narrative: `Progress bar ${o?.label} created` }
      }
      case "set_progress": {
        if (!sel || selObj?.objectType !== "progress") return { narrative: "Select a progress bar first" }
        const v = Math.max(0, Math.min(100, args.value))
        updateObject(sel, { progressValue: v, outputValue: v } as any)
        return { narrative: `Progress set to ${v}%` }
      }
      case "add_dropdown": {
        const opts = args.options ? String(args.options).split(",").map((s: string) => s.trim()) : ["Option 1", "Option 2", "Option 3"]
        const id = addObject({ objectType: "dropdown" as any, shape: "square", width: 150, height: 36, dropdownOptions: opts } as any)
        if (!id) return { narrative: "Max objects reached" }
        const o = useLabStore.getState().objects.find((o) => o.id === id)
        addDebug(`\u{1F4CB} ADD DROPDOWN: ${o?.label}`, "system")
        return { narrative: `Dropdown ${o?.label} created with ${opts.length} options` }
      }
      case "set_options": {
        if (!sel || selObj?.objectType !== "dropdown") return { narrative: "Select a dropdown first" }
        const opts = String(args.options).split(",").map((s: string) => s.trim())
        updateObject(sel, { dropdownOptions: opts } as any)
        return { narrative: `Options set: ${opts.join(", ")}` }
      }
      case "select_option": {
        if (!sel || selObj?.objectType !== "dropdown") return { narrative: "Select a dropdown first" }
        const opt = String(args.option)
        updateObject(sel, { dropdownSelected: opt, outputValue: opt } as any)
        return { narrative: `Selected "${opt}"` }
      }
      case "add_counter": {
        const id = addObject({ objectType: "counter" as any, shape: "square", width: 140, height: 50, counterLabel: args.label || "" } as any)
        if (!id) return { narrative: "Max objects reached" }
        const o = useLabStore.getState().objects.find((o) => o.id === id)
        addDebug(`\u{1F522} ADD COUNTER: ${o?.label}`, "system")
        return { narrative: `Counter ${o?.label} created` }
      }
      case "increment_counter": {
        if (!sel || selObj?.objectType !== "counter") return { narrative: "Select a counter first" }
        const v = (selObj.counterValue || 0) + (selObj.counterStep || 1)
        updateObject(sel, { counterValue: v, outputValue: v } as any)
        if (hasLogicWires(sel, logicGraph)) executeFromSource(sel, v, logicGraph, objs, updateObject)
        return { narrative: `Counter: ${v}` }
      }
      case "decrement_counter": {
        if (!sel || selObj?.objectType !== "counter") return { narrative: "Select a counter first" }
        const v = (selObj.counterValue || 0) - (selObj.counterStep || 1)
        updateObject(sel, { counterValue: v, outputValue: v } as any)
        if (hasLogicWires(sel, logicGraph)) executeFromSource(sel, v, logicGraph, objs, updateObject)
        return { narrative: `Counter: ${v}` }
      }
      case "reset_counter": {
        if (!sel || selObj?.objectType !== "counter") return { narrative: "Select a counter first" }
        updateObject(sel, { counterValue: 0, outputValue: 0 } as any)
        return { narrative: "Counter reset to 0" }
      }

      // ── Container commands ──
      case "add_container": {
        const layout = (args.layout || "free") as "free" | "vertical" | "horizontal"
        const id = addObject({ objectType: "container" as any, shape: "square", width: 200, height: 160, containerLayout: layout, color: "hsl(260,60%,55%)" } as any)
        if (!id) return { narrative: "Max objects reached" }
        const newObj = useLabStore.getState().objects.find((o) => o.id === id)
        addDebug(`\u{1F4E6} ADD CONTAINER: ${newObj?.label} (${layout})`, "system")
        return { narrative: `Container ${newObj?.label} created (${layout} layout)` }
      }
      case "set_layout": {
        if (!sel) return { narrative: "No object selected" }
        if (selObj?.objectType !== "container") return { narrative: "Selected object is not a container" }
        const layout = String(args.layout).toLowerCase() as "free" | "vertical" | "horizontal"
        if (!["free", "vertical", "horizontal"].includes(layout)) return { narrative: "Layout must be: free, vertical, horizontal" }
        updateObject(sel, { containerLayout: layout } as any)
        addDebug(`\u{1F4E6} LAYOUT: ${selObj.label} \u2192 ${layout}`, "connection")
        return { narrative: `Layout set to ${layout}` }
      }
      case "add_to_container": {
        const objLabel = String(args.object_label).toUpperCase()
        const contLabel = String(args.container_label).toUpperCase()
        const child = objs.find((o) => o.label.toUpperCase() === objLabel)
        const container = objs.find((o) => o.label.toUpperCase() === contLabel && o.objectType === "container")
        if (!child) return { narrative: `Object "${objLabel}" not found` }
        if (!container) return { narrative: `Container "${contLabel}" not found` }
        updateObject(child.id, { parentId: container.id } as any)
        addDebug(`\u{1F4E6} ADOPT: ${objLabel} \u2192 ${contLabel}`, "connection")
        return { narrative: `${objLabel} added to container ${contLabel}` }
      }
      case "remove_from_container": {
        const label = String(args.label).toUpperCase()
        const child = objs.find((o) => o.label.toUpperCase() === label)
        if (!child) return { narrative: `Object "${label}" not found` }
        if (!child.parentId) return { narrative: `${label} is not in a container` }
        updateObject(child.id, { parentId: null } as any)
        addDebug(`\u{1F4E6} RELEASE: ${label}`, "connection")
        return { narrative: `${label} removed from container` }
      }

      default:
        return { narrative: `Unknown: ${name}` }
    }
  }, [updateObject, addDebug, selectByLabel, addObject, duplicateObject, deleteObject, resetAll, logicEditorFor, saveToImageGallery])

  // ── Connect Aria ──
  const connectAria = useCallback(async () => {
    setConnecting(true)
    const engine = getAriaEngine()
    const voice = useGameVoiceStore.getState()

    engine.setCallbacks({
      onStatusChange: (status) => { voice.setOrbState(status); voice.setConnected(status !== "idle") },
      onUserTranscript: (text) => { if (text?.trim()) { lastUtteranceRef.current = text.trim(); addDebug(`\u{1F464} YOU: ${text}`, "voice") } },
      onAriaTranscript: (text) => { if (text?.trim()) addDebug(`\u2728 ARIA: ${text}`, "voice") },
      onFunctionCallStart: () => {},
      onNarrative: (text) => { if (text?.trim()) addDebug(`\u{1F4AC} ${text}`, "system") },
    })

    const persona: PersonaConfig = {
      id: "su-lab",
      name: "Aria Lab",
      systemPrompt: `You are Aria, a Jarvis-like lab assistant. You control objects on a canvas using function calls.

CRITICAL RULES:
1. ALWAYS use function calls to execute commands. NEVER just describe — actually call the function.
2. After every function call, confirm in 3-5 words.
3. You can chain multiple function calls.

The canvas has dynamic objects (labeled A, B, C, etc.). One is always "selected".

Command mappings:
- "bigger/smaller/size" → set_size (10-300px)
- "red/blue/color" → set_color
- "transparent/fade" → set_opacity (0-1)
- "move left/right/up/down" → move_object
- "position/place at" → set_position
- "circle/square/triangle" → transform_shape
- "select X" → select_object (by label)
- "create/add/new" → add_object
- "duplicate/clone/copy" → duplicate_object
- "delete/remove" → delete_object
- "list/how many" → list_objects
- "configure/settings" → open_config
- "rename/call it" → rename_object
- "edit shape/resize mode" → edit_shape
- "done editing" → done_editing
- "set width/height" → set_width / set_height
- "zoom in/out" → zoom_canvas (0.5-3)
- "background blue/dark" → set_background
- "show/hide grid" → toggle_grid
- "clear everything" → clear_canvas
- "enable snapping" → snap_to_grid
- "save as my-layout" → save_preset
- "load my-layout" → load_preset
- "flashlight on/off" → toggle_torch
- "battery status" → check_battery
- "notify me: hello" → send_notification
- "volume to 5" → set_volume
- "copy to clipboard" → clipboard_copy
- "add an image" → add_image (creates image container)
- "add a button" → add_button (creates interactive button)
- "set image/load image" → set_image (URL or path on selected image)
- "take a photo" → take_photo (camera for selected image)
- "align left/right/top/bottom/center" → align_objects
- "bring to front/send to back" → set_layer
- "group A and B" → group_objects (comma-separated labels)
- "ungroup" → ungroup_objects
- "space them out" → distribute_evenly (horizontal/vertical)
- "export as css/html/json" → export_layout (copies to clipboard)
- "spin/bounce/pulse" → animate (type + speed in seconds)
- "stop/freeze" → stop_animation
- "orbit around A" → orbit (target label + speed)
- "reset" → reset_objects
- "state/info" → get_state
- "open logic editor" → open_logic_editor (for selected button)
- "close logic editor" → close_logic_editor
- "add logic block" → add_logic_block
- "connect B1 to Logic 1" → connect_wire
- "configure Logic 1" → configure_logic
- "show logic" → show_logic_state`,
      functions: getFunctionsForContext(logicEditorFor ? "logic" : "canvas"),
      voice: "Kore",
      mode: "su" as const,
      onFunctionCall: async (fc: { name: string; args?: Record<string, any> }) => {
        const result = await handleFunction(fc.name, fc.args || {})
        // Auto-capture training data
        trainingLogger?.capture(lastUtteranceRef.current, fc.name, fc.args || {}, result.narrative || "")
        return { result: result.narrative || "Done", success: true }
      },
    }

    engine.loadPersona(persona)

    try {
      const res = await fetch("/api/game/voice-config")
      if (!res.ok) throw new Error("No voice config")
      const cfg = await res.json()
      await engine.connect(cfg.apiKey)
      addDebug("\u{1F680} SYSTEM: Aria connected \u2014 Lab mode active", "system")
    } catch (e) {
      addDebug(`\u26a0\ufe0f CONNECTION FAILED: ${e}`, "error")
    }
    setConnecting(false)
  }, [handleFunction, addDebug])

  const disconnectAria = useCallback(() => {
    getAriaEngine().disconnect()
    addDebug("\u{1F50C} Aria disconnected", "system")
  }, [addDebug])

  // ── Touch/Drag ──
  const handlePointerDown = useCallback((e: React.PointerEvent, objId: string) => {
    e.preventDefault()

    // Play mode: no selection, no drag, no config, no text edit
    if (useLabStore.getState().playMode) return

    selectObject(objId)

    const now = Date.now()
    if (lastTapRef.current.id === objId && now - lastTapRef.current.time < 400) {
      lastTapRef.current = { id: "", time: 0 }
      // Phase 1A: Double-tap text object → inline edit instead of config
      const tappedObj = objectsRef.current.find((o) => o.id === objId)
      if (tappedObj?.objectType === "text") {
        setTimeout(() => { setInlineEditId(objId); addDebug(`\u{270f}\ufe0f INLINE EDIT: ${tappedObj.label}`, "system") }, 50)
        return
      }
      setTimeout(() => { setConfigOpen(objId); addDebug(`\u{2699}\ufe0f CONFIG: ${objId}`, "system") }, 50)
      return
    }
    lastTapRef.current = { id: objId, time: now }

    // Snapshot for undo ONCE at drag start
    useLabStore.getState()._pushSnapshot()

    const rect = (e.target as HTMLElement).getBoundingClientRect()
    dragRef.current = { id: objId, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top }
  }, [addDebug, selectObject])

  // Handle drag for resize handles
  const handleHandleDown = useCallback((e: React.PointerEvent, objId: string, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    const obj = objectsRef.current.find((o) => o.id === objId)!
    handleDragRef.current = {
      id: objId, handle,
      startX: e.clientX, startY: e.clientY,
      startW: obj.width, startH: obj.height,
      startObjX: obj.x, startObjY: obj.y,
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Resize handle drag
    if (handleDragRef.current) {
      const h = handleDragRef.current
      const dx = e.clientX - h.startX
      const dy = e.clientY - h.startY

      const updates: Partial<LabObject> = {}

      switch (h.handle) {
        // Corners — proportional
        case "se": updates.width = Math.max(20, h.startW + dx); updates.height = Math.max(20, h.startH + dy); break
        case "sw": updates.width = Math.max(20, h.startW - dx); updates.height = Math.max(20, h.startH + dy); updates.x = h.startObjX + dx; break
        case "ne": updates.width = Math.max(20, h.startW + dx); updates.height = Math.max(20, h.startH - dy); updates.y = h.startObjY + dy; break
        case "nw": updates.width = Math.max(20, h.startW - dx); updates.height = Math.max(20, h.startH - dy); updates.x = h.startObjX + dx; updates.y = h.startObjY + dy; break
        // Sides — single axis
        case "e": updates.width = Math.max(20, h.startW + dx); break
        case "w": updates.width = Math.max(20, h.startW - dx); updates.x = h.startObjX + dx; break
        case "s": updates.height = Math.max(20, h.startH + dy); break
        case "n": updates.height = Math.max(20, h.startH - dy); updates.y = h.startObjY + dy; break
      }

      updateObject(h.id, updates)
      return
    }

    // Normal object drag
    if (!dragRef.current || !canvasRef.current) return
    const r = canvasRef.current.getBoundingClientRect()
    const zoom = useLabStore.getState().canvasZoom
    // Convert screen coords to canvas coords (accounting for center-origin zoom)
    const cx = r.width / 2, cy = r.height / 2
    const screenX = e.clientX - r.left, screenY = e.clientY - r.top
    let newX = Math.max(0, (screenX - cx) / zoom + cx - dragRef.current.offsetX)
    let newY = Math.max(0, (screenY - cy) / zoom + cy - dragRef.current.offsetY)
    // Snap to grid
    if (useLabStore.getState().snapToGrid) {
      const gs = useLabStore.getState().gridSize
      newX = Math.round(newX / gs) * gs
      newY = Math.round(newY / gs) * gs
    }

    // Group drag — move all group members by the same delta
    const draggedObj = objectsRef.current.find((o) => o.id === dragRef.current!.id)
    if (draggedObj?.groupId) {
      const dx = newX - draggedObj.x
      const dy = newY - draggedObj.y
      objectsRef.current.forEach((o) => {
        if (o.groupId === draggedObj.groupId && o.id !== dragRef.current!.id) {
          updateObject(o.id, { x: o.x + dx, y: o.y + dy })
        }
      })
    }
    updateObject(dragRef.current.id, { x: newX, y: newY })
  }, [updateObject])

  const handlePointerUp = useCallback(() => {
    // Check if dragged object was dropped inside a container
    if (dragRef.current) {
      const draggedId = dragRef.current.id
      const state = useLabStore.getState()
      const dragged = state.objects.find((o) => o.id === draggedId)
      if (dragged && dragged.objectType !== "container") {
        const cx = dragged.x + dragged.width / 2
        const cy = dragged.y + dragged.height / 2
        // Find container at this position (not self, not already parent)
        const container = state.objects.find((o) =>
          o.objectType === "container" && o.id !== draggedId &&
          cx >= o.x && cx <= o.x + o.width &&
          cy >= o.y && cy <= o.y + o.height
        )
        if (container && dragged.parentId !== container.id) {
          // Adopt into container
          state.updateObject(draggedId, { parentId: container.id } as any)
        } else if (!container && dragged.parentId) {
          // Dragged out of a container
          state.updateObject(draggedId, { parentId: null } as any)
        }
      }
    }
    dragRef.current = null
    handleDragRef.current = null
  }, [])

  // ── Resize handles ──
  const renderHandles = (obj: LabObject) => {
    if (!editMode || obj.id !== selectedId) return null
    const HS = 14 // handle size
    const hStyle = (cursor: string): React.CSSProperties => ({
      position: "absolute", width: HS, height: HS, borderRadius: "50%",
      background: "rgba(167,139,250,0.9)", border: "2px solid #fff",
      cursor, touchAction: "none", zIndex: 5,
      boxShadow: "0 0 6px rgba(167,139,250,0.5)",
    })

    const handles = [
      // Corners (proportional)
      { id: "nw", style: { ...hStyle("nw-resize"), top: -HS/2, left: -HS/2 } },
      { id: "ne", style: { ...hStyle("ne-resize"), top: -HS/2, right: -HS/2 } },
      { id: "sw", style: { ...hStyle("sw-resize"), bottom: -HS/2, left: -HS/2 } },
      { id: "se", style: { ...hStyle("se-resize"), bottom: -HS/2, right: -HS/2 } },
      // Sides (single axis)
      { id: "n", style: { ...hStyle("n-resize"), top: -HS/2, left: "50%", marginLeft: -HS/2 } },
      { id: "s", style: { ...hStyle("s-resize"), bottom: -HS/2, left: "50%", marginLeft: -HS/2 } },
      { id: "e", style: { ...hStyle("ew-resize"), top: "50%", right: -HS/2, marginTop: -HS/2 } },
      { id: "w", style: { ...hStyle("ew-resize"), top: "50%", left: -HS/2, marginTop: -HS/2 } },
    ]

    return handles.map((h) => (
      <div key={h.id} style={h.style as React.CSSProperties}
        onPointerDown={(e) => handleHandleDown(e, obj.id, h.id)} />
    ))
  }

  // ── Render shape ──
  const renderShape = (obj: LabObject, isSelected_raw: boolean) => {
    const isSelected = playMode ? false : isSelected_raw
    const isDragging = dragRef.current?.id === obj.id || handleDragRef.current?.id === obj.id
    const showHandles = editMode && isSelected && !playMode

    // CSS animation string
    const animCSS = obj.animation ? (() => {
      switch (obj.animation) {
        case "spin": return `lab-spin ${obj.animSpeed}s linear infinite`
        case "bounce": return `lab-bounce ${obj.animSpeed}s ease-in-out infinite`
        case "pulse": return `lab-pulse ${obj.animSpeed}s ease-in-out infinite`
        case "orbit": return "" // handled separately
        default: return ""
      }
    })() : ""

    // Orbit position override
    let orbitStyle: React.CSSProperties = {}
    if (obj.animation === "orbit" && obj.orbitTarget) {
      const target = objects.find((o) => o.label === obj.orbitTarget)
      if (target) {
        const radius = Math.max(target.width, target.height) + 40
        orbitStyle = {
          left: target.x + target.width / 2 - obj.width / 2,
          top: target.y + target.height / 2 - obj.height / 2,
          transformOrigin: `${obj.width / 2}px ${obj.height / 2}px`,
          offsetPath: `circle(${radius}px)`,
          animation: `lab-orbit ${obj.animSpeed}s linear infinite`,
        } as React.CSSProperties
      }
    }

    // ── Timer object ──
    if (obj.objectType === "timer") {
      const remaining = Math.max(0, (obj.timerDuration || 60) - (obj.timerElapsed || 0))
      const mins = Math.floor(remaining / 60)
      const secs = remaining % 60
      const pct = obj.timerDuration ? ((obj.timerDuration - remaining) / obj.timerDuration) * 100 : 0

      return (
        <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
          <div onPointerDown={(e) => handlePointerDown(e, obj.id)}
            style={{
              width: obj.width, height: obj.height, opacity: obj.opacity,
              borderRadius: "12px", overflow: "hidden",
              background: "rgba(0,0,0,0.3)",
              border: isSelected ? `2px solid ${obj.color}` : "1px solid rgba(255,255,255,0.1)",
              boxShadow: isSelected ? `0 0 15px ${obj.color}33` : "none",
              cursor: "grab", touchAction: "none", userSelect: "none" as const,
              transition: isDragging ? "none" : "all 0.15s ease",
              position: "relative",
              display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
            }}>
            {/* Progress bar background */}
            <div style={{ position: "absolute", bottom: 0, left: 0, height: "3px", width: `${pct}%`, background: obj.color, transition: "width 1s linear" }} />
            {/* Time display */}
            <span style={{ fontSize: Math.min(obj.height * 0.45, 28), fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: remaining <= 5 && obj.timerRunning ? "#f87171" : "#e4e4e7" }}>
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
            {/* Status */}
            <span style={{ fontSize: "9px", color: obj.timerRunning ? obj.color : "rgba(255,255,255,0.25)", marginTop: 2 }}>
              {obj.timerRunning ? "running" : remaining <= 0 ? "done" : "paused"}
            </span>
            {/* Controls — tap to start/stop */}
            <div style={{ position: "absolute", top: 3, right: 5, display: "flex", gap: 4 }}>
              <button onPointerDown={(e) => e.stopPropagation()}
                onClick={() => updateObject(obj.id, { timerRunning: !obj.timerRunning } as any)}
                style={{ fontSize: "10px", color: obj.color, background: "none", border: "none", cursor: "pointer" }}>
                {obj.timerRunning ? "\u{23F8}" : "\u{25B6}"}
              </button>
              <button onPointerDown={(e) => e.stopPropagation()}
                onClick={() => updateObject(obj.id, { timerElapsed: 0, timerRunning: false } as any)}
                style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}>
                {"\u{23EE}"}
              </button>
            </div>
            <span style={{ position: "absolute", bottom: 5, left: 6, fontSize: "8px", opacity: 0.25 }}>{obj.label}</span>
            {showHandles && renderHandles(obj)}
          </div>
        </div>
      )
    }

    // ── Slider object ──
    if (obj.objectType === "slider") {
      const pct = ((obj.sliderValue - obj.sliderMin) / (obj.sliderMax - obj.sliderMin)) * 100
      return (
        <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
          <div onPointerDown={(e) => { if (!playMode) handlePointerDown(e, obj.id) }}
            style={{
              width: obj.width, height: obj.height, opacity: obj.opacity,
              position: "relative", cursor: playMode ? "default" : "grab", touchAction: "none", userSelect: "none" as const,
              transition: isDragging ? "none" : "all 0.15s ease",
              display: "flex", flexDirection: "column", justifyContent: "center", padding: "4px 8px",
            }}>
            {/* Track */}
            <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)", position: "relative" }}>
              {/* Fill */}
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: obj.color, transition: "width 0.1s" }} />
              {/* Thumb — interactive when selected OR in play mode */}
              <div
                onPointerDown={(e) => {
                  if (!isSelected && !playMode) return
                  e.stopPropagation()
                  const track = (e.target as HTMLElement).parentElement!
                  const onMove = (ev: PointerEvent) => {
                    const rect = track.getBoundingClientRect()
                    const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
                    const val = Math.round((obj.sliderMin + ratio * (obj.sliderMax - obj.sliderMin)) / obj.sliderStep) * obj.sliderStep
                    useLabStore.getState().updateObject(obj.id, { sliderValue: val, outputValue: val } as any)
                    if (hasLogicWires(obj.id, logicGraph)) {
                      executeFromSource(obj.id, val, logicGraph, objects, updateObject)
                    }
                  }
                  const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp) }
                  window.addEventListener("pointermove", onMove)
                  window.addEventListener("pointerup", onUp)
                }}
                style={{
                  position: "absolute", top: "50%", left: `${pct}%`,
                  transform: "translate(-50%, -50%)",
                  width: 18, height: 18, borderRadius: "50%",
                  background: obj.color, border: "2px solid #fff",
                  boxShadow: `0 2px 6px rgba(0,0,0,0.3)`,
                  cursor: isSelected ? "pointer" : "grab",
                  touchAction: "none",
                }}
              />
            </div>
            {/* Value label */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.3)" }}>{obj.sliderMin}</span>
              <span style={{ fontSize: "9px", color: obj.color, fontWeight: 600 }}>{obj.sliderValue}</span>
              <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.3)" }}>{obj.sliderMax}</span>
            </div>
            <span style={{ position: "absolute", top: -10, left: 4, fontSize: "8px", opacity: 0.3, color: obj.color }}>{obj.label}</span>
            {isSelected && <div style={{ position: "absolute", inset: -2, borderRadius: 8, border: `2px solid ${obj.color}44`, pointerEvents: "none" }} />}
            {showHandles && renderHandles(obj)}
          </div>
        </div>
      )
    }

    // ── Toggle object ──
    if (obj.objectType === "toggle") {
      return (
        <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
          <div onPointerDown={(e) => handlePointerDown(e, obj.id)}
            onClick={() => {
              if (!dragRef.current) {
                const newState = !obj.toggleState
                updateObject(obj.id, { toggleState: newState, outputValue: newState } as any)
                if (hasLogicWires(obj.id, logicGraph)) {
                  executeFromSource(obj.id, newState ? 1 : 0, logicGraph, objects, updateObject)
                }
              }
            }}
            style={{
              width: obj.width, height: obj.height, opacity: obj.opacity,
              position: "relative", cursor: "pointer", touchAction: "none", userSelect: "none" as const,
              transition: isDragging ? "none" : "all 0.15s ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
            {/* Toggle track */}
            <div style={{
              width: 44, height: 24, borderRadius: 12,
              background: obj.toggleState ? obj.color : "rgba(255,255,255,0.12)",
              transition: "background 0.2s", position: "relative",
              boxShadow: obj.toggleState ? `0 0 10px ${obj.color}44` : "none",
            }}>
              <div style={{
                position: "absolute", top: 2, left: obj.toggleState ? 22 : 2,
                width: 20, height: 20, borderRadius: "50%",
                background: "#fff", transition: "left 0.2s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              }} />
            </div>
            {/* Label */}
            {obj.toggleLabel && (
              <span style={{ fontSize: "11px", color: obj.toggleState ? obj.color : "rgba(255,255,255,0.4)" }}>{obj.toggleLabel}</span>
            )}
            <span style={{ position: "absolute", top: -10, left: 4, fontSize: "8px", opacity: 0.3, color: obj.color }}>{obj.label}</span>
            {isSelected && <div style={{ position: "absolute", inset: -2, borderRadius: 8, border: `2px solid ${obj.color}44`, pointerEvents: "none" }} />}
            {showHandles && renderHandles(obj)}
          </div>
        </div>
      )
    }

    // ── Progress Bar object ──
    if (obj.objectType === "progress") {
      const pColor = obj.progressColor || obj.color
      return (
        <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
          <div onPointerDown={(e) => handlePointerDown(e, obj.id)}
            style={{
              width: obj.width, height: obj.height, opacity: obj.opacity,
              position: "relative", cursor: "grab", touchAction: "none", userSelect: "none" as const,
              transition: isDragging ? "none" : "all 0.15s ease",
              display: "flex", alignItems: "center", padding: "0 4px",
            }}>
            <div style={{ width: "100%", height: Math.max(8, obj.height - 16), borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden", position: "relative" }}>
              <div style={{ width: `${Math.max(0, Math.min(100, obj.progressValue))}%`, height: "100%", borderRadius: 4, background: pColor, transition: "width 0.2s" }} />
            </div>
            <span style={{ position: "absolute", right: 8, fontSize: "10px", fontWeight: 600, color: pColor }}>{Math.round(obj.progressValue)}%</span>
            <span style={{ position: "absolute", top: -10, left: 4, fontSize: "8px", opacity: 0.3, color: pColor }}>{obj.label}</span>
            {isSelected && <div style={{ position: "absolute", inset: -2, borderRadius: 8, border: `2px solid ${pColor}44`, pointerEvents: "none" }} />}
            {showHandles && renderHandles(obj)}
          </div>
        </div>
      )
    }

    // ── Dropdown object ──
    if (obj.objectType === "dropdown") {
      return (
        <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
          <div onPointerDown={(e) => handlePointerDown(e, obj.id)}
            style={{
              width: obj.width, minHeight: obj.height, opacity: obj.opacity,
              position: "relative", cursor: "grab", touchAction: "none", userSelect: "none" as const,
              transition: isDragging ? "none" : "all 0.15s ease",
            }}>
            {/* Selected value display */}
            <div
              onClick={() => { if (!dragRef.current && (isSelected || playMode)) updateObject(obj.id, { dropdownOpen: !obj.dropdownOpen } as any) }}
              style={{
                width: "100%", height: obj.height,
                borderRadius: 8, padding: "0 12px",
                background: "rgba(255,255,255,0.05)",
                border: isSelected ? `2px solid ${obj.color}` : "1px solid rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                color: obj.dropdownSelected ? "#e4e4e7" : "rgba(255,255,255,0.3)",
                fontSize: "12px",
              }}>
              <span>{obj.dropdownSelected || "Select..."}</span>
              <span style={{ fontSize: "10px", opacity: 0.4 }}>{obj.dropdownOpen ? "\u25B2" : "\u25BC"}</span>
            </div>
            {/* Options list */}
            {obj.dropdownOpen && (isSelected || playMode) && (
              <div style={{
                position: "absolute", top: obj.height + 4, left: 0, width: "100%",
                background: "rgba(15,15,25,0.97)", border: `1px solid ${obj.color}44`,
                borderRadius: 8, overflow: "hidden", zIndex: 10,
                boxShadow: `0 8px 24px rgba(0,0,0,0.5)`,
              }}>
                {(obj.dropdownOptions || []).map((opt, i) => (
                  <div key={i}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      updateObject(obj.id, { dropdownSelected: opt, dropdownOpen: false, outputValue: opt } as any)
                      if (hasLogicWires(obj.id, logicGraph)) {
                        executeFromSource(obj.id, opt, logicGraph, objects, updateObject)
                      }
                    }}
                    style={{
                      padding: "8px 12px", fontSize: "12px", cursor: "pointer",
                      color: obj.dropdownSelected === opt ? obj.color : "#ccc",
                      background: obj.dropdownSelected === opt ? `${obj.color}15` : "transparent",
                      borderBottom: i < obj.dropdownOptions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}>{opt}</div>
                ))}
              </div>
            )}
            <span style={{ position: "absolute", top: -10, left: 4, fontSize: "8px", opacity: 0.3, color: obj.color }}>{obj.label}</span>
            {showHandles && renderHandles(obj)}
          </div>
        </div>
      )
    }

    // ── Counter object ──
    if (obj.objectType === "counter") {
      return (
        <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
          <div onPointerDown={(e) => handlePointerDown(e, obj.id)}
            style={{
              width: obj.width, height: obj.height, opacity: obj.opacity,
              position: "relative", cursor: "grab", touchAction: "none", userSelect: "none" as const,
              transition: isDragging ? "none" : "all 0.15s ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              borderRadius: 10,
              border: isSelected ? `2px solid ${obj.color}` : "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
            }}>
            {/* Decrement */}
            <button onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                const v = obj.counterValue - obj.counterStep
                updateObject(obj.id, { counterValue: v, outputValue: v } as any)
                if (hasLogicWires(obj.id, logicGraph)) executeFromSource(obj.id, v, logicGraph, objects, updateObject)
              }}
              style={{ width: 28, height: 28, borderRadius: "50%", background: `${obj.color}22`, border: `1px solid ${obj.color}44`, color: obj.color, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
            {/* Value */}
            <div style={{ textAlign: "center", minWidth: 40 }}>
              <div style={{ fontSize: Math.min(24, obj.height * 0.4), fontWeight: 700, color: obj.color }}>{obj.counterValue}</div>
              {obj.counterLabel && <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", marginTop: -2 }}>{obj.counterLabel}</div>}
            </div>
            {/* Increment */}
            <button onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                const v = obj.counterValue + obj.counterStep
                updateObject(obj.id, { counterValue: v, outputValue: v } as any)
                if (hasLogicWires(obj.id, logicGraph)) executeFromSource(obj.id, v, logicGraph, objects, updateObject)
              }}
              style={{ width: 28, height: 28, borderRadius: "50%", background: `${obj.color}22`, border: `1px solid ${obj.color}44`, color: obj.color, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            <span style={{ position: "absolute", top: -10, left: 4, fontSize: "8px", opacity: 0.3, color: obj.color }}>{obj.label}</span>
            {showHandles && renderHandles(obj)}
          </div>
        </div>
      )
    }

    // ── Container object ──
    if (obj.objectType === "container") {
      const children = objects.filter((o) => o.parentId === obj.id)
      return (
        <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
          <div onPointerDown={(e) => handlePointerDown(e, obj.id)}
            style={{
              width: obj.width, height: obj.height, opacity: obj.opacity,
              borderRadius: "10px",
              border: isSelected ? `2px solid ${obj.color}` : `1.5px dashed ${obj.color}66`,
              background: `${obj.color}08`,
              boxShadow: isSelected ? `0 0 20px ${obj.color}22` : "none",
              cursor: "grab", touchAction: "none", userSelect: "none" as const,
              transition: isDragging ? "none" : "all 0.15s ease",
              position: "relative", overflow: "hidden",
              padding: obj.containerPadding || 8,
              display: obj.containerLayout === "vertical" ? "flex" : obj.containerLayout === "horizontal" ? "flex" : "block",
              flexDirection: obj.containerLayout === "vertical" ? "column" : "row",
              gap: obj.containerGap || 8,
            }}>
            {/* Container label */}
            <span style={{
              position: "absolute", top: -14, left: 6,
              fontSize: "9px", fontWeight: 600, color: obj.color,
              fontFamily: "'JetBrains Mono', monospace",
              opacity: 0.6,
            }}>{obj.label}</span>
            {/* Empty state */}
            {children.length === 0 && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: `${obj.color}44`, fontSize: "11px",
                pointerEvents: "none",
              }}>Drop objects here</div>
            )}
            {showHandles && renderHandles(obj)}
          </div>
        </div>
      )
    }

    // ── Input object ──
    if (obj.objectType === "input") {
      const inputEditing = isSelected && !dragRef.current
      return (
        <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
          <div onPointerDown={(e) => handlePointerDown(e, obj.id)}
            style={{
              width: obj.width, height: obj.height, opacity: obj.opacity,
              position: "relative",
              cursor: "grab", touchAction: "none", userSelect: "none" as const,
              transition: isDragging ? "none" : "all 0.15s ease",
            }}>
            {/* Drag handle overlay — covers input unless selected */}
            {!inputEditing && (
              <div style={{ position: "absolute", inset: 0, zIndex: 2, borderRadius: "8px",
                background: "rgba(255,255,255,0.04)",
                border: isSelected ? `2px solid ${obj.color}` : "1px solid rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", paddingLeft: 12,
              }}>
                <span className="text-[13px]" style={{ color: obj.inputValue ? "#e4e4e7" : "rgba(255,255,255,0.25)" }}>
                  {obj.inputValue || obj.placeholder || "Tap to edit"}
                </span>
              </div>
            )}
            {/* Actual input — only interactive when selected */}
            {inputEditing && (
              <input
                type={obj.inputType || "text"}
                value={obj.inputValue || ""}
                placeholder={obj.placeholder || ""}
                autoFocus
                onChange={(e) => updateObject(obj.id, { inputValue: e.target.value, outputValue: e.target.value } as any)}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full h-full px-3 text-[13px] outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: `2px solid ${obj.color}`,
                  borderRadius: "8px",
                  color: "#e4e4e7",
                  boxShadow: `0 0 12px ${obj.color}33`,
                  position: "relative", zIndex: 3,
                }}
              />
            )}
            <span style={{ position: "absolute", top: -10, left: 4, fontSize: "8px", opacity: 0.3, color: obj.color, zIndex: 4 }}>{obj.label}</span>
            {showHandles && renderHandles(obj)}
          </div>
        </div>
      )
    }

    // ── Text object (Phase 1A: inline editing — double-tap or pencil icon) ──
    if (obj.objectType === "text") {
      const isInlineEditing = inlineEditId === obj.id
      return (
        <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
          <div
            onPointerDown={(e) => {
              if (isInlineEditing) { e.stopPropagation(); return }
              // Normal drag/select — double-tap handler in handlePointerDown enters edit via the interceptor above
              handlePointerDown(e, obj.id)
            }}
            style={{
              width: obj.width, minHeight: obj.height, opacity: obj.opacity,
              color: obj.color, fontSize: obj.fontSize || 16,
              textAlign: obj.textAlign || "left",
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.4,
              padding: "4px 8px",
              borderRadius: "6px",
              border: isInlineEditing ? `2px solid ${obj.color}` : isSelected ? "2px solid rgba(255,255,255,0.4)" : "1px solid transparent",
              boxShadow: isInlineEditing ? `0 0 20px ${obj.color}33` : isSelected ? "0 0 15px rgba(255,255,255,0.1)" : "none",
              cursor: isInlineEditing ? "text" : "grab",
              touchAction: isInlineEditing ? "auto" : "none",
              userSelect: isInlineEditing ? "text" as const : "none" as const,
              transition: isDragging ? "none" : "all 0.15s ease",
              position: "relative",
              overflow: isInlineEditing ? "visible" : "hidden",
              wordBreak: "break-word" as const,
            }}>
            {isInlineEditing ? (
              <textarea
                autoFocus
                value={obj.textContent || ""}
                onChange={(e) => updateObject(obj.id, { textContent: e.target.value } as any)}
                onBlur={() => setInlineEditId(null)}
                onKeyDown={(e) => { if (e.key === "Escape") setInlineEditId(null) }}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  width: "100%", minHeight: obj.height - 8,
                  background: "transparent", border: "none", outline: "none", resize: "vertical",
                  color: obj.color, fontSize: obj.fontSize || 16,
                  textAlign: obj.textAlign || "left",
                  fontFamily: "'DM Sans', sans-serif",
                  lineHeight: 1.4, padding: 0,
                }}
              />
            ) : (
              <>
                {obj.textContent || "Text"}
                {/* Pencil icon — visible when selected, tap to edit */}
                {isSelected && (
                  <span
                    onPointerDown={(e) => { e.stopPropagation(); setInlineEditId(obj.id) }}
                    style={{
                      position: "absolute", top: -10, right: -6,
                      width: 20, height: 20, borderRadius: "50%",
                      background: "rgba(167,139,250,0.9)", border: "1.5px solid #fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "10px", cursor: "pointer", zIndex: 5,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                    }}>{"\u{270f}\ufe0f"}</span>
                )}
              </>
            )}
            <span style={{ position: "absolute", bottom: 1, right: 4, fontSize: "8px", opacity: 0.25 }}>{obj.label}</span>
            {showHandles && renderHandles(obj)}
          </div>
        </div>
      )
    }

    // ── Image object ──
    if (obj.objectType === "image") {
      return (
        <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
          <div onPointerDown={(e) => handlePointerDown(e, obj.id)}
            style={{
              width: obj.width, height: obj.height, opacity: obj.opacity,
              borderRadius: "8px", overflow: "hidden",
              border: isSelected ? "3px solid #60a5fa" : "2px dashed rgba(96,165,250,0.3)",
              boxShadow: isSelected ? "0 0 20px rgba(96,165,250,0.3)" : "none",
              background: obj.imageSrc ? `url(${obj.imageSrc}) center/cover no-repeat` : obj.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "grab", touchAction: "none", userSelect: "none" as const,
              transition: isDragging ? "none" : "all 0.15s ease",
              position: "relative",
            }}>
            {!obj.imageSrc && <span style={{ fontSize: "20px", opacity: 0.4 }}>{"\u{1F5BC}"}</span>}
            <span style={{ position: "absolute", top: 4, left: 6, fontSize: "10px", fontWeight: "bold", color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{obj.label}</span>
            {showHandles && renderHandles(obj)}
          </div>
        </div>
      )
    }

    // ── Button object ──
    if (obj.objectType === "button") {
      const bc = obj.buttonConfig
      const handleBtnTap = () => {
        if (!bc) return

        // Logic engine path — if this button has wires, use the engine
        if (hasLogicWires(obj.id, logicGraph)) {
          if (bc.style === "toggle") {
            // Toggle buttons flip state and send 1/0
            const newToggle = !bc.toggleState
            updateObject(obj.id, { buttonConfig: { ...bc, toggleState: newToggle }, outputValue: newToggle ? 1 : 0 } as any)
            executeFromSource(obj.id, newToggle ? 1 : 0, logicGraph, objects, updateObject)
            addDebug(`\u{26A1} LOGIC: ${obj.label} \u2192 ${newToggle ? 1 : 0}`, "signal")
          } else {
            // Oneshot buttons send their label text on every tap (impulse)
            const outVal = bc.buttonLabel || obj.label
            updateObject(obj.id, { outputValue: outVal } as any)
            executeFromSource(obj.id, outVal, logicGraph, objects, updateObject)
            addDebug(`\u{26A1} LOGIC: ${obj.label} \u2192 "${outVal}"`, "signal")
          }
          return
        }

        // Legacy path — hardcoded buttonConfig
        const targetObj = objects.find((o) => o.label.toUpperCase() === bc.targetLabel.toUpperCase())
        if (bc.targetType === "object" && targetObj) {
          switch (bc.action) {
            case "toggle_visibility":
              updateObject(targetObj.id, { opacity: targetObj.opacity > 0 ? 0 : 1 })
              if (bc.style === "toggle") updateObject(obj.id, { buttonConfig: { ...bc, toggleState: !bc.toggleState } } as any)
              break
            case "set_color_random":
              updateObject(targetObj.id, { hue: Math.floor(Math.random() * 360) })
              break
            case "animate_spin":
              updateObject(targetObj.id, { animation: "spin", animSpeed: 2 })
              break
            case "animate_bounce":
              updateObject(targetObj.id, { animation: "bounce", animSpeed: 2 })
              break
            case "stop_animation":
              updateObject(targetObj.id, { animation: null })
              break
            case "delete":
              deleteObject(targetObj.id)
              break
          }
          addDebug(`\u{1F518} BTN ${obj.label}: ${bc.action} \u2192 ${bc.targetLabel}`, "signal")
        } else if (bc.targetType === "device") {
          fetch(`/api/termux/${bc.targetLabel}`, { method: "POST" }).catch(() => {})
          addDebug(`\u{1F518} BTN ${obj.label}: device/${bc.targetLabel}`, "signal")
        } else if (bc.targetType === "url" && bc.targetLabel) {
          window.open(bc.targetLabel, "_blank")
          addDebug(`\u{1F518} BTN ${obj.label}: open ${bc.targetLabel}`, "signal")
        }
      }

      return (
        <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
          <div
            onPointerDown={(e) => { if (!playMode) handlePointerDown(e, obj.id) }}
            onClick={(e) => { if (playMode || !dragRef.current) handleBtnTap() }}
            style={{
              width: obj.width, height: obj.height, opacity: obj.opacity,
              borderRadius: "10px",
              background: bc?.style === "toggle" && bc.toggleState
                ? `linear-gradient(135deg, ${obj.color}, hsl(${obj.hue},70%,45%))`
                : `linear-gradient(135deg, hsl(${obj.hue},60%,40%), hsl(${obj.hue},60%,30%))`,
              border: isSelected && !playMode ? `3px solid ${obj.color}` : `2px solid ${obj.color}66`,
              boxShadow: isSelected && !playMode ? `0 0 20px ${obj.color}44` : `0 2px 8px rgba(0,0,0,0.4)`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              cursor: "pointer", touchAction: "none", userSelect: "none" as const,
              transition: isDragging ? "none" : "all 0.15s ease",
              position: "relative",
            }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.4)", letterSpacing: "0.5px" }}>
              {bc?.buttonLabel || "Tap"}
            </span>
            {bc?.style === "toggle" && (
              <span style={{ position: "absolute", top: 3, right: 5, width: 6, height: 6, borderRadius: "50%", background: bc.toggleState ? "#22c55e" : "#666" }} />
            )}
            {bc?.style === "link" && (
              <span style={{ fontSize: "10px", opacity: 0.5 }}>{"\u2197"}</span>
            )}
            <span style={{ position: "absolute", bottom: 2, left: 5, fontSize: "8px", opacity: 0.4, color: "#fff" }}>{obj.label}</span>
            {showHandles && renderHandles(obj)}
          </div>
        </div>
      )
    }

    if (obj.shape === "triangle") {
      return (
        <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
          <div onPointerDown={(e) => handlePointerDown(e, obj.id)}
            style={{
              width: 0, height: 0,
              borderLeft: `${obj.width / 2}px solid transparent`,
              borderRight: `${obj.width / 2}px solid transparent`,
              borderBottom: `${obj.height}px solid ${obj.color}`,
              opacity: obj.opacity, cursor: "grab", touchAction: "none", userSelect: "none" as const,
              transition: isDragging ? "none" : "all 0.15s ease",
              filter: isSelected ? `drop-shadow(0 0 12px ${obj.color})` : "none",
            }}>
            <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: `${obj.height * 0.35}px`,
              fontSize: "11px", fontWeight: "bold", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)", pointerEvents: "none",
            }}>{obj.label}</span>
          </div>
          {/* Handles overlay for triangle — uses bounding box */}
          {showHandles && (
            <div style={{ position: "absolute", top: 0, left: 0, width: obj.width, height: obj.height, pointerEvents: "none" }}>
              <div style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "auto" }}>
                {renderHandles({ ...obj })}
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={obj.id} style={{ position: "absolute", left: obj.x, top: obj.y, zIndex: obj.zIndex || 1, animation: animCSS, ...orbitStyle }}>
        <div onPointerDown={(e) => handlePointerDown(e, obj.id)}
          style={{
            width: obj.width, height: obj.height,
            opacity: obj.opacity, backgroundColor: obj.color,
            borderRadius: obj.shape === "circle" ? "50%" : "8px",
            border: isSelected ? "3px solid #fff" : "2px solid rgba(255,255,255,0.2)",
            boxShadow: isSelected ? `0 0 20px ${obj.color}, 0 0 40px ${obj.color}44` : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: editMode && isSelected ? "default" : "grab",
            touchAction: "none", userSelect: "none" as const,
            transition: isDragging ? "none" : "all 0.15s ease",
            fontSize: "12px", fontWeight: "bold", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            position: "relative",
          }}>
          {obj.label}
          {obj.width !== obj.height && (
            <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: "8px", opacity: 0.5 }}>
              {obj.width}x{obj.height}
            </span>
          )}
          {obj.groupId && (
            <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: "#a78bfa", border: "1px solid #fff" }} />
          )}
          {/* Handles inside the shape div */}
          {showHandles && renderHandles(obj)}
        </div>
      </div>
    )
  }

  const typeColor: Record<string, string> = {
    signal: "#4ae0c8", conversion: "#e0c07a", connection: "#c49ef0",
    system: "#9a9690", voice: "#a78bfa", error: "#f87171",
  }

  // ── Auth ──
  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center gap-6" style={{ background: "#07070f", color: "#e4e4e7", height: "100dvh" }}>
        <div className="text-6xl opacity-20">{"\u{1F512}"}</div>
        <p className="text-sm text-zinc-500">SU Lab requires authorization</p>
        <input type="password" value={authCode} onChange={(e) => setAuthCode(e.target.value)}
          placeholder="Access code" className="glass rounded-lg px-4 py-2 text-sm outline-none w-48 text-center"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (authCode === "aria-su" || authCode === "su")) {
              localStorage.setItem("aria_su_authorized", "true"); setAuthorized(true)
            }
          }} />
        <p className="text-xs text-zinc-600">Hint: the slash command that unlocks everything</p>
      </div>
    )
  }

  const selectedObj = objects.find((o) => o.id === selectedId)

  return (
    <div className="flex flex-col relative" style={{ background: "#07070f", color: "#e4e4e7", height: "100dvh", overflow: "hidden" }}>
      {/* Animation keyframes */}
      <style>{`
        @keyframes lab-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes lab-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes lab-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes lab-orbit { from { offset-distance: 0%; } to { offset-distance: 100%; } }
      `}</style>

      {/* Full-screen Canvas */}
      <div ref={canvasRef} className="flex-1 relative overflow-hidden"
        style={{ background: canvasBg }}
        onClick={() => { if (actionDrawer) setActionDrawer(false) }}
        onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>

        {/* Zoomable content layer — scale from center */}
        <div style={{ transform: `scale(${canvasZoom})`, transformOrigin: "center center", position: "absolute", inset: 0 }}>

        {/* Grid */}
        {showGrid && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }}>
          {Array.from({ length: 20 }, (_, i) => (
            <line key={`v${i}`} x1={`${(i + 1) * 5}%`} y1="0" x2={`${(i + 1) * 5}%`} y2="100%" stroke="#8888aa" strokeWidth="1" />
          ))}
          {Array.from({ length: 20 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={`${(i + 1) * 5}%`} x2="100%" y2={`${(i + 1) * 5}%`} stroke="#8888aa" strokeWidth="1" />
          ))}
        </svg>
        )}

        {/* Top bar — drawer handle */}
        <div className="absolute top-0 left-0 right-0 z-10">
          {/* Slim bar (always visible) */}
          <div className="flex items-center justify-between px-3 py-2"
            style={{ background: "rgba(7,7,15,0.85)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${actionDrawer ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.05)"}` }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest" style={{ color: "#a78bfa", fontFamily: "'JetBrains Mono', monospace" }}>LAB</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-400" : "bg-zinc-700"}`} />
              {selectedObj && (
                <span className="text-[9px] text-zinc-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <span style={{ color: selectedObj.color }}>{selectedObj.label}</span> {selectedObj.shape} {selectedObj.width}x{selectedObj.height}{editMode ? " EDIT" : ""}
                </span>
              )}
              <span className="text-[9px] text-zinc-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ({objects.length})
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <button onClick={() => setPlayMode(!playMode)}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide transition-all"
                style={{
                  background: playMode ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)",
                  color: playMode ? "#22c55e" : "#666",
                  border: `1px solid ${playMode ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.08)"}`,
                }}
                title={playMode ? "Switch to Build mode" : "Switch to Play mode"}>
                {playMode ? "\u25A0 BUILD" : "\u25B6 PLAY"}
              </button>
              {!playMode && <button onClick={() => undo()} className="text-zinc-600 hover:text-white/70 px-1" title="Undo">{"\u21A9"}</button>}
              {!playMode && <button onClick={() => redo()} className="text-zinc-600 hover:text-white/70 px-1" title="Redo">{"\u21AA"}</button>}
              <button onClick={() => setShowDebug(true)} className="text-zinc-500 hover:text-zinc-300 px-1">DBG</button>
              {/* Drawer handle */}
              <button onClick={() => setActionDrawer(!actionDrawer)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all"
                style={{ background: actionDrawer ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${actionDrawer ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.06)"}` }}>
                <span style={{ color: actionDrawer ? "#a78bfa" : "#666", fontSize: "12px" }}>{actionDrawer ? "\u2715" : "\u2630"}</span>
              </button>
            </div>
          </div>

          {/* Action drawer (slides down) */}
          {actionDrawer && (
            <div style={{
              background: "rgba(7,7,15,0.95)", backdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(167,139,250,0.15)",
              animation: "slideDown 0.2s ease",
            }}>
              <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
              <div className="grid grid-cols-4 gap-1 px-3 py-3">
                {/* New Project */}
                <button onClick={() => { if (confirm("Start new? Current project will be lost.")) { resetAll(); setActionDrawer(false) } }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:bg-white/5">
                  <span className="text-lg">{"📄"}</span>
                  <span className="text-[9px] text-zinc-400">New</span>
                </button>
                {/* Save */}
                <button onClick={() => {
                  const json = exportProject()
                  const blob = new Blob([json], { type: "application/json" })
                  const a = document.createElement("a")
                  a.href = URL.createObjectURL(blob)
                  a.download = `su-project-${Date.now()}.json`
                  a.click()
                  setActionDrawer(false)
                }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:bg-white/5">
                  <span className="text-lg">{"💾"}</span>
                  <span className="text-[9px] text-zinc-400">Save</span>
                </button>
                {/* Load */}
                <button onClick={() => {
                  const input = document.createElement("input")
                  input.type = "file"; input.accept = ".json"
                  input.onchange = (e: any) => {
                    const file = e.target?.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => { importProject(ev.target?.result as string); setActionDrawer(false) }
                    reader.readAsText(file)
                  }
                  input.click()
                }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:bg-white/5">
                  <span className="text-lg">{"📂"}</span>
                  <span className="text-[9px] text-zinc-400">Load</span>
                </button>
                {/* Settings */}
                <button className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all opacity-40">
                  <span className="text-lg">{"⚙️"}</span>
                  <span className="text-[9px] text-zinc-500">Settings</span>
                </button>
                {/* Export React */}
                <button className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all opacity-40">
                  <span className="text-lg">{"📦"}</span>
                  <span className="text-[9px] text-zinc-500">Export</span>
                </button>
                {/* Game */}
                <a href="/game" className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:bg-white/5">
                  <span className="text-lg">{"🎮"}</span>
                  <span className="text-[9px] text-zinc-400">Game</span>
                </a>
                {/* Dashboard */}
                <a href="/dashboard" className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:bg-white/5">
                  <span className="text-lg">{"📊"}</span>
                  <span className="text-[9px] text-zinc-400">Dashboard</span>
                </a>
                {/* Tutorials */}
                <button onClick={() => { setActionDrawer(false); setCreationDrawer(false); setTutorialBrowser(true) }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:bg-white/5">
                  <span className="text-lg">{"🎓"}</span>
                  <span className="text-[9px] text-zinc-400">Tutorials</span>
                </button>
              </div>
              {/* Close handle */}
              <div onClick={() => setActionDrawer(false)} className="flex justify-center py-1.5 cursor-pointer">
                <div className="w-10 h-1 rounded-full" style={{ background: "rgba(167,139,250,0.3)" }} />
              </div>
            </div>
          )}
        </div>

        {/* Phase 1C: Group bounding box overlays */}
        {(() => {
          const groups = new Map<string, LabObject[]>()
          objects.forEach((o) => { if (o.groupId) { const g = groups.get(o.groupId) || []; g.push(o); groups.set(o.groupId, g) } })
          return Array.from(groups.entries()).map(([gid, members]) => {
            if (members.length < 2) return null
            const minX = Math.min(...members.map((o) => o.x)) - 8
            const minY = Math.min(...members.map((o) => o.y)) - 18
            const maxX = Math.max(...members.map((o) => o.x + o.width)) + 8
            const maxY = Math.max(...members.map((o) => o.y + o.height)) + 8
            return (
              <div key={`group-${gid}`} style={{
                position: "absolute", left: minX, top: minY,
                width: maxX - minX, height: maxY - minY,
                border: "1.5px dashed rgba(167,139,250,0.35)",
                borderRadius: "10px", pointerEvents: "none",
                zIndex: 0,
              }}>
                <span style={{
                  position: "absolute", top: 2, left: 8,
                  fontSize: "8px", color: "rgba(167,139,250,0.5)",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.5px",
                }}>{gid}</span>
              </div>
            )
          })
        })()}

        {/* Objects */}
        {objects.map((obj) => renderShape(obj, obj.id === selectedId))}

        </div>{/* end zoom layer */}

        {/* Properties overlay */}
        {!playMode && <div className="absolute bottom-3 left-3 text-[8px] font-mono pointer-events-none" style={{ opacity: 0.4, maxHeight: "80px", overflow: "hidden" }}>
          {objects.map((o) => (
            <div key={o.id} style={{ color: o.id === selectedId ? "#a78bfa" : "#333" }}>
              {o.id === selectedId ? "\u25b6" : " "} {o.label}: ({Math.round(o.x)},{Math.round(o.y)}) {o.width}x{o.height} {o.shape}{o.animation ? ` [${o.animation}]` : ""}
            </div>
          ))}
        </div>}
      </div>

      {/* Bottom Bar: scrollable object strip + orb */}
      {!playMode && <div className="shrink-0 flex items-center gap-2 px-3 py-2 relative z-20"
        style={{ background: "rgba(7,7,15,0.85)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>

        {/* Scrollable object chips */}
        <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar">
          {objects.map((o) => (
            <button key={o.id}
              onClick={() => { selectObject(o.id); addDebug(`\u{1F3AF} SELECT: ${o.label}`, "signal") }}
              className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all"
              style={{
                background: o.id === selectedId ? `${o.color}22` : "rgba(255,255,255,0.03)",
                border: o.id === selectedId ? `2px solid ${o.color}` : "1px solid rgba(255,255,255,0.08)",
                color: o.id === selectedId ? o.color : "#555",
              }}>
              {o.label.slice(0, 2)}
            </button>
          ))}
          {/* Add button — opens creation drawer */}
          {objects.length < 20 && (
            <button
              onClick={() => setCreationDrawer(true)}
              className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", color: "#555" }}>
              +
            </button>
          )}
        </div>

        {/* Aria Orb */}
        <button onClick={isConnected ? disconnectAria : connectAria} disabled={connecting}
          className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all"
          style={{
            background: isConnected ? "radial-gradient(circle, rgba(167,139,250,0.25) 0%, rgba(167,139,250,0.05) 100%)" : "rgba(255,255,255,0.03)",
            border: `2px solid ${isConnected ? "#a78bfa" : "rgba(255,255,255,0.1)"}`,
            boxShadow: isConnected ? "0 0 30px rgba(167,139,250,0.3)" : "none",
            opacity: connecting ? 0.5 : 1,
          }}>
          <span style={{ fontSize: "1.4rem" }}>{isConnected ? "\u2728" : "\u{1F50C}"}</span>
        </button>
      </div>}

      {/* Creation Drawer */}
      {creationDrawer && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={() => setCreationDrawer(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative rounded-t-2xl p-5 panel-up"
            style={{ background: "rgba(12,12,20,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(167,139,250,0.2)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-3" />
              <span className="text-sm font-medium" style={{ color: "#a78bfa" }}>Add to Canvas</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* Shape */}
              <button onClick={() => { addObject(); setCreationDrawer(false); addDebug("\u{2795} ADD: shape", "system") }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg" style={{ background: "hsl(220,70%,60%)", borderRadius: "8px" }} />
                <span className="text-[11px] text-zinc-400">Shape</span>
              </button>
              {/* Image */}
              <button onClick={() => { addObject({ objectType: "image" as any, shape: "square", width: 120, height: 120 }); setCreationDrawer(false); addDebug("\u{1F5BC} ADD: image", "system") }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(96,165,250,0.15)", border: "1px dashed rgba(96,165,250,0.4)" }}>
                  <span className="text-lg">{"\u{1F5BC}"}</span>
                </div>
                <span className="text-[11px] text-zinc-400">Image</span>
              </button>
              {/* Button */}
              <button onClick={() => {
                addObject({
                  objectType: "button" as any, shape: "square", width: 100, height: 44,
                  buttonConfig: { targetType: "object", targetLabel: "", action: "toggle_visibility", actionArgs: {}, style: "oneshot", buttonLabel: "Tap", toggleState: false } as any,
                })
                setCreationDrawer(false)
                addDebug("\u{1F518} ADD: button", "system")
              }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}>
                  <span className="text-[10px] font-bold" style={{ color: "#a78bfa" }}>BTN</span>
                </div>
                <span className="text-[11px] text-zinc-400">Button</span>
              </button>
              {/* Text */}
              <button onClick={() => {
                addObject({ objectType: "text" as any, shape: "square", width: 150, height: 36, textContent: "Text", fontSize: 16 } as any)
                setCreationDrawer(false)
                addDebug("\u{1F524} ADD: text", "system")
              }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <span className="text-[12px] font-serif text-white/70">Aa</span>
                </div>
                <span className="text-[11px] text-zinc-400">Text</span>
              </button>
              {/* Input */}
              <button onClick={() => {
                addObject({ objectType: "input" as any, shape: "square", width: 180, height: 40, placeholder: "Type here..." } as any)
                setCreationDrawer(false)
                addDebug("\u{1F4DD} ADD: input", "system")
              }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)" }}>
                  <span className="text-[11px] text-white/50">[_]</span>
                </div>
                <span className="text-[11px] text-zinc-400">Input</span>
              </button>
              {/* Timer */}
              <button onClick={() => {
                addObject({ objectType: "timer" as any, shape: "square", width: 120, height: 60, timerDuration: 60 } as any)
                setCreationDrawer(false)
                addDebug("\u{23F1} ADD: timer", "system")
              }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
                  <span className="text-[14px]">{"\u{23F1}"}</span>
                </div>
                <span className="text-[11px] text-zinc-400">Timer</span>
              </button>
              {/* Slider */}
              <button onClick={() => {
                addObject({ objectType: "slider" as any, shape: "square", width: 160, height: 40 } as any)
                setCreationDrawer(false)
                addDebug("\u{1F39A} ADD: slider", "system")
              }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
                  <div style={{ width: 20, height: 3, background: "#60a5fa", borderRadius: 2, position: "relative" }}>
                    <div style={{ position: "absolute", top: -4, left: "60%", width: 8, height: 8, borderRadius: "50%", background: "#60a5fa", border: "1.5px solid #fff" }} />
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400">Slider</span>
              </button>
              {/* Toggle */}
              <button onClick={() => {
                addObject({ objectType: "toggle" as any, shape: "square", width: 80, height: 36 } as any)
                setCreationDrawer(false)
                addDebug("\u{1F504} ADD: toggle", "system")
              }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <div style={{ width: 22, height: 12, borderRadius: 6, background: "#22c55e", position: "relative" }}>
                    <div style={{ position: "absolute", top: 1, right: 1, width: 10, height: 10, borderRadius: "50%", background: "#fff" }} />
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400">Toggle</span>
              </button>
              {/* Progress */}
              <button onClick={() => {
                addObject({ objectType: "progress" as any, shape: "square", width: 160, height: 28 } as any)
                setCreationDrawer(false)
                addDebug("\u{1F4CA} ADD: progress", "system")
              }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
                  <div style={{ width: 22, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
                    <div style={{ width: "60%", height: "100%", background: "#eab308", borderRadius: 2 }} />
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400">Progress</span>
              </button>
              {/* Dropdown */}
              <button onClick={() => {
                addObject({ objectType: "dropdown" as any, shape: "square", width: 150, height: 36 } as any)
                setCreationDrawer(false)
                addDebug("\u{1F4CB} ADD: dropdown", "system")
              }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <span className="text-[10px] text-white/50">{"\u25BC"}</span>
                </div>
                <span className="text-[11px] text-zinc-400">Dropdown</span>
              </button>
              {/* Counter */}
              <button onClick={() => {
                addObject({ objectType: "counter" as any, shape: "square", width: 140, height: 50 } as any)
                setCreationDrawer(false)
                addDebug("\u{1F522} ADD: counter", "system")
              }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.2)" }}>
                  <span className="text-[14px] font-bold" style={{ color: "#f472b6" }}>42</span>
                </div>
                <span className="text-[11px] text-zinc-400">Counter</span>
              </button>
              {/* Container */}
              <button onClick={() => {
                addObject({ objectType: "container" as any, shape: "square", width: 200, height: 160, color: "hsl(260,60%,55%)" } as any)
                setCreationDrawer(false)
                addDebug("\u{1F4E6} ADD: container", "system")
              }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(167,139,250,0.08)", border: "1.5px dashed rgba(167,139,250,0.4)" }}>
                  <span className="text-[10px] font-mono" style={{ color: "#a78bfa" }}>[ ]</span>
                </div>
                <span className="text-[11px] text-zinc-400">Container</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Panel */}
      {configOpen && !playMode && (() => {
        const obj = objects.find((o) => o.id === configOpen)
        if (!obj) return null
        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={() => setConfigOpen(null)}>
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative rounded-2xl p-4 w-[85%] max-w-[320px] overflow-y-auto no-scrollbar"
              style={{ background: "rgba(15,15,25,0.95)", backdropFilter: "blur(20px)", border: `1px solid ${obj.color}33`,
                boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${obj.color}11`, maxHeight: "80vh" }}
              onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5" style={{ backgroundColor: obj.color, borderRadius: obj.shape === "circle" ? "50%" : "4px", opacity: obj.opacity }} />
                  <span className="text-sm font-semibold" style={{ color: obj.color }}>Configure</span>
                </div>
                <button onClick={() => setConfigOpen(null)} className="text-zinc-500 hover:text-zinc-300 text-xs">close</button>
              </div>

              {/* Name */}
              <div className="mb-3">
                <label className="text-[10px] text-zinc-500 block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>NAME</label>
                <input type="text" value={obj.label}
                  onChange={(e) => updateObject(obj.id, { label: e.target.value.slice(0, 12) })}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${obj.color}33`, color: "#e4e4e7" }}
                  maxLength={12} />
              </div>

              {/* Properties */}
              <div className="space-y-1.5 text-[10px] font-mono" style={{ color: "#888" }}>
                <div className="flex justify-between"><span>Position</span><span style={{ color: "#ccc" }}>({Math.round(obj.x)}, {Math.round(obj.y)})</span></div>
                <div className="flex justify-between"><span>Size</span><span style={{ color: "#ccc" }}>{obj.width} x {obj.height}px</span></div>
                <div className="flex justify-between"><span>Shape</span><span style={{ color: "#ccc" }}>{obj.shape}{obj.width !== obj.height ? (obj.shape === "circle" ? " (oval)" : " (rect)") : ""}</span></div>
                <div className="flex justify-between"><span>Opacity</span><span style={{ color: "#ccc" }}>{(obj.opacity * 100).toFixed(0)}%</span></div>
              </div>

              {/* Color Picker */}
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <label className="text-[10px] text-zinc-500 block mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>COLOR</label>
                <ColorPicker hue={obj.hue} onChange={(hue) => updateObject(obj.id, { hue, color: `hsl(${hue},70%,60%)` })} />
              </div>

              {/* Logic Editor — available for ALL object types */}
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={() => { setConfigOpen(null); setLogicEditorFor(obj.id) }}
                  className="w-full rounded-xl p-3 text-left transition-all"
                  style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium" style={{ color: "#a78bfa" }}>{"\u26A1"} Logic Editor</span>
                    <span className="text-[9px] text-white/20">
                      {logicGraph.wires.filter((w) => w.fromNodeId === obj.id || w.toNodeId === obj.id).length > 0
                        ? `${logicGraph.nodes.length} blocks \u00b7 ${logicGraph.wires.length} wires`
                        : "No logic yet"}
                    </span>
                  </div>
                </button>
              </div>

              {/* Behavior Cards */}
              {(() => {
                const behaviors = graphToBehaviors(obj.id, logicGraph, objects)
                return (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] text-zinc-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BEHAVIORS</label>
                      <span className="text-[9px] text-white/20">{behaviors.length}</span>
                    </div>

                    {/* Existing behaviors */}
                    {behaviors.map((b) => (
                      <div key={b.id} className="rounded-lg p-2.5 mb-2" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.15)" }}>
                        <p className="text-[10px] text-white/60 leading-relaxed">{b.label}</p>
                        <div className="flex gap-1 mt-1.5">
                          <button onClick={() => { setConfigOpen(null); setLogicEditorFor(obj.id) }}
                            className="text-[9px] px-2 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.15)" }}>
                            Edit in Graph
                          </button>
                          <button onClick={() => {
                            useLabStore.getState()._pushSnapshot()
                            removeBehaviorFromGraph(b,
                              useLabStore.getState().deleteWire,
                              useLabStore.getState().deleteLogicBlock,
                              useLabStore.getState().deleteListener,
                            )
                          }}
                            className="text-[9px] px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.1)" }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    {behaviors.length === 0 && (
                      <p className="text-[9px] text-white/20 mb-2">No behaviors yet. Add one below or use the Logic Editor.</p>
                    )}

                    {/* Presets */}
                    <div className="space-y-1">
                      {BEHAVIOR_PRESETS.map((preset) => (
                        <button key={preset.name} onClick={() => {
                          useLabStore.getState()._pushSnapshot()
                          const state = useLabStore.getState()
                          const partial = preset.create(obj.id, objects)
                          const behavior: Behavior = {
                            ...partial,
                            id: "beh_" + Math.random().toString(36).slice(2, 6),
                            label: "",
                            _wireIds: [], _blockIds: [], _listenerIds: [],
                          }
                          const result = behaviorToGraph(behavior, state.logicGraph,
                            state.addWire, state.addLogicBlock, state.updateLogicBlock, state.addListener)
                          behavior._wireIds = result.wireIds
                          behavior._blockIds = result.blockIds
                          behavior._listenerIds = result.listenerIds
                        }}
                          className="w-full text-left rounded-lg p-2 transition-all hover:bg-white/3"
                          style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                          <span className="text-[10px] text-white/50">{preset.name}</span>
                          <span className="text-[8px] text-white/20 ml-2">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Type-specific config */}
              {obj.objectType === "timer" && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <label className="text-[10px] text-zinc-500 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TIMER CONFIG</label>
                  <div className="flex gap-2 items-center">
                    <label className="text-[10px] text-zinc-500 shrink-0">Duration (sec)</label>
                    <input type="number" value={obj.timerDuration || 60} min={1} max={3600}
                      onChange={(e) => updateObject(obj.id, { timerDuration: Math.max(1, Number(e.target.value)), timerElapsed: 0 } as any)}
                      className="flex-1 rounded-lg px-3 py-1.5 text-[11px] outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateObject(obj.id, { timerDuration: 10, timerElapsed: 0 } as any)}
                      className="flex-1 py-1 rounded-lg text-[10px]" style={{ background: "rgba(255,255,255,0.03)", color: "#888", border: "1px solid rgba(255,255,255,0.06)" }}>10s</button>
                    <button onClick={() => updateObject(obj.id, { timerDuration: 30, timerElapsed: 0 } as any)}
                      className="flex-1 py-1 rounded-lg text-[10px]" style={{ background: "rgba(255,255,255,0.03)", color: "#888", border: "1px solid rgba(255,255,255,0.06)" }}>30s</button>
                    <button onClick={() => updateObject(obj.id, { timerDuration: 60, timerElapsed: 0 } as any)}
                      className="flex-1 py-1 rounded-lg text-[10px]" style={{ background: "rgba(255,255,255,0.03)", color: "#888", border: "1px solid rgba(255,255,255,0.06)" }}>1m</button>
                    <button onClick={() => updateObject(obj.id, { timerDuration: 300, timerElapsed: 0 } as any)}
                      className="flex-1 py-1 rounded-lg text-[10px]" style={{ background: "rgba(255,255,255,0.03)", color: "#888", border: "1px solid rgba(255,255,255,0.06)" }}>5m</button>
                  </div>
                </div>
              )}

              {obj.objectType === "container" && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <label className="text-[10px] text-zinc-500 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>CONTAINER CONFIG</label>
                  {/* Layout */}
                  <div className="flex gap-1">
                    {(["free", "vertical", "horizontal"] as const).map((l) => (
                      <button key={l} onClick={() => updateObject(obj.id, { containerLayout: l } as any)}
                        className="flex-1 py-1 rounded-lg text-[10px] transition-all"
                        style={{
                          background: (obj.containerLayout || "free") === l ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.02)",
                          color: (obj.containerLayout || "free") === l ? "#a78bfa" : "#555",
                          border: (obj.containerLayout || "free") === l ? "1px solid rgba(167,139,250,0.3)" : "1px solid rgba(255,255,255,0.05)",
                        }}>{l}</button>
                    ))}
                  </div>
                  {/* Padding */}
                  <div className="flex gap-2 items-center">
                    <label className="text-[10px] text-zinc-500 shrink-0 w-12">Pad</label>
                    <input type="range" min={0} max={24} value={obj.containerPadding || 8}
                      onChange={(e) => updateObject(obj.id, { containerPadding: Number(e.target.value) } as any)}
                      className="flex-1" />
                    <span className="text-[10px] text-zinc-400 w-5 text-right">{obj.containerPadding || 8}</span>
                  </div>
                  {/* Gap */}
                  <div className="flex gap-2 items-center">
                    <label className="text-[10px] text-zinc-500 shrink-0 w-12">Gap</label>
                    <input type="range" min={0} max={24} value={obj.containerGap || 8}
                      onChange={(e) => updateObject(obj.id, { containerGap: Number(e.target.value) } as any)}
                      className="flex-1" />
                    <span className="text-[10px] text-zinc-400 w-5 text-right">{obj.containerGap || 8}</span>
                  </div>
                  {/* Children list */}
                  {(() => {
                    const kids = objects.filter((o) => o.parentId === obj.id)
                    return (
                      <div>
                        <label className="text-[10px] text-zinc-600 block mb-1">
                          {kids.length} children {kids.length > 0 && `(${kids.map((k) => k.label).join(", ")})`}
                        </label>
                        {kids.length > 0 && (
                          <button onClick={() => { kids.forEach((k) => updateObject(k.id, { parentId: null } as any)) }}
                            className="text-[10px] py-1 px-2 rounded-lg transition-all"
                            style={{ background: "rgba(255,255,255,0.03)", color: "#888", border: "1px solid rgba(255,255,255,0.06)" }}>
                            Release all children
                          </button>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              {obj.objectType === "slider" && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <label className="text-[10px] text-zinc-500 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SLIDER CONFIG</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] text-zinc-600">Min</label>
                      <input type="number" value={obj.sliderMin} onChange={(e) => updateObject(obj.id, { sliderMin: Number(e.target.value) } as any)}
                        className="w-full rounded-lg px-2 py-1 text-[11px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] text-zinc-600">Max</label>
                      <input type="number" value={obj.sliderMax} onChange={(e) => updateObject(obj.id, { sliderMax: Number(e.target.value) } as any)}
                        className="w-full rounded-lg px-2 py-1 text-[11px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] text-zinc-600">Step</label>
                      <input type="number" value={obj.sliderStep} min={1} onChange={(e) => updateObject(obj.id, { sliderStep: Math.max(1, Number(e.target.value)) } as any)}
                        className="w-full rounded-lg px-2 py-1 text-[11px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="text-[10px] text-zinc-500 shrink-0">Value</label>
                    <input type="range" min={obj.sliderMin} max={obj.sliderMax} step={obj.sliderStep} value={obj.sliderValue}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        updateObject(obj.id, { sliderValue: v, outputValue: v } as any)
                        if (hasLogicWires(obj.id, logicGraph)) executeFromSource(obj.id, v, logicGraph, objects, updateObject)
                      }}
                      className="flex-1" />
                    <span className="text-[10px] text-zinc-400 w-8 text-right">{obj.sliderValue}</span>
                  </div>
                </div>
              )}

              {obj.objectType === "toggle" && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <label className="text-[10px] text-zinc-500 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TOGGLE CONFIG</label>
                  <input type="text" value={obj.toggleLabel || ""} onChange={(e) => updateObject(obj.id, { toggleLabel: e.target.value } as any)}
                    placeholder="Label (optional)..."
                    className="w-full rounded-lg px-3 py-1.5 text-[11px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-zinc-500">Default state:</span>
                    <button onClick={() => updateObject(obj.id, { toggleState: !obj.toggleState, outputValue: !obj.toggleState } as any)}
                      className="text-[10px] px-3 py-1 rounded-lg" style={{ background: obj.toggleState ? `${obj.color}22` : "rgba(255,255,255,0.03)", color: obj.toggleState ? obj.color : "#666", border: `1px solid ${obj.toggleState ? obj.color + "44" : "rgba(255,255,255,0.08)"}` }}>
                      {obj.toggleState ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              )}

              {obj.objectType === "progress" && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <label className="text-[10px] text-zinc-500 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PROGRESS CONFIG</label>
                  <div className="flex gap-2 items-center">
                    <label className="text-[10px] text-zinc-500 shrink-0">Value</label>
                    <input type="range" min={0} max={100} value={obj.progressValue}
                      onChange={(e) => updateObject(obj.id, { progressValue: Number(e.target.value), outputValue: Number(e.target.value) } as any)}
                      className="flex-1" />
                    <span className="text-[10px] text-zinc-400 w-8 text-right">{Math.round(obj.progressValue)}%</span>
                  </div>
                </div>
              )}

              {obj.objectType === "dropdown" && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <label className="text-[10px] text-zinc-500 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DROPDOWN OPTIONS</label>
                  {(obj.dropdownOptions || []).map((opt, i) => (
                    <div key={i} className="flex gap-1 items-center">
                      <input type="text" value={opt}
                        onChange={(e) => {
                          const opts = [...(obj.dropdownOptions || [])]
                          opts[i] = e.target.value
                          updateObject(obj.id, { dropdownOptions: opts } as any)
                        }}
                        className="flex-1 rounded-lg px-2 py-1 text-[11px] outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
                      <button onClick={() => {
                        const opts = (obj.dropdownOptions || []).filter((_, j) => j !== i)
                        updateObject(obj.id, { dropdownOptions: opts } as any)
                      }} className="text-[10px] text-red-400/50 px-1">x</button>
                    </div>
                  ))}
                  <button onClick={() => {
                    const opts = [...(obj.dropdownOptions || []), `Option ${(obj.dropdownOptions || []).length + 1}`]
                    updateObject(obj.id, { dropdownOptions: opts } as any)
                  }} className="text-[10px] py-1 px-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", color: "#888", border: "1px solid rgba(255,255,255,0.06)" }}>+ Add option</button>
                </div>
              )}

              {obj.objectType === "counter" && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <label className="text-[10px] text-zinc-500 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>COUNTER CONFIG</label>
                  <input type="text" value={obj.counterLabel || ""} onChange={(e) => updateObject(obj.id, { counterLabel: e.target.value } as any)}
                    placeholder="Label (optional)..."
                    className="w-full rounded-lg px-3 py-1.5 text-[11px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] text-zinc-600">Step</label>
                      <input type="number" value={obj.counterStep} min={1} onChange={(e) => updateObject(obj.id, { counterStep: Math.max(1, Number(e.target.value)) } as any)}
                        className="w-full rounded-lg px-2 py-1 text-[11px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] text-zinc-600">Initial</label>
                      <input type="number" value={obj.counterValue} onChange={(e) => updateObject(obj.id, { counterValue: Number(e.target.value), outputValue: Number(e.target.value) } as any)}
                        className="w-full rounded-lg px-2 py-1 text-[11px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
                    </div>
                  </div>
                  <button onClick={() => updateObject(obj.id, { counterValue: 0, outputValue: 0 } as any)}
                    className="text-[10px] py-1 px-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", color: "#888", border: "1px solid rgba(255,255,255,0.06)" }}>Reset to 0</button>
                </div>
              )}

              {obj.objectType === "input" && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <label className="text-[10px] text-zinc-500 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>INPUT CONFIG</label>
                  <div className="flex gap-1">
                    {(["text", "number"] as const).map((t) => (
                      <button key={t} onClick={() => updateObject(obj.id, { inputType: t } as any)}
                        className="flex-1 py-1 rounded-lg text-[10px] transition-all"
                        style={{
                          background: obj.inputType === t ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.02)",
                          color: obj.inputType === t ? "#e4e4e7" : "#555",
                          border: obj.inputType === t ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.05)",
                        }}>{t}</button>
                    ))}
                  </div>
                  <input type="text" value={obj.placeholder || ""}
                    onChange={(e) => updateObject(obj.id, { placeholder: e.target.value } as any)}
                    placeholder="Placeholder text..."
                    className="w-full rounded-lg px-3 py-2 text-[11px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
                </div>
              )}

              {obj.objectType === "text" && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <label className="text-[10px] text-zinc-500 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TEXT CONTENT</label>
                  <textarea value={obj.textContent || ""}
                    onChange={(e) => updateObject(obj.id, { textContent: e.target.value } as any)}
                    rows={3}
                    className="w-full rounded-lg px-3 py-2 text-[11px] outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }} />
                  <div className="flex gap-2 items-center">
                    <label className="text-[10px] text-zinc-500 shrink-0">Size</label>
                    <input type="range" min={10} max={48} value={obj.fontSize || 16}
                      onChange={(e) => updateObject(obj.id, { fontSize: Number(e.target.value) } as any)}
                      className="flex-1" />
                    <span className="text-[10px] text-zinc-400 w-6 text-right">{obj.fontSize || 16}</span>
                  </div>
                  <div className="flex gap-1">
                    {(["left", "center", "right"] as const).map((a) => (
                      <button key={a} onClick={() => updateObject(obj.id, { textAlign: a } as any)}
                        className="flex-1 py-1 rounded-lg text-[10px] transition-all"
                        style={{
                          background: obj.textAlign === a ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.02)",
                          color: obj.textAlign === a ? "#e4e4e7" : "#555",
                          border: obj.textAlign === a ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.05)",
                        }}>{a}</button>
                    ))}
                  </div>
                </div>
              )}

              {obj.objectType === "image" && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <label className="text-[10px] text-zinc-500 block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>IMAGE SOURCE</label>
                  <input type="text" value={obj.imageSrc && !obj.imageSrc.startsWith("data:") ? obj.imageSrc : ""}
                    onChange={(e) => updateObject(obj.id, { imageSrc: e.target.value } as any)}
                    placeholder="URL or file path..."
                    className="w-full rounded-lg px-3 py-2 text-[11px] outline-none mb-2"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(96,165,250,0.2)", color: "#e4e4e7" }} />
                  <div className="flex gap-2">
                    <label className="flex-1 rounded-lg py-2 text-[11px] font-medium text-center cursor-pointer transition-all"
                      style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" }}>
                      Choose File
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string
                          updateObject(obj.id, { imageSrc: dataUrl } as any)
                          saveToImageGallery(dataUrl)
                        }
                        reader.readAsDataURL(file)
                      }} />
                    </label>
                    <label className="flex-1 rounded-lg py-2 text-[11px] font-medium text-center cursor-pointer transition-all"
                      style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
                      Camera
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string
                          updateObject(obj.id, { imageSrc: dataUrl } as any)
                          saveToImageGallery(dataUrl)
                          addDebug(`\u{1F4F7} Camera photo loaded: ${(dataUrl.length / 1024).toFixed(0)}KB`, "system")
                        }
                        reader.readAsDataURL(file)
                      }} />
                    </label>
                  </div>
                  {/* Phase 1B: Recent images gallery */}
                  {(() => {
                    const gallery = getImageGallery()
                    if (gallery.length === 0) return null
                    return (
                      <div className="mt-2">
                        <label className="text-[10px] text-zinc-600 block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>RECENT</label>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                          {gallery.map((src, i) => (
                            <button key={i} onClick={() => updateObject(obj.id, { imageSrc: src } as any)}
                              className="shrink-0 w-11 h-11 rounded-lg overflow-hidden transition-all"
                              style={{
                                border: obj.imageSrc === src ? "2px solid #60a5fa" : "1px solid rgba(255,255,255,0.1)",
                                background: `url(${src}) center/cover`,
                              }} />
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {obj.objectType === "button" && obj.buttonConfig && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <label className="text-[10px] text-zinc-500 block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BUTTON CONFIG</label>
                  {/* Button label */}
                  <input type="text" value={obj.buttonConfig.buttonLabel}
                    onChange={(e) => updateObject(obj.id, { buttonConfig: { ...obj.buttonConfig!, buttonLabel: e.target.value } } as any)}
                    placeholder="Button label..."
                    className="w-full rounded-lg px-3 py-1.5 text-[11px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.2)", color: "#e4e4e7" }} />
                  {/* Target type */}
                  <select value={obj.buttonConfig.targetType}
                    onChange={(e) => updateObject(obj.id, { buttonConfig: { ...obj.buttonConfig!, targetType: e.target.value as any } } as any)}
                    className="w-full rounded-lg px-3 py-1.5 text-[11px] outline-none bg-transparent"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.2)", color: "#e4e4e7" }}>
                    <option value="object">Target: Object</option>
                    <option value="device">Target: Device</option>
                    <option value="url">Target: URL</option>
                  </select>
                  {/* Target label / URL */}
                  <input type="text" value={obj.buttonConfig.targetLabel}
                    onChange={(e) => updateObject(obj.id, { buttonConfig: { ...obj.buttonConfig!, targetLabel: e.target.value } } as any)}
                    placeholder={obj.buttonConfig.targetType === "url" ? "https://..." : obj.buttonConfig.targetType === "device" ? "torch / volume / battery" : "Object label (A, B, ...)"}
                    className="w-full rounded-lg px-3 py-1.5 text-[11px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.2)", color: "#e4e4e7" }} />
                  {/* Action (for object targets) */}
                  {obj.buttonConfig.targetType === "object" && (
                    <select value={obj.buttonConfig.action}
                      onChange={(e) => updateObject(obj.id, { buttonConfig: { ...obj.buttonConfig!, action: e.target.value } } as any)}
                      className="w-full rounded-lg px-3 py-1.5 text-[11px] outline-none bg-transparent"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.2)", color: "#e4e4e7" }}>
                      <option value="toggle_visibility">Toggle Visibility</option>
                      <option value="set_color_random">Random Color</option>
                      <option value="animate_spin">Start Spin</option>
                      <option value="animate_bounce">Start Bounce</option>
                      <option value="stop_animation">Stop Animation</option>
                      <option value="delete">Delete Object</option>
                    </select>
                  )}
                  {/* Style */}
                  <div className="flex gap-1">
                    {(["toggle", "oneshot", "link"] as const).map((s) => (
                      <button key={s} onClick={() => updateObject(obj.id, { buttonConfig: { ...obj.buttonConfig!, style: s } } as any)}
                        className="flex-1 rounded-lg py-1 text-[10px] transition-all"
                        style={{
                          background: obj.buttonConfig!.style === s ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.03)",
                          color: obj.buttonConfig!.style === s ? "#a78bfa" : "#666",
                          border: obj.buttonConfig!.style === s ? "1px solid rgba(167,139,250,0.3)" : "1px solid rgba(255,255,255,0.06)",
                        }}>{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={() => {
                  const newId = duplicateObject(obj.id)
                  if (newId) { setConfigOpen(null); addDebug(`\u{1F4CB} DUPLICATE: ${obj.label}`, "system") }
                }}
                  className="flex-1 rounded-lg py-2 text-[11px] font-medium transition-all"
                  style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
                  Duplicate
                </button>
                <button onClick={() => {
                  if (objects.length > 1) { deleteObject(obj.id); setConfigOpen(null); addDebug(`\u{1F5D1} DELETE: ${obj.label}`, "system") }
                }}
                  disabled={objects.length <= 1}
                  className="flex-1 rounded-lg py-2 text-[11px] font-medium transition-all"
                  style={{ background: "rgba(239,68,68,0.1)", color: objects.length > 1 ? "#f87171" : "#444", border: "1px solid rgba(239,68,68,0.15)" }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Logic Editor */}
      {logicEditorFor && !playMode && (
        <LogicEditor sourceObjectId={logicEditorFor} onClose={() => setLogicEditorFor(null)} />
      )}

      {/* Debug Drawer */}
      {showDebug && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowDebug(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-[75%] max-w-[320px] h-full flex flex-col drawer-open"
            style={{ background: "rgba(12,12,20,0.97)", backdropFilter: "blur(20px)", borderLeft: "1px solid rgba(167,139,250,0.15)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: "'JetBrains Mono', monospace" }}>
              <span className="text-[10px] font-bold tracking-wider" style={{ color: "#a78bfa" }}>I/O DEBUG</span>
              <div className="flex gap-2">
                <button onClick={() => setDebugLog([])} className="text-[9px] text-zinc-500 hover:text-zinc-300">CLR</button>
                <button onClick={() => setShowDebug(false)} className="text-[9px] text-zinc-500 hover:text-zinc-300">x</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 text-[9px] leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {debugLog.map((e) => (
                <div key={e.id} className="mb-1" style={{ color: typeColor[e.type] || "#666" }}>
                  <span style={{ opacity: 0.3 }}>[{e.timestamp}]</span> {e.message}
                </div>
              ))}
              {debugLog.length === 0 && <div className="text-zinc-700 mt-4 text-center">Connect Aria to begin...</div>}
            </div>
            <div className="shrink-0 px-3 py-2 text-[8px] font-mono" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", color: "#444" }}>
              {objects.map((o) => (
                <div key={o.id} style={{ color: o.id === selectedId ? "#a78bfa" : "#333" }}>
                  {o.label}: ({Math.round(o.x)},{Math.round(o.y)}) {o.width}x{o.height} {o.shape}{o.animation ? ` [${o.animation}]` : ""}
                </div>
              ))}
              <div className="flex items-center justify-between mt-2 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color: "#a78bfa" }}>Training: {trainingLogger?.count() || 0} examples</span>
                <button onClick={() => trainingLogger?.download([...SHARED_FUNCTIONS, ...CANVAS_FUNCTIONS, ...LOGIC_FUNCTIONS], "functiongemma")}
                  className="text-[8px] underline" style={{ color: "#4ae0c8" }}>Export JSONL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Browser */}
      {tutorialBrowser && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setTutorialBrowser(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative rounded-t-2xl" style={{ background: "rgba(12,12,20,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(167,139,250,0.2)", maxHeight: "75vh" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-4 pb-2 text-center">
              <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-3" />
              <span className="text-sm font-medium" style={{ color: "#a78bfa" }}>{"🎓"} Guided Tutorials</span>
              <p className="text-[10px] text-white/30 mt-1">Aria builds it step by step, explaining as she goes</p>
            </div>
            <div className="px-4 pb-5 overflow-y-auto" style={{ maxHeight: "60vh" }}>
              <div className="space-y-2">
                {getAvailableRecipes().map((recipe) => (
                  <button key={recipe.id} onClick={() => {
                    if (!confirm(`Start "${recipe.name}" tutorial? This will clear the current canvas.`)) return
                    // Clear canvas fully — resetAll leaves 2 default objects, so clear then delete all
                    resetAll()
                    // Clear the default objects too
                    const st = useLabStore.getState()
                    st.objects.forEach((o) => st.deleteObject(o.id))
                    setTutorialBrowser(false)
                    setTutorialRunner({ recipe, stepIndex: 0, running: true })
                  }}
                    className="w-full text-left rounded-xl p-4 transition-all hover:bg-white/5"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{recipe.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-white/80">{recipe.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                            background: recipe.difficulty === "beginner" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)",
                            color: recipe.difficulty === "beginner" ? "#22c55e" : "#eab308",
                          }}>{recipe.difficulty}</span>
                        </div>
                        <p className="text-[10px] text-white/40 mt-1 leading-relaxed">{recipe.description}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[9px] text-white/20">{recipe.estimated_steps} steps</span>
                          <span className="text-[9px] text-white/20">{recipe.objects_used.join(", ")}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Runner Overlay — positioned ABOVE the bottom bar */}
      {tutorialRunner && tutorialRunner.running && (() => {
        const { recipe, stepIndex } = tutorialRunner
        const step = recipe.steps[stepIndex]
        const isLastStep = stepIndex >= recipe.steps.length - 1
        const progress = ((stepIndex + 1) / recipe.steps.length) * 100
        const isExecuting = (tutorialRunner as any)._executing

        return (
          <div className="fixed left-0 right-0 z-30" style={{ bottom: 72, pointerEvents: "none" }}>
            <div style={{
              pointerEvents: "auto",
              background: "rgba(12,12,20,0.97)", backdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(167,139,250,0.2)",
              borderRadius: "16px 16px 0 0",
              maxHeight: "50vh", overflowY: "auto",
            }}>
              {/* Progress bar */}
              <div style={{ height: 3, background: "rgba(255,255,255,0.05)", position: "sticky", top: 0 }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "#a78bfa", borderRadius: 2, transition: "width 0.3s" }} />
              </div>

              <div className="px-4 pt-3 pb-3">
                {/* Step header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{recipe.icon}</span>
                    <span className="text-[11px] font-medium" style={{ color: "#a78bfa" }}>Step {stepIndex + 1}/{recipe.steps.length}</span>
                  </div>
                  <button onClick={() => setTutorialRunner(null)} className="text-[10px] px-2 py-1 rounded-lg"
                    style={{ color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    Exit
                  </button>
                </div>

                {/* Step title */}
                <h3 className="text-[13px] font-medium text-white/80 mb-1">{step?.title}</h3>

                {/* Aria says */}
                <p className="text-[11px] text-white/50 leading-relaxed mb-2 italic">
                  {"\u201c" + (step?.aria_says || "") + "\u201d"}
                </p>

                {/* Explain — collapsible for space */}
                {step?.explain && (
                  <details className="mb-3">
                    <summary className="text-[10px] cursor-pointer" style={{ color: "#a78bfa" }}>Why this matters</summary>
                    <div className="rounded-lg p-2.5 mt-1" style={{ background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.1)" }}>
                      <p className="text-[10px] text-white/40 leading-relaxed">{step.explain}</p>
                    </div>
                  </details>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={async () => {
                    if (!step || isExecuting) return
                    // Set executing state
                    setTutorialRunner({ ...tutorialRunner, _executing: true } as any)
                    // Execute this step's actions
                    if (step.actions.length > 0) {
                      await executeStep(step, handleFunction, 300)
                    }
                    // Advance
                    if (isLastStep) {
                      setTutorialRunner(null)
                    } else {
                      setTutorialRunner({ ...tutorialRunner, stepIndex: stepIndex + 1 })
                    }
                  }}
                    disabled={isExecuting}
                    className="flex-1 px-4 py-2.5 rounded-xl text-[11px] font-medium transition-all"
                    style={{
                      background: isExecuting ? "rgba(255,255,255,0.03)" : isLastStep ? "rgba(34,197,94,0.15)" : "rgba(167,139,250,0.15)",
                      color: isExecuting ? "#666" : isLastStep ? "#22c55e" : "#a78bfa",
                      border: `1px solid ${isExecuting ? "rgba(255,255,255,0.06)" : isLastStep ? "rgba(34,197,94,0.3)" : "rgba(167,139,250,0.3)"}`,
                    }}>
                    {isExecuting ? "Building..." : isLastStep ? "Finish \u2714" : step?.actions.length ? `Build Step ${stepIndex + 1} \u2192` : "Next \u2192"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
