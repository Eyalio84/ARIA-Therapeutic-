/**
 * BaseProvider — abstract class with lifecycle hooks and reconnect logic.
 *
 * All concrete providers extend this to get:
 * - Event pub/sub
 * - Reconnect with exponential backoff
 * - Default sendPageContext implementation
 */

import type {
  AriaProvider,
  AriaProviderConfig,
  FunctionCall,
  ProviderEvent,
  ProviderEventHandler,
} from "../types/provider"

export abstract class BaseProvider implements AriaProvider {
  abstract readonly name: string

  protected _config: AriaProviderConfig | null = null
  protected _connected = false
  private _handlers = new Set<ProviderEventHandler>()
  private _reconnectAttempts = 0
  private _maxReconnects = 3
  private _reconnectMs = 1000

  get isConnected(): boolean {
    return this._connected
  }

  /** Register an event handler. Returns unsubscribe function. */
  onEvent(handler: ProviderEventHandler): () => void {
    this._handlers.add(handler)
    return () => this._handlers.delete(handler)
  }

  /** Emit an event to all registered handlers */
  protected emit(event: ProviderEvent): void {
    for (const h of this._handlers) {
      try { h(event) } catch { /* handler errors must not crash provider */ }
    }
  }

  abstract connect(config: AriaProviderConfig): Promise<void>
  abstract disconnect(): void
  abstract sendAudio(base64Pcm: string): void
  abstract sendText(text: string): void
  abstract sendFunctionResponse(callId: string, name: string, result: string): void

  /** Default implementation — subclasses can override */
  sendPageContext(pathname: string): void {
    this.sendText(`[page: ${pathname}]`)
  }

  /** Attempt reconnect with exponential backoff */
  protected async attemptReconnect(): Promise<void> {
    if (!this._config || this._reconnectAttempts >= this._maxReconnects) {
      this.emit({ type: "disconnected", code: 1000, reason: "max reconnects reached" })
      return
    }

    const delay = this._reconnectMs * Math.pow(2, this._reconnectAttempts)
    this._reconnectAttempts++

    await new Promise((r) => setTimeout(r, delay))
    try {
      await this.connect(this._config)
      this._reconnectAttempts = 0
    } catch {
      await this.attemptReconnect()
    }
  }

  protected resetReconnectState(): void {
    this._reconnectAttempts = 0
  }
}
