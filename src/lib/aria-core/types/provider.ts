/**
 * Provider contracts — swappable AI backend interface.
 *
 * Implementations: GeminiLiveProvider, (future) OpenAIRealtimeProvider, ClaudeKokoroProvider
 */

/** Function parameter schema (provider-agnostic) */
export interface FunctionParameterProperty {
  type: string
  description?: string
}

export interface FunctionParameters {
  type: string
  properties: Record<string, FunctionParameterProperty>
  required?: string[]
}

/** Function declaration sent to the AI provider */
export interface FunctionDeclaration {
  name: string
  description: string
  parameters: FunctionParameters
}

/** Function call received from the AI provider */
export interface FunctionCall {
  id: string
  name: string
  args: Record<string, unknown>
}

/** Provider lifecycle events */
export type ProviderEvent =
  | { type: "ready" }
  | { type: "audio"; data: string }
  | { type: "text"; text: string }
  | { type: "inputTranscription"; text: string }
  | { type: "toolCall"; calls: FunctionCall[] }
  | { type: "error"; message: string }
  | { type: "disconnected"; code: number; reason: string }

export type ProviderEventHandler = (event: ProviderEvent) => void

/** Configuration for any provider */
export interface AriaProviderConfig {
  apiKey: string
  model?: string
  voice?: string
  systemPrompt: string
  functions: FunctionDeclaration[]
  sampleRate?: number
}

/** The provider interface every backend must implement */
export interface AriaProvider {
  readonly name: string
  readonly isConnected: boolean

  connect(config: AriaProviderConfig): Promise<void>
  disconnect(): void

  sendAudio(base64Pcm: string): void
  sendText(text: string): void
  sendFunctionResponse(callId: string, name: string, result: string): void
  sendPageContext(pathname: string): void

  onEvent(handler: ProviderEventHandler): () => void
}
