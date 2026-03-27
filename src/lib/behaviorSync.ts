/**
 * Behavior Sync Engine
 *
 * Bidirectional sync between Behavior cards (simple WHEN/THEN) and LogicGraph (wires/blocks).
 * Behaviors are a simplified projection of the graph — cards create graph entries,
 * and simple graph patterns auto-generate card representations.
 */

import type { LogicGraph, LogicBlock, Wire, LabObject, LogicBlockType, Condition, ValueRef, LogicAction } from "@/store/lab"

export interface Behavior {
  id: string
  // Trigger
  trigger: {
    type: "tap" | "change" | "threshold" | "timer_end" | "app_start"
    sourceObjectId: string
    property?: string
    operator?: string
    value?: any
  }
  // Optional condition
  condition: {
    left: ValueRef
    operator: string
    right: ValueRef
  } | null
  // Actions
  actions: Array<{
    targetObjectId: string
    property: string
    value: ValueRef
  }>
  // Metadata
  label: string
  createdVia: "card" | "graph" | "voice"
  // Graph references (for sync)
  _wireIds: string[]
  _blockIds: string[]
  _listenerIds: string[]
}

/**
 * Generate a human-readable label for a behavior.
 */
export function behaviorLabel(behavior: Behavior, objects: LabObject[]): string {
  const src = objects.find((o) => o.id === behavior.trigger.sourceObjectId)
  const srcName = src?.label || "?"

  const triggerDesc = behavior.trigger.type === "tap" ? "tapped"
    : behavior.trigger.type === "change" ? `${behavior.trigger.property || "value"} changes`
    : behavior.trigger.type === "threshold" ? `${behavior.trigger.property} ${behavior.trigger.operator} ${behavior.trigger.value}`
    : behavior.trigger.type === "timer_end" ? "timer ends"
    : "starts"

  const actionDescs = behavior.actions.map((a) => {
    const tgt = objects.find((o) => o.id === a.targetObjectId)
    const val = a.value.type === "constant" ? String((a.value as any).value) : a.value.type === "input" ? "value" : "..."
    return `set ${tgt?.label || "?"}.${a.property} to ${val}`
  })

  return `When ${srcName} ${triggerDesc}, ${actionDescs.join(", ") || "..."}`
}

/**
 * Card → Graph: Create wires/blocks from a behavior card.
 * Returns the IDs of created graph elements.
 */
export function behaviorToGraph(
  behavior: Behavior,
  graph: LogicGraph,
  addWire: (wire: Omit<Wire, "id">) => string,
  addLogicBlock?: (x?: number, y?: number, blockType?: LogicBlockType) => string,
  updateLogicBlock?: (id: string, updates: Partial<LogicBlock>) => void,
  addListener?: (listener: any) => string,
): { wireIds: string[]; blockIds: string[]; listenerIds: string[] } {
  const wireIds: string[] = []
  const blockIds: string[] = []
  const listenerIds: string[] = []

  const srcId = behavior.trigger.sourceObjectId

  if (behavior.trigger.type === "change" || behavior.trigger.type === "threshold") {
    // Create a listener
    if (addListener) {
      const lid = addListener({
        x: 150, y: 80,
        watchObjectId: srcId,
        watchProperty: behavior.trigger.property || "outputValue",
        triggerType: behavior.trigger.type === "threshold" ? "on_threshold" : "on_change",
        thresholdOperator: behavior.trigger.operator,
        thresholdValue: behavior.trigger.value,
      })
      listenerIds.push(lid)

      // Wire listener to targets
      for (const action of behavior.actions) {
        if (behavior.condition && addLogicBlock && updateLogicBlock) {
          // Listener → Logic Block → Target
          const bid = addLogicBlock(200, 150, "if_else")
          blockIds.push(bid)
          const cond: Condition = {
            type: "if_else",
            test: { left: behavior.condition.left, operator: behavior.condition.operator as any, right: behavior.condition.right },
            thenAction: { property: action.property, value: action.value },
            elseAction: null,
          }
          updateLogicBlock(bid, { condition: cond })
          wireIds.push(addWire({ fromNodeId: lid, fromPort: "out", toNodeId: bid, toPort: "in" }))
          wireIds.push(addWire({ fromNodeId: bid, fromPort: "out", toNodeId: action.targetObjectId, toPort: action.property }))
        } else {
          // Direct: Listener → Target
          wireIds.push(addWire({ fromNodeId: lid, fromPort: "out", toNodeId: action.targetObjectId, toPort: action.property }))
        }
      }
    }
  } else {
    // Tap or other — wire from source directly
    for (const action of behavior.actions) {
      if (behavior.condition && addLogicBlock && updateLogicBlock) {
        // Source → Logic Block → Target
        const bid = addLogicBlock(200, 150, "if_else")
        blockIds.push(bid)
        const cond: Condition = {
          type: "if_else",
          test: { left: behavior.condition.left, operator: behavior.condition.operator as any, right: behavior.condition.right },
          thenAction: { property: action.property, value: action.value },
          elseAction: null,
        }
        updateLogicBlock(bid, { condition: cond })
        wireIds.push(addWire({ fromNodeId: srcId, fromPort: "out", toNodeId: bid, toPort: "in" }))
        wireIds.push(addWire({ fromNodeId: bid, fromPort: "out", toNodeId: action.targetObjectId, toPort: action.property }))
      } else {
        // Direct: Source → Target
        wireIds.push(addWire({ fromNodeId: srcId, fromPort: "out", toNodeId: action.targetObjectId, toPort: action.property }))
      }
    }
  }

  return { wireIds, blockIds, listenerIds }
}

/**
 * Graph → Card: Detect simple patterns and generate behavior card representations.
 * Returns behaviors for patterns it can express, and marks complex patterns as "advanced".
 */
export function graphToBehaviors(
  objectId: string,
  graph: LogicGraph,
  objects: LabObject[]
): Behavior[] {
  const behaviors: Behavior[] = []

  // Find direct wires FROM this object
  const directWires = graph.wires.filter((w) => w.fromNodeId === objectId)
  const obj = objects.find((o) => o.id === objectId)
  if (!obj) return behaviors

  for (const wire of directWires) {
    const targetBlock = graph.nodes.find((n) => n.id === wire.toNodeId)
    const targetObj = objects.find((o) => o.id === wire.toNodeId)

    if (targetObj && !targetBlock) {
      // Direct wire: Object → Object (no logic block)
      behaviors.push({
        id: `beh_${wire.id}`,
        trigger: { type: "tap", sourceObjectId: objectId },
        condition: null,
        actions: [{ targetObjectId: targetObj.id, property: wire.toPort || "outputValue", value: { type: "input" } }],
        label: "",
        createdVia: "graph",
        _wireIds: [wire.id],
        _blockIds: [],
        _listenerIds: [],
      })
    } else if (targetBlock && targetBlock.condition) {
      // Object → Logic Block → ? (find output wires from block)
      const blockOutWires = graph.wires.filter((w) => w.fromNodeId === targetBlock.id)
      const actions = blockOutWires.map((bw) => ({
        targetObjectId: bw.toNodeId,
        property: bw.toPort || targetBlock.condition!.thenAction.property,
        value: targetBlock.condition!.thenAction.value,
      }))

      if (actions.length > 0) {
        behaviors.push({
          id: `beh_${wire.id}_${targetBlock.id}`,
          trigger: { type: "tap", sourceObjectId: objectId },
          condition: {
            left: targetBlock.condition.test.left,
            operator: targetBlock.condition.test.operator,
            right: targetBlock.condition.test.right,
          },
          actions,
          label: "",
          createdVia: "graph",
          _wireIds: [wire.id, ...blockOutWires.map((w) => w.id)],
          _blockIds: [targetBlock.id],
          _listenerIds: [],
        })
      }
    }
  }

  // Find listeners watching this object
  for (const listener of (graph.listeners || [])) {
    if (listener.watchObjectId === objectId) {
      const listenerWires = graph.wires.filter((w) => w.fromNodeId === listener.id)
      const actions = listenerWires.map((lw) => {
        const tgtObj = objects.find((o) => o.id === lw.toNodeId)
        return { targetObjectId: lw.toNodeId, property: lw.toPort || "outputValue", value: { type: "input" as const } }
      })

      if (actions.length > 0) {
        behaviors.push({
          id: `beh_listen_${listener.id}`,
          trigger: {
            type: listener.triggerType === "on_threshold" ? "threshold" : "change",
            sourceObjectId: objectId,
            property: listener.watchProperty,
            operator: listener.thresholdOperator,
            value: listener.thresholdValue,
          },
          condition: null,
          actions,
          label: "",
          createdVia: "graph",
          _wireIds: listenerWires.map((w) => w.id),
          _blockIds: [],
          _listenerIds: [listener.id],
        })
      }
    }
  }

  // Generate labels
  for (const b of behaviors) {
    b.label = behaviorLabel(b, objects)
  }

  return behaviors
}

/**
 * Remove a behavior's graph elements.
 */
export function removeBehaviorFromGraph(
  behavior: Behavior,
  deleteWire: (id: string) => void,
  deleteLogicBlock: (id: string) => void,
  deleteListener: (id: string) => void,
): void {
  for (const wid of behavior._wireIds) deleteWire(wid)
  for (const bid of behavior._blockIds) deleteLogicBlock(bid)
  for (const lid of behavior._listenerIds) deleteListener(lid)
}

/**
 * Preset behavior templates.
 */
export interface BehaviorPreset {
  name: string
  description: string
  create: (sourceId: string, objects: LabObject[]) => Omit<Behavior, "id" | "label" | "_wireIds" | "_blockIds" | "_listenerIds">
}

export const BEHAVIOR_PRESETS: BehaviorPreset[] = [
  {
    name: "Toggle visibility",
    description: "Tap to show/hide another object",
    create: (sourceId, objects) => {
      const other = objects.find((o) => o.id !== sourceId)
      return {
        trigger: { type: "tap", sourceObjectId: sourceId },
        condition: { left: { type: "input" }, operator: "==", right: { type: "constant", value: 1 } },
        actions: [{ targetObjectId: other?.id || sourceId, property: "opacity", value: { type: "constant", value: 1 } }],
        createdVia: "card",
      }
    },
  },
  {
    name: "Link slider to progress",
    description: "Slider value controls progress bar",
    create: (sourceId, objects) => {
      const progress = objects.find((o) => o.objectType === "progress" && o.id !== sourceId)
      return {
        trigger: { type: "change", sourceObjectId: sourceId, property: "sliderValue" },
        condition: null,
        actions: [{ targetObjectId: progress?.id || sourceId, property: "progressValue", value: { type: "input" } }],
        createdVia: "card",
      }
    },
  },
  {
    name: "Counter increment",
    description: "Tap to increase a counter",
    create: (sourceId, objects) => {
      const counter = objects.find((o) => o.objectType === "counter" && o.id !== sourceId)
      return {
        trigger: { type: "tap", sourceObjectId: sourceId },
        condition: null,
        actions: [{ targetObjectId: counter?.id || sourceId, property: "counterValue", value: { type: "input" } }],
        createdVia: "card",
      }
    },
  },
  {
    name: "Timer alert",
    description: "When timer ends, change color",
    create: (sourceId, objects) => {
      const shape = objects.find((o) => o.objectType === "shape" && o.id !== sourceId)
      return {
        trigger: { type: "change", sourceObjectId: sourceId, property: "timerRunning" },
        condition: null,
        actions: [{ targetObjectId: shape?.id || sourceId, property: "color", value: { type: "constant", value: "hsl(0,70%,60%)" } }],
        createdVia: "card",
      }
    },
  },
]
