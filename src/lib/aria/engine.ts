/**
 * AriaEngine — domain-agnostic voice AI engine.
 *
 * Connects a PersonaConfig to the AriaCore voice pipeline.
 * The engine doesn't know about games, therapy, or any specific domain.
 * It just runs whatever persona is loaded: connects, streams audio,
 * routes function calls, manages state.
 *
 * Usage:
 *   const engine = new AriaEngine()
 *   engine.loadPersona(myPersona)
 *   await engine.connect(apiKey)
 *   engine.disconnect()
 */

import { GeminiLiveProvider } from "../aria-core/providers/geminiLive"
import { MicCapture } from "../aria-core/audio/micCapture"
import { PlaybackScheduler } from "../aria-core/audio/playbackScheduler"
import { devLogger, commandAudit } from "../gameDevLogger"
import type { PersonaConfig } from "./persona"
import type { FunctionCall, ProviderEvent } from "../aria-core/types/provider"

export type AriaEngineStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking"

export interface AriaEngineCallbacks {
  onStatusChange: (status: AriaEngineStatus) => void
  onUserTranscript: (text: string, meta?: Record<string, unknown>) => void
  onAriaTranscript: (text: string, meta?: Record<string, unknown>) => void
  onFunctionCallStart: (name: string, args: Record<string, unknown>) => void
  onNarrative?: (text: string) => void
  onError?: (message: string) => void
}

export class AriaEngine {
  private _provider: GeminiLiveProvider | null = null
  private _mic: MicCapture | null = null
  private _scheduler: PlaybackScheduler | null = null
  private _unsubscribe: (() => void) | null = null
  private _activePersona: PersonaConfig | null = null
  private _callbacks: AriaEngineCallbacks | null = null
  private _status: AriaEngineStatus = "idle"
  private _apiKey: string | null = null

  get activePersona(): PersonaConfig | null { return this._activePersona }
  get status(): AriaEngineStatus { return this._status }
  get isConnected(): boolean { return this._provider?.isConnected ?? false }

  /** Set callbacks for engine events */
  setCallbacks(cbs: AriaEngineCallbacks): void {
    this._callbacks = cbs
  }

  /** Load a persona — if connected, disconnects and reconnects with new config */
  async loadPersona(persona: PersonaConfig, apiKey?: string): Promise<void> {
    const wasConnected = this.isConnected
    const key = apiKey || this._apiKey

    this._activePersona = persona
    devLogger.log("voice", "info", "engine", `Persona loaded: ${persona.id} (${persona.name})`)

    if (wasConnected && key) {
      this.disconnect()
      await this.connect(key)
    }
  }

  /** Connect to Gemini Live with the active persona */
  async connect(apiKey: string): Promise<void> {
    if (!this._activePersona) {
      devLogger.log("voice", "error", "engine", "No persona loaded")
      return
    }

    this._apiKey = apiKey
    this._setStatus("connecting")

    // Create provider
    this._provider = new GeminiLiveProvider({ apiKey })

    // Subscribe to events
    this._subscribe()

    // Init playback
    this._scheduler?.destroy()
    this._scheduler = new PlaybackScheduler({
      onSpeakingStart: () => this._setStatus("speaking"),
      onSpeakingEnd: () => this._setStatus("listening"),
    })
    await this._scheduler.init(24000)

    // Build system prompt
    const persona = this._activePersona
    const systemPrompt = typeof persona.systemPrompt === "function"
      ? persona.systemPrompt()
      : persona.systemPrompt

    // Connect
    try {
      await this._provider.connect({
        apiKey,
        systemPrompt,
        functions: persona.functions,
        voice: persona.voice,
      })
    } catch (e) {
      this._setStatus("idle")
      devLogger.log("voice", "error", "engine", `Connect failed: ${e}`)
      return
    }

    // Start mic
    this._mic = new MicCapture()
    await this._mic.start(
      { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      (base64Pcm) => this._provider?.sendAudio(base64Pcm),
    )
  }

  /** Disconnect everything */
  disconnect(): void {
    this._mic?.stop()
    this._mic = null
    this._scheduler?.destroy()
    this._scheduler = null
    this._unsubscribe?.()
    this._unsubscribe = null
    this._provider?.disconnect()
    this._provider = null
    this._setStatus("idle")
  }

  /** Send silent context update (no response expected) */
  sendContext(text: string): void {
    if (!this._provider?.isConnected) return
    this._provider.sendText(text)
  }

  /** Send text as user message */
  sendText(text: string): void {
    if (!this._provider?.isConnected) return
    this._provider.sendText(text)
  }

  // ── Private ──

  private _setStatus(status: AriaEngineStatus): void {
    this._status = status
    this._callbacks?.onStatusChange(status)
  }

  private _subscribe(): void {
    this._unsubscribe?.()
    if (!this._provider) return

    const persona = this._activePersona
    this._unsubscribe = this._provider.onEvent((event: ProviderEvent) => {
      switch (event.type) {
        case "ready":
          this._setStatus("listening")
          devLogger.log("voice", "info", "engine", `Connected (${persona?.id || "unknown"})`)
          break

        case "audio":
          if (this._status !== "speaking") this._setStatus("speaking")
          this._scheduler?.scheduleChunk(event.data)
          break

        case "text":
          this._callbacks?.onAriaTranscript(event.text, { persona: persona?.id })
          break

        case "inputTranscription":
          this._callbacks?.onUserTranscript(event.text, { persona: persona?.id })
          if (this._status !== "thinking") this._setStatus("thinking")
          break

        case "toolCall":
          this._setStatus("thinking")
          devLogger.log("voice", "info", "toolCall",
            `Functions: ${event.calls.map((c) => c.name).join(", ")}`,
            event.calls)
          void this._handleToolCalls(event.calls)
          break

        case "error":
          this._setStatus("idle")
          devLogger.log("voice", "error", "websocket", event.message)
          this._callbacks?.onError?.(event.message)
          break

        case "disconnected":
          this._setStatus("idle")
          devLogger.log("voice", "warn", "disconnect", `Code: ${event.code} ${event.reason}`)
          break
      }
    })
  }

  private async _handleToolCalls(calls: FunctionCall[]): Promise<void> {
    if (!this._activePersona || !this._provider) return

    for (const fc of calls) {
      const startMs = Date.now()
      this._callbacks?.onFunctionCallStart(fc.name, fc.args || {})
      devLogger.log("function", "info", fc.name, JSON.stringify(fc.args || {}), fc.args)

      try {
        const result = await this._activePersona.onFunctionCall(fc)

        if (result) {
          this._provider.sendFunctionResponse(fc.id, fc.name, JSON.stringify(result))
          commandAudit.record({
            timestamp: startMs,
            commandName: fc.name,
            args: fc.args || {},
            contextId: this._activePersona.id,
            resultType: "speak",
            durationMs: Date.now() - startMs,
            responseText: String(result.narrative || "").slice(0, 100),
          })

          // Notify narrative callback if result has narrative
          if (result.narrative && typeof result.narrative === "string") {
            this._callbacks?.onNarrative?.(result.narrative)
          }
        } else {
          this._provider.sendFunctionResponse(fc.id, fc.name, JSON.stringify({ error: "Not handled" }))
          commandAudit.record({
            timestamp: startMs,
            commandName: fc.name,
            args: fc.args || {},
            contextId: this._activePersona.id,
            resultType: "error",
            durationMs: Date.now() - startMs,
            errorMessage: "Not handled by persona",
          })
        }
      } catch (e) {
        this._provider.sendFunctionResponse(fc.id, fc.name, JSON.stringify({ error: String(e) }))
        commandAudit.record({
          timestamp: startMs,
          commandName: fc.name,
          args: fc.args || {},
          contextId: this._activePersona.id,
          resultType: "error",
          durationMs: Date.now() - startMs,
          errorMessage: String(e),
        })
      }
    }
  }
}

/** Singleton engine instance */
let _engine: AriaEngine | null = null

export function getAriaEngine(): AriaEngine {
  if (!_engine) _engine = new AriaEngine()
  return _engine
}
