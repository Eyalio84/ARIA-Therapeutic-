/**
 * Game Dev Logger — singleton instances for the game engine.
 *
 * Sources:
 *   voice    — WebSocket events, connect/disconnect, audio stats
 *   game     — game state mutations, screen changes, config loads
 *   function — voice command execution (audit trail)
 *   theme    — theme switches, mood color changes
 *   api      — API call results, errors
 *   system   — DevHub meta-events, lifecycle
 */

import { RingBufferLogger } from "./aria-core/devhub/logger"
import { CommandAuditTrail } from "./aria-core/devhub/auditTrail"

export const devLogger = new RingBufferLogger()
export const commandAudit = new CommandAuditTrail()

/** Source color map for DevHub tab rendering */
export const SOURCE_COLORS: Record<string, string> = {
  voice: "#e07acc",     // pink
  game: "#4ae0c8",      // teal
  function: "#c49ef0",  // purple
  theme: "#e0c07a",     // amber
  api: "#7ab8e0",       // blue
  system: "#7a7a7a",    // gray
}
