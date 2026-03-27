"use client"

import { useState } from "react"

const API = process.env.NEXT_PUBLIC_GAME_API || ""

// Loaded from backend data at build time or fetched — for now inline the scale metadata
const SCALES = [
  { id: "phq9", name: "PHQ-9", measures: "Depression", items: 9, range: "0-27", loinc: "44249-1" },
  { id: "gad7", name: "GAD-7", measures: "Anxiety", items: 7, range: "0-21", loinc: "69737-5" },
  { id: "pcl5", name: "PCL-5", measures: "PTSD", items: 20, range: "0-80", loinc: null },
  { id: "dass21", name: "DASS-21", measures: "Depression + Anxiety + Stress", items: 21, range: "3 subscales", loinc: null },
  { id: "who5", name: "WHO-5", measures: "Well-being", items: 5, range: "0-100%", loinc: null },
  { id: "cssrs", name: "C-SSRS Screen", measures: "Suicide risk", items: 6, range: "Yes/No", loinc: null },
]

export function AssessmentsTab() {
  const [selectedScale, setSelectedScale] = useState<string | null>(null)
  const [scaleData, setScaleData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const loadScale = async (scaleId: string) => {
    setSelectedScale(scaleId)
    setLoading(true)
    try {
      // Fetch the scale data from the psychology JSON
      const res = await fetch(`${API}/api/dashboard/health`)
      // For now, we show the scale info statically
      // Future: fetch from a /api/assessments/{scaleId} endpoint
      setScaleData(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <section>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">
          Available Clinical Scales
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          All scales are public domain or free for clinical use. Items, scoring thresholds, and severity
          interpretations are stored in <code className="text-zinc-400">data/psychology/assessment_scales.json</code>.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {SCALES.map((scale) => (
            <div key={scale.id}
              className="glass rounded-xl p-4 cursor-pointer hover:bg-white/[0.06] transition"
              onClick={() => loadScale(scale.id)}
              style={{
                border: selectedScale === scale.id
                  ? "1px solid rgba(201,169,110,0.3)"
                  : "1px solid rgba(255,255,255,0.08)"
              }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-zinc-200">{scale.name}</h4>
                {scale.loinc && (
                  <span className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>
                    LOINC {scale.loinc}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Measures: {scale.measures}</p>
              <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                <span>{scale.items} items</span>
                <span>Range: {scale.range}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scale details (future: full item display + scoring) */}
      <section>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Integration Status</h3>
        <div className="glass rounded-xl p-4">
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Mood Check-In (Simple Mood 1-5)</span>
              <span className="text-green-400">Active in game</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">PHQ-9 + GAD-7</span>
              <span className="text-yellow-400">Ready for intake flow</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">PCL-5</span>
              <span className="text-yellow-400">Ready for PTSD cartridges</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">C-SSRS Screening Logic</span>
              <span className="text-green-400">Active in safety system</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">DASS-21 + WHO-5</span>
              <span className="text-zinc-500">Available for future use</span>
            </div>
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Connected Data Sources</h3>
        <div className="glass rounded-xl p-4">
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">ICD-11 (WHO)</span>
              <span className="text-green-400">156 disorders imported</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">LOINC</span>
              <span className="text-green-400">2 scales mapped</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Psychology JSON</span>
              <span className="text-green-400">11 files / 207.8 KB</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
