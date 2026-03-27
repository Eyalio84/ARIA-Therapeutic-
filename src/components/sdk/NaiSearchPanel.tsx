"use client"

import { useState } from "react"
import { useSdkStore } from "@/store/sdk"

const INTENT_COLORS: Record<string, string> = {
  exact_match: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  goal_based: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  exploratory: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  comparison: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  debugging: "bg-red-500/20 text-red-300 border-red-500/30",
  workflow: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  capability_check: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  semantic: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
}

const TYPE_COLORS: Record<string, string> = {
  product: "bg-gold/20 text-gold border-gold/30",
  material: "bg-blue-400/20 text-blue-300 border-blue-400/30",
  category: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
  gift_occasion: "bg-red-400/20 text-red-300 border-red-400/30",
  care_instruction: "bg-purple-400/20 text-purple-300 border-purple-400/30",
  brand_value: "bg-yellow-400/20 text-yellow-300 border-yellow-400/30",
  brand_identity: "bg-zinc-400/20 text-zinc-300 border-zinc-400/30",
}

export function NaiSearchPanel() {
  const [query, setQuery] = useState("")
  const { naiResults, naiIntent, naiMethods, naiWeights, naiTotal, isSearching, searchNai } = useSdkStore()

  const handleSearch = () => {
    if (query.trim()) searchNai(query.trim())
  }

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <h3 className="text-xs font-semibold tracking-widest uppercase text-gold">NAI Search</h3>

      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search the jewelry KG..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-gold text-black text-xs font-semibold rounded-lg hover:bg-gold-light transition disabled:opacity-50"
        >
          {isSearching ? "..." : "Search"}
        </button>
      </div>

      {/* Intent + Methods */}
      {naiIntent && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${INTENT_COLORS[naiIntent] ?? "bg-white/10 text-white/60 border-white/20"}`}>
            {naiIntent}
          </span>
          {naiMethods.map((m) => (
            <span key={m} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">
              {m}
            </span>
          ))}
          {naiWeights && (
            <span className="text-[10px] text-white/30">
              α={naiWeights.alpha} β={naiWeights.beta} γ={naiWeights.gamma} δ={naiWeights.delta}
            </span>
          )}
          <span className="text-[10px] text-white/20 ml-auto">{naiTotal} total</span>
        </div>
      )}

      {/* Results */}
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {naiResults.map((r) => (
          <div key={r.id} className="bg-white/3 rounded-lg p-2.5 border border-white/5 hover:border-gold/20 transition">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">{r.name}</span>
                  {r.node_type && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${TYPE_COLORS[r.node_type] ?? "bg-white/10 text-white/50 border-white/10"}`}>
                      {r.node_type}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{r.description}</p>
                {r.price != null && (
                  <span className="text-xs text-gold mt-0.5">${r.price} {r.stock != null && `· ${r.stock} in stock`}</span>
                )}
              </div>
              <span className="text-xs font-mono text-gold/80 flex-shrink-0">{r.score.toFixed(3)}</span>
            </div>
            {/* Decomposition bars */}
            {r.decomposition && (
              <div className="flex gap-1 mt-2">
                {(["emb", "text", "graph", "intent"] as const).map((key) => {
                  const val = r.decomposition![key]
                  const colors = { emb: "bg-violet-500", text: "bg-blue-500", graph: "bg-emerald-500", intent: "bg-amber-500" }
                  return (
                    <div key={key} className="flex-1">
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[key]} gauge-bar rounded-full`} style={{ width: `${val * 100}%` }} />
                      </div>
                      <span className="text-[8px] text-white/20 block text-center mt-0.5">{key[0]}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
