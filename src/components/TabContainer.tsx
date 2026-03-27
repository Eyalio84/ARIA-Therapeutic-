"use client"

import { Suspense, lazy } from "react"
import { useTabStore } from "@/store/tab"

const SdkDashboard = lazy(() => import("@/components/sdk/SdkDashboard").then(m => ({ default: m.SdkDashboard })))
const StorePage = lazy(() => import("@/components/store/StorePage").then(m => ({ default: m.StorePage })))
const RoadmapPage = lazy(() => import("@/components/roadmap/RoadmapPage").then(m => ({ default: m.RoadmapPage })))

function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  )
}

export function TabContainer() {
  const activeTab = useTabStore((s) => s.activeTab)

  return (
    <div className="flex-1 overflow-hidden">
      <Suspense fallback={<LoadingSpinner />}>
        {activeTab === "sdk" && <SdkDashboard />}
        {activeTab === "store" && <StorePage />}
        {activeTab === "roadmap" && <RoadmapPage />}
      </Suspense>
    </div>
  )
}
