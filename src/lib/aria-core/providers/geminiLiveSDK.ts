/**
 * GeminiLiveSDKProvider — Gemini Live backend using @google/genai SDK.
 *
 * Replaces the raw WebSocket provider. The SDK handles the wire protocol,
 * setup message format, and reconnection logic correctly.
 */

import { GoogleGenAI, Modality } from "@google/genai"
import type { Session, LiveServerMessage, FunctionDeclaration as SDKFunctionDeclaration } from "@google/genai"
import { BaseProvider } from "./base"
import type { AriaProviderConfig, FunctionCall } from "../types/provider"

export interface GeminiLiveSDKConfig {
  apiKey: string | (() => string)
  model?: string
}

const DEFAULT_MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025"

export class GeminiLiveSDKProvider extends BaseProvider {
  readonly name = "gemini-live-sdk"

  private _session: Session | null = null
  private _apiKeySource: string | (() => string)
  private _model: string

  constructor(cfg: GeminiLiveSDKConfig) {
    super()
    this._apiKeySource = cfg.apiKey
    this._model = cfg.model ?? DEFAULT_MODEL
  }

  private get _apiKey(): string {
    return typeof this._apiKeySource === "function" ? this._apiKeySource() : this._apiKeySource
  }

  async connect(config: AriaProviderConfig): Promise<void> {
    this.disconnect()

    const ai = new GoogleGenAI({ apiKey: this._apiKey })

    return new Promise((resolve, reject) => {
      let settled = false
      const settle = (fn: () => void) => { if (!settled) { settled = true; fn() } }

      const timeout = setTimeout(() => {
        settle(() => reject(new Error("Timeout — setupComplete never received")))
        this.disconnect()
      }, 15000)

      ai.live.connect({
        model: this._model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: config.voice ?? "Aoede" },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: { parts: [{ text: config.systemPrompt }] },
          tools: config.functions.length > 0
            ? [{ functionDeclarations: config.functions as unknown as SDKFunctionDeclaration[] }]
            : [],
        },
        callbacks: {
          onopen: () => {
            // SDK fires onopen after setup is sent and setupComplete received
          },
          onmessage: (msg: LiveServerMessage) => {
            if (msg.setupComplete) {
              clearTimeout(timeout)
              this._connected = true
              this.resetReconnectState()
              this.emit({ type: "ready" })
              settle(resolve)
              return
            }
            this._handleSDKMessage(msg)
          },
          onerror: (e: { message?: string }) => {
            clearTimeout(timeout)
            settle(() => reject(new Error(e.message ?? "WebSocket error")))
            this.emit({ type: "error", message: e.message ?? "WebSocket error" })
          },
          onclose: (e: { reason?: string; code?: number }) => {
            clearTimeout(timeout)
            this._connected = false
            settle(() => reject(new Error(`Closed: ${e.reason ?? "none"}`)))
            this.emit({ type: "disconnected", code: e.code ?? 1000, reason: e.reason ?? "" })
          },
        },
      }).then((session) => {
        this._session = session
      }).catch((err: unknown) => {
        clearTimeout(timeout)
        settle(() => reject(err instanceof Error ? err : new Error(String(err))))
      })
    })
  }

  disconnect(): void {
    if (this._session) {
      try { this._session.close() } catch { /* ignore */ }
      this._session = null
    }
    this._connected = false
  }

  sendAudio(base64Pcm: string): void {
    if (!this._session) return
    this._session.sendRealtimeInput({
      audio: { data: base64Pcm, mimeType: "audio/pcm;rate=16000" },
    })
  }

  sendText(text: string): void {
    if (!this._session) return
    this._session.sendRealtimeInput({ text })
  }

  sendFunctionResponse(callId: string, name: string, result: string): void {
    if (!this._session) return
    this._session.sendToolResponse({
      functionResponses: [{ id: callId, name, response: { output: result } }],
    })
  }

  override sendPageContext(pathname: string): void {
    if (!this._session) return
    this._session.sendClientContent({
      turns: [{ role: "user", parts: [{ text: `[SYSTEM — do not respond] Page changed to: ${pathname}` }] }],
      turnComplete: false,
    })
  }

  private _handleSDKMessage(msg: LiveServerMessage): void {
    if (msg.serverContent) {
      const sc = msg.serverContent

      if (sc.inputTranscription?.text) this.emit({ type: "inputTranscription", text: sc.inputTranscription.text })
      if (sc.outputTranscription?.text) this.emit({ type: "text", text: sc.outputTranscription.text })

      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part.inlineData?.data) this.emit({ type: "audio", data: part.inlineData.data })
          if (part.text)             this.emit({ type: "text", text: part.text })
        }
      }
    }

    if (msg.toolCall?.functionCalls) {
      const calls: FunctionCall[] = msg.toolCall.functionCalls.map((fc) => ({
        id:   fc.id   ?? "",
        name: fc.name ?? "",
        args: fc.args ?? {},
      }))
      this.emit({ type: "toolCall", calls })
    }
  }
}
