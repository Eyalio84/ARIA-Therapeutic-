/**
 * Audio playback scheduler — gapless chunk scheduling.
 *
 * Extracted from useAriaLive.ts lines ~438-461.
 * Manages Web Audio API buffer scheduling for seamless speech playback.
 */

import { fromBase64 } from "./pcmHelpers"

export interface PlaybackCallbacks {
  onSpeakingStart: () => void
  onSpeakingEnd: () => void
}

export class PlaybackScheduler {
  private _playCtx: AudioContext | null = null
  private _playing = false
  private _nextTime = 0
  private _silenceTimer: ReturnType<typeof setTimeout> | null = null
  private _callbacks: PlaybackCallbacks

  constructor(callbacks: PlaybackCallbacks) {
    this._callbacks = callbacks
  }

  async init(sampleRate = 24000): Promise<void> {
    this._playCtx = new AudioContext({ sampleRate })
    await this._playCtx.resume()
  }

  /** Schedule a base64-encoded PCM chunk for playback */
  scheduleChunk(base64Data: string): void {
    if (!this._playCtx) return

    const int16 = fromBase64(base64Data)

    if (!this._playing) {
      this._playing = true
      this._callbacks.onSpeakingStart()
      this._nextTime = this._playCtx.currentTime + 0.05
    }

    const f32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 0x8000

    const buf = this._playCtx.createBuffer(1, f32.length, this._playCtx.sampleRate)
    buf.copyToChannel(f32, 0)

    const src = this._playCtx.createBufferSource()
    src.buffer = buf
    src.connect(this._playCtx.destination)
    src.start(this._nextTime)
    this._nextTime += buf.duration

    if (this._silenceTimer) clearTimeout(this._silenceTimer)
    const msUntilDone = (this._nextTime - this._playCtx.currentTime) * 1000 + 400
    this._silenceTimer = setTimeout(() => {
      this._playing = false
      this._callbacks.onSpeakingEnd()
    }, msUntilDone)
  }

  /** Stop playback and clean up */
  destroy(): void {
    this._playing = false
    if (this._silenceTimer) clearTimeout(this._silenceTimer)
    this._playCtx?.close().catch(() => {})
    this._playCtx = null
  }

  get isPlaying(): boolean {
    return this._playing
  }
}
