/**
 * Logic Execution Engine — Phase 3
 *
 * Supports 7 block types:
 * - if_else: Conditional branching (with optional AND/OR compound)
 * - compare: Dedicated boolean output from comparison
 * - math: Arithmetic operations (+, -, ×, ÷, %, random)
 * - delay: setTimeout wrapper (fires output after N ms)
 * - set_variable: Stores value in named variable
 * - get_variable: Outputs current value of named variable
 * - loop: Repeat N times or while condition true
 *
 * Design:
 * - Pure functions, no side effects beyond calling updateObject
 * - Cycle prevention via depth limit (MAX_DEPTH=20)
 * - Each block type has its own evaluation path
 */

import type { LogicGraph, LogicBlock, Wire, Condition, ValueRef, LogicAction, LabObject, CompareOp } from "@/store/lab"

const MAX_DEPTH = 20

/**
 * Execute logic from a source object that emitted a value.
 * Traces all wires from the source, evaluates logic blocks, applies actions.
 */
export function executeFromSource(
  sourceId: string,
  outputValue: any,
  graph: LogicGraph,
  objects: LabObject[],
  updateObject: (id: string, updates: Partial<LabObject>) => void,
  depth: number = 0
): void {
  if (depth > MAX_DEPTH) return

  const outWires = graph.wires.filter((w) => w.fromNodeId === sourceId)

  for (const wire of outWires) {
    const logicBlock = graph.nodes.find((n) => n.id === wire.toNodeId)

    if (logicBlock) {
      evaluateBlock(logicBlock, outputValue, graph, objects, updateObject, depth)
    } else {
      // Direct wire to an object — set the target property directly
      const target = objects.find((o) => o.id === wire.toNodeId)
      if (target && target.objectType === "counter" && (wire.toPort === "counterIncrement" || wire.toPort === "counterValue")) {
        // Counter wires always increment by counterStep (impulse signal)
        const newVal = (target.counterValue || 0) + (target.counterStep || 1)
        updateObject(wire.toNodeId, { counterValue: newVal, outputValue: newVal })
        // Propagate new value through counter's output wires
        executeFromSource(wire.toNodeId, newVal, graph, objects, updateObject, depth + 1)
      } else {
        updateObject(wire.toNodeId, { [wire.toPort]: outputValue })
        // Propagate from updated object so downstream blocks (e.g. collision) can react
        executeFromSource(wire.toNodeId, outputValue, graph, objects, updateObject, depth + 1)
      }
    }
  }
}

/**
 * Evaluate a logic block based on its blockType and propagate results.
 *
 * Each block computes an output value, then delegates routing to
 * executeFromSource(block.id, value) which properly handles both
 * logic block targets (evaluateBlock) and canvas object targets (updateObject).
 */
function evaluateBlock(
  block: LogicBlock,
  inputValue: any,
  graph: LogicGraph,
  objects: LabObject[],
  updateObject: (id: string, updates: Partial<LabObject>) => void,
  depth: number
): void {
  const blockType = block.blockType || "if_else" // backward compat

  switch (blockType) {
    case "if_else": {
      if (!block.condition) return
      const result = evaluateCondition(block.condition, inputValue, objects, graph.variables)
      if (result.action) {
        const resolved = resolveValue(result.action.value, inputValue, objects, graph.variables)
        executeFromSource(block.id, resolved, graph, objects, updateObject, depth + 1)
      }
      break
    }

    case "compare": {
      if (!block.condition) return
      const left = resolveValue(block.condition.test.left, inputValue, objects, graph.variables)
      const right = resolveValue(block.condition.test.right, inputValue, objects, graph.variables)
      const result = compareValues(left, right, block.condition.test.operator)
      executeFromSource(block.id, result, graph, objects, updateObject, depth + 1)
      break
    }

    case "math": {
      const left = block.mathLeft ? resolveValue(block.mathLeft, inputValue, objects, graph.variables) : inputValue
      const right = block.mathRight ? resolveValue(block.mathRight, inputValue, objects, graph.variables) : 0
      const result = computeMath(Number(left), Number(right), block.mathOp || "add")
      executeFromSource(block.id, result, graph, objects, updateObject, depth + 1)
      break
    }

    case "delay": {
      const ms = block.delayMs || 1000
      setTimeout(() => {
        executeFromSource(block.id, inputValue, graph, objects, updateObject, depth + 1)
      }, ms)
      break
    }

    case "set_variable": {
      if (block.variableName) {
        const val = block.variableValue
          ? resolveValue(block.variableValue, inputValue, objects, graph.variables)
          : inputValue
        graph.variables[block.variableName] = val
        executeFromSource(block.id, val, graph, objects, updateObject, depth + 1)
      }
      break
    }

    case "get_variable": {
      const val = block.variableName ? (graph.variables[block.variableName] ?? null) : null
      executeFromSource(block.id, val, graph, objects, updateObject, depth + 1)
      break
    }

    case "loop": {
      const count = block.loopCount ?? 3
      if (block.loopType === "while" && block.condition) {
        let i = 0
        while (i < count) {
          const result = evaluateCondition(block.condition, inputValue, objects, graph.variables)
          if (!result.action) break
          executeFromSource(block.id, i, graph, objects, updateObject, depth + 1)
          i++
        }
      } else {
        for (let i = 0; i < count; i++) {
          executeFromSource(block.id, i, graph, objects, updateObject, depth + 1)
        }
      }
      break
    }

    case "collision": {
      const objA = objects.find((o) => o.id === block.collisionObjectA)
      const objB = objects.find((o) => o.id === block.collisionObjectB)
      if (!objA || !objB) break
      const threshold = block.collisionThreshold || 30
      const acx = objA.x + objA.width / 2
      const acy = objA.y + objA.height / 2
      const bcx = objB.x + objB.width / 2
      const bcy = objB.y + objB.height / 2
      if (Math.abs(acx - bcx) < threshold && Math.abs(acy - bcy) < threshold) {
        // Collision! Reposition objectB randomly
        const newX = Math.floor(Math.random() * 220) + 20
        const newY = Math.floor(Math.random() * 250) + 50
        updateObject(objB.id, { x: newX, y: newY })
        // Propagate collision signal (1) through output wires
        executeFromSource(block.id, 1, graph, objects, updateObject, depth + 1)
      }
      break
    }
  }
}

/**
 * Compare two values with an operator. Returns boolean.
 */
function compareValues(left: any, right: any, op: CompareOp): boolean {
  switch (op) {
    case "==": return left == right
    case "!=": return left != right
    case ">": return Number(left) > Number(right)
    case "<": return Number(left) < Number(right)
    case ">=": return Number(left) >= Number(right)
    case "<=": return Number(left) <= Number(right)
    case "contains": return String(left).includes(String(right))
  }
}

/**
 * Compute a math operation.
 */
function computeMath(a: number, b: number, op: string): number {
  switch (op) {
    case "add": return a + b
    case "subtract": return a - b
    case "multiply": return a * b
    case "divide": return b !== 0 ? a / b : 0
    case "modulo": return b !== 0 ? a % b : 0
    case "random": return Math.floor(Math.random() * (b - a + 1)) + a
    default: return a
  }
}

/**
 * Evaluate an IF/ELSE condition with optional AND/OR compound.
 */
export function evaluateCondition(
  condition: Condition,
  inputValue: any,
  objects: LabObject[],
  variables: Record<string, any> = {}
): { action: LogicAction | null } {
  const mainResult = compareValues(
    resolveValue(condition.test.left, inputValue, objects, variables),
    resolveValue(condition.test.right, inputValue, objects, variables),
    condition.test.operator
  )

  let finalResult = mainResult

  // Compound conditions (AND/OR)
  if (condition.compound && condition.compound.extra.length > 0) {
    const extraResults = condition.compound.extra.map((c) =>
      compareValues(
        resolveValue(c.left, inputValue, objects, variables),
        resolveValue(c.right, inputValue, objects, variables),
        c.operator
      )
    )

    if (condition.compound.logic === "and") {
      finalResult = mainResult && extraResults.every(Boolean)
    } else {
      finalResult = mainResult || extraResults.some(Boolean)
    }
  }

  return {
    action: finalResult ? condition.thenAction : (condition.elseAction ?? null),
  }
}

/**
 * Resolve a ValueRef to an actual value.
 */
export function resolveValue(
  ref: ValueRef,
  inputValue: any,
  objects: LabObject[],
  variables: Record<string, any> = {}
): any {
  switch (ref.type) {
    case "input":
      return inputValue
    case "constant":
      return ref.value
    case "property": {
      const obj = objects.find((o) => o.id === ref.objectId)
      if (!obj) return null
      return (obj as any)[ref.property] ?? null
    }
    case "variable":
      return variables[ref.name] ?? null
  }
}

/**
 * Check if an object has any logic wires connected to it.
 */
export function hasLogicWires(objectId: string, graph: LogicGraph): boolean {
  return graph.wires.some((w) => w.fromNodeId === objectId)
}

/**
 * Get a human-readable summary of a logic block.
 */
export function describeCondition(condition: Condition | null, objects: LabObject[]): string {
  if (!condition) return "No condition set"

  const left = describeValue(condition.test.left, objects)
  const right = describeValue(condition.test.right, objects)
  const op = condition.test.operator

  const thenDesc = condition.thenAction
    ? `set ${condition.thenAction.property} to ${describeValue(condition.thenAction.value, objects)}`
    : "nothing"

  const elseDesc = condition.elseAction
    ? `set ${condition.elseAction.property} to ${describeValue(condition.elseAction.value, objects)}`
    : "nothing"

  let desc = `IF ${left} ${op} ${right}`

  if (condition.compound && condition.compound.extra.length > 0) {
    const logic = condition.compound.logic.toUpperCase()
    for (const c of condition.compound.extra) {
      desc += ` ${logic} ${describeValue(c.left, objects)} ${c.operator} ${describeValue(c.right, objects)}`
    }
  }

  return `${desc} THEN ${thenDesc} ELSE ${elseDesc}`
}

export function describeBlock(block: LogicBlock, objects: LabObject[]): string {
  switch (block.blockType) {
    case "if_else": return describeCondition(block.condition, objects)
    case "compare": return block.condition ? `${describeValue(block.condition.test.left, objects)} ${block.condition.test.operator} ${describeValue(block.condition.test.right, objects)}` : "No comparison set"
    case "math": return `${block.mathLeft ? describeValue(block.mathLeft, objects) : "input"} ${block.mathOp || "add"} ${block.mathRight ? describeValue(block.mathRight, objects) : "?"}`
    case "delay": return `Wait ${block.delayMs || 1000}ms`
    case "set_variable": return `Set $${block.variableName || "?"} = ${block.variableValue ? describeValue(block.variableValue, objects) : "input"}`
    case "get_variable": return `Get $${block.variableName || "?"}`
    case "loop": return `${block.loopType === "while" ? "While" : "Repeat"} ${block.loopCount || 3}x`
    default: return "Unknown block"
  }
}

function describeValue(ref: ValueRef, objects: LabObject[]): string {
  switch (ref.type) {
    case "input": return "input"
    case "constant": return String(ref.value)
    case "property": {
      const obj = objects.find((o) => o.id === ref.objectId)
      return `${obj?.label || "?"}.${ref.property}`
    }
    case "variable": return `$${ref.name}`
  }
}
