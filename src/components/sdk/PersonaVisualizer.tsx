"use client"

import { useSdkStore } from "@/store/sdk"

const STAGES = ["greeting", "discovery", "exploration", "consideration", "decision"]

function GaugeBar({ label, value, color, children }: { label: string; value: number; color: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-white/50">{label}</span>
        <span className="text-xs font-mono text-white/40">{value.toFixed(2)}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} gauge-bar rounded-full transition-all`} style={{ width: `${Math.min(value, 1) * 100}%` }} />
      </div>
      {children && <div className="text-xs text-white/50">{children}</div>}
    </div>
  )
}

function MiniGauge({ label, value }: { label: string; value: number }) {
  const color = value >= 0.7 ? "text-emerald-400" : value >= 0.4 ? "text-amber-400" : "text-red-400"
  return (
    <div className="text-center">
      <div className={`text-lg font-mono font-bold ${color}`}>{value.toFixed(2)}</div>
      <div className="text-[9px] uppercase tracking-wider text-white/30">{label}</div>
    </div>
  )
}

export function PersonaVisualizer() {
  const personaState = useSdkStore((s) => s.personaState)

  if (!personaState) {
    return (
      <div className="glass rounded-xl p-4">
        <h3 className="text-xs font-semibold tracking-widest uppercase text-gold mb-3">4D Persona State</h3>
        <p className="text-xs text-white/30 text-center py-8">Run a search to compute persona state</p>
      </div>
    )
  }

  const { x, y, z, t, derived } = personaState
  const currentStage = (t.momentum as Record<string, string>)?.stage ?? "greeting"

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <h3 className="text-xs font-semibold tracking-widest uppercase text-gold">4D Persona State</h3>

      {/* X: Emotional */}
      <GaugeBar label="X · Emotional" value={x.value} color="bg-violet-500">
        <span className="text-violet-300 font-medium">{x.mood}</span>
        <span className="text-white/30"> · {x.reason}</span>
      </GaugeBar>

      {/* Y: Relational */}
      <GaugeBar label="Y · Relational" value={y.intensity} color="bg-blue-500">
        {y.activated ? (
          <span><span className="text-blue-300">● {y.target}</span> <span className="text-white/30">({y.relation_type})</span></span>
        ) : (
          <span className="text-white/20">No entity activated</span>
        )}
      </GaugeBar>

      {/* Z: Linguistic */}
      <GaugeBar label="Z · Linguistic" value={z.distinctiveness} color="bg-emerald-500">
        <span className="text-emerald-300">{z.dialect}</span>
        <span className="text-white/20 ml-1">🔒 immutable</span>
      </GaugeBar>

      {/* T: Temporal */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-white/50">T · Temporal</span>
          <span className="text-xs font-mono text-white/40">Step {t.step}</span>
        </div>
        {/* Journey stage dots */}
        <div className="flex items-center gap-1">
          {STAGES.map((stage) => (
            <div key={stage} className="flex items-center gap-1 flex-1">
              <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                stage === currentStage ? "bg-amber-400 ring-2 ring-amber-400/30" :
                STAGES.indexOf(stage) < STAGES.indexOf(currentStage) ? "bg-amber-400/40" : "bg-white/10"
              }`} />
              <span className={`text-[8px] ${stage === currentStage ? "text-amber-300" : "text-white/20"} hidden sm:inline`}>
                {stage}
              </span>
            </div>
          ))}
        </div>
        {/* Memory */}
        {t.memory.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {t.memory.map((m, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-white/30 border border-white/5">{m}</span>
            ))}
          </div>
        )}
      </div>

      {/* Derived metrics */}
      <div className="flex justify-around pt-2 border-t border-white/5">
        <MiniGauge label="Intensity" value={derived.intensity} />
        <MiniGauge label="Stability" value={derived.stability} />
        <MiniGauge label="Authenticity" value={derived.authenticity} />
      </div>
    </div>
  )
}
