/**
 * PCM audio encoding/decoding utilities.
 *
 * Extracted from useAriaLive.ts lines ~417-435.
 * Pure functions — no side effects, no dependencies.
 */

/** Convert Float32Array audio samples to 16-bit PCM ArrayBuffer */
export function floatTo16BitPCM(f32: Float32Array): ArrayBuffer {
  const buf = new ArrayBuffer(f32.length * 2)
  const dv = new DataView(buf)
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]))
    dv.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buf
}

/** Encode an ArrayBuffer to base64 string */
export function toBase64(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf)
  let s = ""
  for (let i = 0; i < b.byteLength; i++) s += String.fromCharCode(b[i])
  return btoa(s)
}

/** Decode a base64 string to Int16Array PCM data */
export function fromBase64(b64: string): Int16Array {
  const bin = atob(b64)
  const b = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i)
  return new Int16Array(b.buffer)
}

/** Encode Float32Array audio to base64 PCM string (convenience) */
export function encodeAudioChunk(f32: Float32Array): string {
  return toBase64(floatTo16BitPCM(f32))
}

/** Decode base64 PCM to Float32Array for playback */
export function decodeAudioChunk(b64: string): Float32Array {
  const int16 = fromBase64(b64)
  const f32 = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 0x8000
  return f32
}
