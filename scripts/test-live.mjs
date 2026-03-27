import { readFileSync } from "fs"
import { GoogleGenAI, Modality } from "@google/genai"

// Load .env.local manually (no dotenv dependency)
const envFile = readFileSync("/root/aria-personal/.env.local", "utf8")
for (const line of envFile.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] ??= m[2].trim()
}

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error("GEMINI_API_KEY not set in .env.local")
  process.exit(1)
}

console.log("API key prefix:", apiKey.slice(0, 12) + "…")
console.log("Connecting to Gemini Live…")

const ai = new GoogleGenAI({ apiKey })
const model = "models/gemini-2.5-flash-native-audio-preview-12-2025"

const session = await ai.live.connect({
  model,
  callbacks: {
    onopen:   () => console.log("✓ WebSocket opened"),
    onmessage: (msg) => console.log("✓ Message:", JSON.stringify(msg).slice(0, 200)),
    onerror:  (e) => console.error("✗ Error:", e.message),
    onclose:  (e) => console.log("Closed:", e.reason || "(no reason)"),
  },
  config: {
    responseModalities: [Modality.AUDIO],
    outputAudioTranscription: {},
  },
})

console.log("✓ Session connected — sending text…")
session.sendClientContent({ turns: "Hello, can you hear me? Reply briefly." })

// Wait up to 15s for a response
const deadline = Date.now() + 15000
let got = false
while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, 300))
  if (got) break
}

console.log("Closing session.")
session.close()
