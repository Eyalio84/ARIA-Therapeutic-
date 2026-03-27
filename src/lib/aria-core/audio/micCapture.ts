/**
 * Microphone capture — getUserMedia + ScriptProcessorNode.
 *
 * Extracted from useAriaLive.ts lines ~1384-1403.
 */

import type { AudioConstraints } from "../types/audio"
import { floatTo16BitPCM, toBase64 } from "./pcmHelpers"

export type AudioChunkHandler = (base64Pcm: string) => void

export class MicCapture {
  private _audioCtx: AudioContext | null = null
  private _processor: ScriptProcessorNode | null = null
  private _stream: MediaStream | null = null

  /**
   * Start capturing microphone audio.
   * Calls onChunk with base64-encoded PCM for each audio frame.
   */
  async start(
    constraints: AudioConstraints,
    onChunk: AudioChunkHandler,
    bufferSize = 8192,
  ): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: constraints.sampleRate,
        channelCount: constraints.channelCount,
        echoCancellation: constraints.echoCancellation,
        noiseSuppression: constraints.noiseSuppression,
      },
    })
    this._stream = stream

    const ctx = new AudioContext({ sampleRate: constraints.sampleRate })
    this._audioCtx = ctx
    await ctx.resume()

    const source = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(bufferSize, 1, 1)
    this._processor = processor

    processor.onaudioprocess = (e) => {
      const pcm = floatTo16BitPCM(e.inputBuffer.getChannelData(0))
      onChunk(toBase64(pcm))
    }

    source.connect(processor)
    processor.connect(ctx.destination)
  }

  /** Stop capturing and release resources */
  stop(): void {
    this._processor?.disconnect()
    this._stream?.getTracks().forEach((t) => t.stop())
    this._audioCtx?.close().catch(() => {})
    this._audioCtx = null
    this._processor = null
    this._stream = null
  }

  get isCapturing(): boolean {
    return this._stream !== null
  }
}
