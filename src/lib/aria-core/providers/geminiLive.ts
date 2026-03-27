/**
 * GeminiLiveProvider — Gemini Live WebSocket backend.
 *
 * Extracted from hooks/useAriaLive.ts (the 1433-line monolith).
 * The key change: model, apiKey, and voice are constructor config,
 * not module-level constants. This makes the provider testable and swappable.
 *
 * Wire protocol: BidiGenerateContent WebSocket (Gemini Live API v1beta)
 */

import { BaseProvider } from "./base"
import type { AriaProviderConfig, FunctionCall } from "../types/provider"
import type {
  GeminiSetupMessage,
  GeminiServerMessage,
  GeminiServerContent,
  GeminiToolCall,
} from "./types"

export interface GeminiLiveConfig {
  /** Static key string, or a function called fresh on every connect() */
  apiKey: string | (() => string)
  model?: string
  wsUrl?: string
}

const DEFAULT_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
const DEFAULT_MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025"

export class GeminiLiveProvider extends BaseProvider {
  readonly name = "gemini-live"

  private _ws: WebSocket | null = null
  private _wsUrl: string
  private _model: string
  private _apiKeySource: string | (() => string)

  constructor(cfg: GeminiLiveConfig) {
    super()
    this._apiKeySource = cfg.apiKey
    this._model = cfg.model ?? DEFAULT_MODEL
    this._wsUrl = cfg.wsUrl ?? DEFAULT_WS_URL
  }

  private get _apiKey(): string {
    return typeof this._apiKeySource === "function" ? this._apiKeySource() : this._apiKeySource
  }

  async connect(config: AriaProviderConfig): Promise<void> {
    this._config = config
    this.disconnect()

    return new Promise((resolve, reject) => {
      let settled = false
      const settle = (fn: () => void) => { if (!settled) { settled = true; fn() } }

      // Timeout — if setupComplete never arrives, reject after 15s
      const timeout = setTimeout(() => {
        settle(() => reject(new Error("Timeout waiting for setupComplete — model may be unavailable")))
        ws.close()
      }, 15000)

      const url = `${this._wsUrl}?key=${this._apiKey}`
      const ws = new WebSocket(url)
      this._ws = ws

      ws.onopen = () => {
        const setup: GeminiSetupMessage = {
          setup: {
            model: this._model,
            generation_config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: config.voice ?? "Aoede",
                  },
                },
              },
            },
            input_audio_transcription: {},
            system_instruction: {
              parts: [{ text: config.systemPrompt }],
            },
            tools: config.functions.length > 0
              ? [{ function_declarations: config.functions }]
              : [],
          },
        }
        ws.send(JSON.stringify(setup))
      }

      ws.onmessage = async (event: MessageEvent) => {
        // Gemini may send Blob or string — normalize to string
        let raw = event.data
        if (raw instanceof Blob) {
          raw = await raw.text()
        }
        let msg: GeminiServerMessage
        try {
          msg = JSON.parse(typeof raw === "string" ? raw : "") as GeminiServerMessage
        } catch { return }

        clearTimeout(timeout)
        this._handleMessage(msg, () => settle(resolve))
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        settle(() => reject(new Error("WebSocket error — check API key and network")))
        this.emit({ type: "error", message: "WebSocket error" })
      }

      ws.onclose = (ev) => {
        clearTimeout(timeout)
        this._connected = false
        settle(() => reject(new Error(`Connection closed before ready (code=${ev.code} reason=${ev.reason || "none"})`)))
        this.emit({ type: "disconnected", code: ev.code, reason: ev.reason })
        if (!ev.wasClean) void this.attemptReconnect()
      }
    })
  }

  private _handleMessage(msg: GeminiServerMessage, onReady?: (v: void) => void): void {
    // Setup complete
    if ("setupComplete" in msg) {
      this._connected = true
      this.resetReconnectState()
      this.emit({ type: "ready" })
      onReady?.()
      return
    }

    // Server content (audio + text + transcriptions)
    if ("serverContent" in msg) {
      const sc = (msg as GeminiServerContent).serverContent

      if (sc.inputTranscription?.text) {
        this.emit({ type: "inputTranscription", text: sc.inputTranscription.text })
      }

      if (sc.outputTranscription?.text) {
        this.emit({ type: "text", text: sc.outputTranscription.text })
      }

      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part.inlineData?.data) {
            this.emit({ type: "audio", data: part.inlineData.data })
          }
          if (part.text) {
            this.emit({ type: "text", text: part.text })
          }
        }
      }
      return
    }

    // Tool calls (function calls)
    if ("toolCall" in msg) {
      const tc = (msg as GeminiToolCall).toolCall
      const calls: FunctionCall[] = tc.functionCalls.map((fc) => ({
        id: fc.id,
        name: fc.name,
        args: fc.args,
      }))
      this.emit({ type: "toolCall", calls })
    }
  }

  disconnect(): void {
    if (this._ws) {
      this._ws.onclose = null // prevent reconnect on intentional close
      this._ws.close(1000, "user disconnect")
      this._ws = null
    }
    this._connected = false
  }

  sendAudio(base64Pcm: string): void {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return
    this._ws.send(JSON.stringify({
      realtime_input: {
        media_chunks: [{ data: base64Pcm, mime_type: "audio/pcm;rate=16000" }],
      },
    }))
  }

  sendText(text: string): void {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return
    this._ws.send(JSON.stringify({
      client_content: {
        turns: [{ role: "user", parts: [{ text }] }],
        turn_complete: true,
      },
    }))
  }

  sendFunctionResponse(callId: string, name: string, result: string): void {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return
    this._ws.send(JSON.stringify({
      tool_response: {
        function_responses: [{ id: callId, name, response: { output: result } }],
      },
    }))
  }

  override sendPageContext(pathname: string): void {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return
    this._ws.send(JSON.stringify({
      client_content: {
        turns: [{ role: "user", parts: [{ text: `[SYSTEM — do not respond] Page changed to: ${pathname}` }] }],
        turn_complete: false,
      },
    }))
  }
}
