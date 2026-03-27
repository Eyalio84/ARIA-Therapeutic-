/**
 * Aria V2.0 Jewelry command barrel.
 *
 * Registers shopping + navigation handlers into the CommandRegistry.
 */

import type { CommandRegistry } from "@/lib/aria-core/commands/commandRegistry"
import { navigationHandlers } from "./handlers/navigation"
import { shoppingHandlers } from "./handlers/shopping"

export const jewelryHandlers = [
  ...navigationHandlers,
  ...shoppingHandlers,
]

export function registerJewelryCommands(registry: CommandRegistry): void {
  registry.registerAll(jewelryHandlers)
}

export { jewelryContext, BACKEND_URL } from "./contexts"
