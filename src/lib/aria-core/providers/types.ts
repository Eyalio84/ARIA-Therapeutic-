/**
 * Gemini Live API message types.
 *
 * These are wire-format types — provider-specific, not exposed through the
 * public AriaProvider interface. Used only inside GeminiLiveProvider.
 */

// ── Outbound Messages ────────────────────────────────────────────────────

export interface GeminiSetupMessage {
  setup: {
    model: string
    generation_config: {
      response_modalities: ["AUDIO"]
      speech_config: {
        voice_config: {
          prebuilt_voice_config: {
            voice_name: string
          }
        }
      }
    }
    input_audio_transcription?: Record<string, never>
    system_instruction: {
      parts: Array<{ text: string }>
    }
    tools: Array<{
      function_declarations: Array<{
        name: string
        description: string
        parameters: {
          type: string
          properties: Record<string, { type: string; description?: string }>
          required?: string[]
        }
      }>
    }>
  }
}

export interface GeminiRealtimeInputMessage {
  realtime_input: {
    media_chunks: Array<{
      data: string
      mime_type: string
    }>
  }
}

export interface GeminiFunctionResponseMessage {
  tool_response: {
    function_responses: Array<{
      id: string
      name: string
      response: { output: string }
    }>
  }
}

export interface GeminiClientContentMessage {
  client_content: {
    turns: Array<{
      role: string
      parts: Array<{ text: string }>
    }>
    turn_complete: boolean
  }
}

// ── Inbound Messages ─────────────────────────────────────────────────────

export interface GeminiSetupComplete {
  setupComplete: Record<string, unknown>
}

export interface GeminiServerContent {
  serverContent: {
    modelTurn?: {
      parts: Array<{
        inlineData?: { data: string; mimeType: string }
        text?: string
        executableCode?: unknown
      }>
    }
    interrupted?: boolean
    inputTranscription?: { text: string }
    outputTranscription?: { text: string }
    turnComplete?: boolean
  }
}

export interface GeminiToolCall {
  toolCall: {
    functionCalls: Array<{
      id: string
      name: string
      args: Record<string, unknown>
    }>
  }
}

export type GeminiServerMessage =
  | GeminiSetupComplete
  | GeminiServerContent
  | GeminiToolCall
  | Record<string, unknown>
