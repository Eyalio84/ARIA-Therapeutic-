"use client"

import { create } from "zustand"

export type TabId = "sdk" | "store" | "roadmap"

interface TabStore {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
}

export const useTabStore = create<TabStore>((set) => ({
  activeTab: "sdk",
  setActiveTab: (tab) => set({ activeTab: tab }),
}))
