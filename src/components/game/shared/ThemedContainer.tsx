"use client"

import { useMemo } from "react"
import { useGameThemeStore } from "@/store/gameTheme"
import type { CSSProperties, ReactNode } from "react"

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/** Wraps children with CSS custom properties from the theme store. */
export default function ThemedContainer({ children, className, style }: Props) {
  const preset = useGameThemeStore((s) => s.preset)
  const moodPrimary = useGameThemeStore((s) => s.moodPrimary)
  const moodSecondary = useGameThemeStore((s) => s.moodSecondary)

  const cssVars = useMemo(() => ({
    "--bg-deep": preset.bgDeep,
    "--bg-mid": preset.bgMid,
    "--bg-surface": preset.bgSurface,
    "--bg-elevated": preset.bgElevated,
    "--gold": preset.gold,
    "--gold-light": preset.goldLight,
    "--gold-dim": preset.goldDim,
    "--teal": preset.teal,
    "--rose": preset.rose,
    "--mood-primary": moodPrimary,
    "--mood-secondary": moodSecondary,
  }), [preset, moodPrimary, moodSecondary])

  return (
    <div className={className} style={{ ...cssVars, ...style } as CSSProperties}>
      {children}
    </div>
  )
}
