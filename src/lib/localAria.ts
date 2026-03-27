/**
 * Local Aria — FunctionGemma inference client.
 *
 * Replaces Gemini Live's function calling with local on-device inference.
 * The SU Lab can toggle between cloud (Gemini Live) and local (FunctionGemma).
 *
 * Usage:
 *   const result = await localInfer("make it red")
 *   // { function_name: "set_color", arguments: { color: "red" }, latency_ms: 45 }
 */

export interface LocalInferResult {
  function_name: string | null
  arguments: Record<string, any>
  is_function_call: boolean
  text_response?: string
  raw_output: string
  latency_ms: number
}

const API_BASE = "/api/functiongemma"

/**
 * Run local FunctionGemma inference.
 * Returns a function call or text response.
 */
export async function localInfer(text: string): Promise<LocalInferResult> {
  const res = await fetch(`${API_BASE}/infer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

/**
 * Check if FunctionGemma is loaded and available.
 */
export async function localStatus(): Promise<{ loaded: boolean; model_path: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/status`)
    if (!res.ok) return { loaded: false, model_path: null }
    return res.json()
  } catch {
    return { loaded: false, model_path: null }
  }
}

/**
 * Unload FunctionGemma from memory.
 */
export async function localUnload(): Promise<void> {
  await fetch(`${API_BASE}/unload`, { method: "POST" }).catch(() => {})
}
