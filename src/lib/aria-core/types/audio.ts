/**
 * Audio pipeline contracts.
 */

/** Audio capture configuration */
export interface AudioConfig {
  inputSampleRate: number
  outputSampleRate: number
  channelCount: number
  echoCancellation: boolean
  noiseSuppression: boolean
}

/** Audio constraints for getUserMedia */
export interface AudioConstraints {
  sampleRate: number
  channelCount: number
  echoCancellation: boolean
  noiseSuppression: boolean
}

/** Default audio configuration for Gemini Live */
export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  inputSampleRate: 16000,
  outputSampleRate: 24000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
}
