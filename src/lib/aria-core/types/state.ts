/**
 * State machine contracts — Aria session lifecycle.
 */

/** The 5 states of an Aria session */
export type AriaStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking"

/** Valid state transitions */
export const ARIA_TRANSITIONS: Record<AriaStatus, AriaStatus[]> = {
  idle:        ["connecting"],
  connecting:  ["listening", "idle"],  // idle on error
  listening:   ["thinking", "speaking", "idle"],
  thinking:    ["speaking", "listening", "idle"],
  speaking:    ["listening", "idle"],
}

/** Full session state (provider-agnostic) */
export interface AriaSessionState {
  status: AriaStatus
  isConnected: boolean
  userTranscript: string
  ariaTranscript: string
  currentContext: string
  currentPage: string
}
