/**
 * Pure state transition logic for Aria sessions.
 *
 * Extracted from store/aria.ts — no Zustand dependency.
 */

import type { AriaStatus } from "../types/state"
import { ARIA_TRANSITIONS } from "../types/state"

/** Check if a state transition is valid */
export function canTransition(from: AriaStatus, to: AriaStatus): boolean {
  return ARIA_TRANSITIONS[from]?.includes(to) ?? false
}

/** Attempt a state transition. Returns new state if valid, current state if invalid. */
export function transition(current: AriaStatus, target: AriaStatus): AriaStatus {
  if (canTransition(current, target)) return target
  // Always allow transitioning to idle (disconnect/error recovery)
  if (target === "idle") return "idle"
  return current
}

/** Get all valid next states from current state */
export function validNextStates(current: AriaStatus): AriaStatus[] {
  return ARIA_TRANSITIONS[current] ?? []
}

/** Check if Aria is in an active session (not idle) */
export function isActive(status: AriaStatus): boolean {
  return status !== "idle"
}

/** Check if Aria is ready to receive audio input */
export function isListening(status: AriaStatus): boolean {
  return status === "listening"
}
