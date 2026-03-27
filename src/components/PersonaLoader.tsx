"use client"

/**
 * PersonaLoader — drag-drop zone for .aria.json persona cartridges.
 *
 * Rendered inside ConfigDrawer under the "Persona" section.
 * Drop a .aria.json file → validate → save to localStorage → notify parent.
 */

import { useState, useRef } from "react"
import type { AriaPersonaJSON } from "@/lib/aria-core/persona/cartridgeTypes"
import { validateCartridge } from "@/lib/aria-core/persona/cartridgeLoader"
import { saveCartridge, clearCartridge, loadCartridge } from "@/lib/cartridgeStorage"

interface PersonaLoaderProps {
  onPersonaLoaded: (json: AriaPersonaJSON) => void
  onPersonaCleared: () => void
}

export function PersonaLoader({ onPersonaLoaded, onPersonaCleared }: PersonaLoaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const active = loadCartridge()

  function handleFile(file: File) {
    setError(null)
    setSuccess(null)

    if (!file.name.endsWith(".json")) {
      setError("File must be a .json file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        const cartridge = validateCartridge(json)
        saveCartridge(cartridge)
        setSuccess(`Loaded: ${cartridge.name} (${cartridge.identity.voice})`)
        onPersonaLoaded(cartridge)
      } catch (err) {
        // Show only the first Zod issue for readability
        const msg = err instanceof Error ? err.message : "Invalid cartridge"
        const firstLine = msg.split("\n")[0]
        setError(firstLine)
      }
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleClear() {
    clearCartridge()
    setSuccess(null)
    setError(null)
    onPersonaCleared()
  }

  return (
    <div className="space-y-2">
      {/* Active persona display */}
      {active && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <div>
            <p className="text-xs font-medium text-violet-300">{active.name}</p>
            <p className="text-[10px] text-zinc-500">{active.identity.voice} · {active.rules.tone}</p>
          </div>
          <button
            onClick={handleClear}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            reset
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-1.5 px-4 py-5 rounded-xl border border-dashed cursor-pointer transition-colors ${
          isDragging
            ? "border-violet-400/60 bg-violet-500/10"
            : "border-white/10 hover:border-white/20 hover:bg-white/4"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-zinc-500">
          <path d="M9 2v10M5 6l4-4 4 4M3 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className="text-xs text-zinc-400">
          {isDragging ? "Drop to load" : "Drop .aria.json or click to browse"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ""
          }}
        />
      </div>

      {/* Feedback */}
      {success && (
        <p className="text-[10px] text-emerald-400 px-1">{success}</p>
      )}
      {error && (
        <p className="text-[10px] text-red-400 px-1">{error}</p>
      )}
    </div>
  )
}
