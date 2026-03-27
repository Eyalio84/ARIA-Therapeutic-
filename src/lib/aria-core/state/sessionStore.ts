"use client"

/**
 * Provider-agnostic Aria session store.
 *
 * Contains only fields that belong to aria-core:
 *   - status, isConnected (connection lifecycle)
 *   - transcripts (conversation log)
 *   - currentContext, currentPage (routing context)
 *
 * StoreKit-specific fields (editorMode, draftContent, ariaContext string,
 * activeThemeId) live in the host app's store/aria.ts.
 */

import { create } from "zustand"
import { transition } from "./ariaStateMachine"
import type { AriaStatus, AriaSessionState } from "../types/state"

interface SessionStore extends AriaSessionState {
  setStatus:         (s: AriaStatus) => void
  setConnected:      (v: boolean) => void
  setUserTranscript: (t: string) => void
  setAriaTranscript: (t: string) => void
  setCurrentContext: (ctx: string) => void
  setCurrentPage:    (p: string) => void
  reset:             () => void
}

const INITIAL: AriaSessionState = {
  status: "idle",
  isConnected: false,
  userTranscript: "",
  ariaTranscript: "",
  currentContext: "template",
  currentPage: "/",
}

export const useAriaSession = create<SessionStore>((set, get) => ({
  ...INITIAL,

  setStatus: (status) =>
    set((s) => ({ status: transition(s.status, status) })),

  setConnected: (isConnected) => set({ isConnected }),
  setUserTranscript: (userTranscript) => set({ userTranscript }),
  setAriaTranscript: (ariaTranscript) => set({ ariaTranscript }),
  setCurrentContext: (currentContext) => set({ currentContext }),
  setCurrentPage: (currentPage) => set({ currentPage }),

  reset: () => set(INITIAL),
}))
