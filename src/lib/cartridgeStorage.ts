"use client"

/**
 * cartridgeStorage — localStorage cache for the active .aria.json cartridge.
 *
 * The browser cannot read ~/.aria/personas/ directly, so users drag a .aria.json
 * file into PersonaLoader. The validated cartridge is cached here and survives
 * page refresh. Falls back to null (→ hardcoded personalPersona) if absent.
 */

import type { AriaPersonaJSON } from "./aria-core/persona/cartridgeTypes"
import { validateCartridge } from "./aria-core/persona/cartridgeLoader"
import { personaFromCartridge } from "./aria-core/persona/cartridgeLoader"
import type { PersonaConfig } from "./aria-core/types/persona"

const STORAGE_KEY = "aria:active-cartridge"

/** Persist a validated cartridge to localStorage. */
export function saveCartridge(json: AriaPersonaJSON): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(json))
}

/**
 * Load the cached cartridge from localStorage.
 * Returns null if absent, unreadable, or fails validation.
 * Never throws.
 */
export function loadCartridge(): AriaPersonaJSON | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return validateCartridge(JSON.parse(raw))
  } catch {
    return null
  }
}

/** Remove the cached cartridge. Next load will use the default hardcoded persona. */
export function clearCartridge(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Load the cached cartridge and convert it to a runtime PersonaConfig.
 * Returns null if no cartridge is cached.
 */
export function cartridgeToPersona(json: AriaPersonaJSON): PersonaConfig {
  return personaFromCartridge(json)
}
