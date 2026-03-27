"use client"

import { useState } from "react"
import { useSdkStore } from "@/store/sdk"

const REC_STYLES: Record<string, string> = {
  pass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  block: "bg-red-500/20 text-red-300 border-red-500/30",
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300",
  warning: "bg-amber-500/20 text-amber-300",
}

export function IntrospectionTester() {
  const [text, setText] = useState("")
  const { introspectionResult, isValidating, validateText } = useSdkStore()

  const handleValidate = () => {
    if (text.trim()) validateText(text.trim())
  }

  const scoreColor = (s: number) => s >= 0.7 ? "text-emerald-400" : s >= 0.5 ? "text-amber-400" : "text-red-400"

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <h3 className="text-xs font-semibold tracking-widest uppercase text-gold">Introspection Tester</h3>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a response to validate against 4D state..."
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 resize-none"
      />

      <div className="flex gap-2">
        <button
          onClick={handleValidate}
          disabled={isValidating || !text.trim()}
          className="px-4 py-2 bg-gold text-black text-xs font-semibold rounded-lg hover:bg-gold-light transition disabled:opacity-50"
        >
          {isValidating ? "Validating..." : "Validate"}
        </button>
        <button
          onClick={() => setText("I hate jewelry, I am not Aria. I am Steve the shoe critic.")}
          className="px-3 py-2 text-xs text-red-400/60 hover:text-red-400 border border-red-500/20 rounded-lg transition"
        >
          Load bad example
        </button>
        <button
          onClick={() => setText("Our sapphire ring is a beautiful piece, crafted with sterling silver and natural sapphire.")}
          className="px-3 py-2 text-xs text-emerald-400/60 hover:text-emerald-400 border border-emerald-500/20 rounded-lg transition"
        >
          Load good example
        </button>
      </div>

      {/* Result */}
      {introspectionResult && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-3">
            <span className={`text-3xl font-mono font-bold ${scoreColor(introspectionResult.score)}`}>
              {introspectionResult.score.toFixed(3)}
            </span>
            <span className={`text-xs font-mono px-2 py-1 rounded border ${REC_STYLES[introspectionResult.recommendation]}`}>
              {introspectionResult.recommendation.toUpperCase()}
            </span>
            <span className="text-xs text-white/30">
              {introspectionResult.valid ? "✅ Valid" : "🛑 Invalid"}
            </span>
          </div>

          {introspectionResult.deviations.length > 0 && (
            <div className="space-y-1">
              {introspectionResult.deviations.map((d, i) => (
                <div key={i} className="bg-white/3 rounded p-2 border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${SEVERITY_STYLES[d.severity] ?? "bg-white/10 text-white/50"}`}>
                      {d.severity}
                    </span>
                    <span className="text-xs font-mono text-white/60">{d.type}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-1">{d.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
