"use client"

import { useCallback, useEffect, useRef, type ReactNode } from "react"

interface Props {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * Game Drawer — slides from left, 80% width, dimmed backdrop.
 * Triggered by left-edge handle tab + top-bar button.
 * Journal/field-notebook aesthetic.
 */
export default function GameDrawer({ isOpen, onClose, children }: Props) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const currentX = useRef(0)
  const isDragging = useRef(false)

  // Close on swipe left
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    isDragging.current = true
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !drawerRef.current) return
    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current
    if (diff < 0) {
      drawerRef.current.style.transform = `translateX(${diff}px)`
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current || !drawerRef.current) return
    isDragging.current = false
    const diff = currentX.current - startX.current
    drawerRef.current.style.transform = ""
    if (diff < -60) onClose()
  }, [onClose])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && isOpen) onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  return (
    <>
      {/* Left-edge handle tab — always visible on game screen */}
      {!isOpen && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-[50] w-4 h-20 flex items-center justify-center cursor-pointer group"
          onClick={() => { /* parent handles open */ }}
          style={{ display: "none" }} // handled by parent's onDrawerOpen
        >
        </div>
      )}

      {/* Dimmed backdrop — only covers area RIGHT of the drawer */}
      <div
        className={`fixed top-0 bottom-0 right-0 z-[140] transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(0,0,0,0.65)", left: "80%", maxWidth: "calc(100% - 380px)" }}
        onClick={onClose}
      />
      {/* Full-screen dim overlay (visual only, no click) */}
      <div
        className={`fixed inset-0 z-[139] transition-opacity duration-300 pointer-events-none ${isOpen ? "opacity-100" : "opacity-0"}`}
        style={{ background: "rgba(0,0,0,0.4)" }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`fixed left-0 top-0 bottom-0 z-[141] w-[80%] max-w-[380px] flex flex-col transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          background: "linear-gradient(180deg, var(--bg-deep, #0a0a0f) 0%, var(--bg-mid, #12121a) 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          transitionTimingFunction: "cubic-bezier(0.32, 0, 0.15, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">📖</span>
            <span className="font-serif text-base text-[var(--gold,#c9a84c)] tracking-wide">Journal</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-[var(--text-dim,#5a5854)] hover:text-[var(--gold,#c9a84c)] hover:border-[var(--gold-dim,#8a7235)] transition-colors text-sm"
          >
            x
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {children}
        </div>

        {/* Decorative footer — journal binding */}
        <div className="shrink-0 h-1 bg-gradient-to-r from-transparent via-[var(--gold-dim,#8a7235)]/20 to-transparent" />
      </div>
    </>
  )
}
