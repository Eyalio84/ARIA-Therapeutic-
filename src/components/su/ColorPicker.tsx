"use client"

import { useCallback } from "react"

const PRESETS = [
  { hue: 0, label: "Red" },
  { hue: 30, label: "Orange" },
  { hue: 50, label: "Yellow" },
  { hue: 120, label: "Green" },
  { hue: 170, label: "Teal" },
  { hue: 220, label: "Blue" },
  { hue: 270, label: "Purple" },
  { hue: 330, label: "Pink" },
]

interface ColorPickerProps {
  hue: number
  onChange: (hue: number) => void
}

export function ColorPicker({ hue, onChange }: ColorPickerProps) {
  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value))
  }, [onChange])

  const color = `hsl(${hue},70%,60%)`

  return (
    <div className="space-y-2">
      {/* Current color preview + hue value */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg border border-white/10" style={{ background: color }} />
        <span className="text-[11px] font-mono text-white/50">{hue}°</span>
        <span className="text-[10px] text-white/30">{color}</span>
      </div>

      {/* Hue slider — rainbow gradient */}
      <div className="relative">
        <div className="h-6 rounded-lg overflow-hidden"
          style={{
            background: "linear-gradient(to right, hsl(0,70%,60%), hsl(30,70%,60%), hsl(60,70%,60%), hsl(90,70%,60%), hsl(120,70%,60%), hsl(150,70%,60%), hsl(180,70%,60%), hsl(210,70%,60%), hsl(240,70%,60%), hsl(270,70%,60%), hsl(300,70%,60%), hsl(330,70%,60%), hsl(360,70%,60%))",
          }}>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={handleSlider}
            className="w-full h-full opacity-0 cursor-pointer"
            style={{ position: "relative", zIndex: 1 }}
          />
        </div>
        {/* Thumb indicator */}
        <div className="absolute top-0 h-6 w-1 rounded-full pointer-events-none"
          style={{
            left: `${(hue / 360) * 100}%`,
            background: "#fff",
            boxShadow: "0 0 6px rgba(0,0,0,0.5)",
            transform: "translateX(-50%)",
          }} />
      </div>

      {/* Preset swatches */}
      <div className="flex gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.hue}
            onClick={() => onChange(p.hue)}
            className="w-7 h-7 rounded-full transition-all hover:scale-110"
            style={{
              background: `hsl(${p.hue},70%,60%)`,
              border: Math.abs(hue - p.hue) < 15 ? "2px solid #fff" : "2px solid transparent",
              boxShadow: Math.abs(hue - p.hue) < 15 ? `0 0 8px hsl(${p.hue},70%,60%)` : "none",
            }}
            title={p.label}
          />
        ))}
      </div>
    </div>
  )
}
