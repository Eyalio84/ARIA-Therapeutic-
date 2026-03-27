"use client"

import { NaiSearchPanel } from "./NaiSearchPanel"
import { PersonaVisualizer } from "./PersonaVisualizer"
import { IntrospectionTester } from "./IntrospectionTester"
import { KgExplorer } from "./KgExplorer"

export function SdkDashboard() {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Top row: 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <NaiSearchPanel />
          <IntrospectionTester />
        </div>
        <PersonaVisualizer />
      </div>

      {/* KG Explorer: full width */}
      <KgExplorer />
    </div>
  )
}
