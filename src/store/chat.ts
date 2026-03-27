"use client"

import { create } from "zustand"

export type MessageRole = "user" | "aria" | "system"

export interface ChatMessage {
  id: string
  role: MessageRole
  text: string
  timestamp: Date
}

export type AriaStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking"

interface ChatStore {
  messages: ChatMessage[]
  status: AriaStatus
  isConnected: boolean
  activeContext: string
  activeVoice: string
  isMicActive: boolean

  addMessage: (role: MessageRole, text: string) => void
  addSystemMessage: (text: string) => void
  clearMessages: () => void
  setStatus: (status: AriaStatus) => void
  setConnected: (v: boolean) => void
  setActiveContext: (id: string) => void
  setActiveVoice: (voice: string) => void
  setMicActive: (v: boolean) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  status: "idle",
  isConnected: false,
  activeContext: "personal",
  activeVoice: "Aoede",
  isMicActive: false,

  addMessage: (role, text) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: crypto.randomUUID(), role, text, timestamp: new Date() },
      ],
    })),

  addSystemMessage: (text) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: crypto.randomUUID(), role: "system", text, timestamp: new Date() },
      ],
    })),

  clearMessages: () => set({ messages: [] }),
  setStatus:        (status)        => set({ status }),
  setConnected:     (isConnected)   => set({ isConnected }),
  setActiveContext: (activeContext) => set({ activeContext }),
  setActiveVoice:   (activeVoice)   => set({ activeVoice }),
  setMicActive:     (isMicActive)   => set({ isMicActive }),
}))
