"use client"

/**
 * Aria singleton for aria-personal.
 *
 * Wires AriaCore with the personal persona + commands.
 * The chat store is the bridge between AriaCore callbacks and the UI.
 *
 * Phase 2: SqliteSessionStore + KGStore — persists sessions + messages.
 * Phase 3: Auto-resume + memory injection on connect.
 */

import { AriaCore, MicCapture, PlaybackScheduler } from "./aria-core"
import { GeminiLiveSDKProvider } from "./aria-core/providers/geminiLiveSDK"
import type { ContextDefinition } from "./aria-core/types/context"
import { personalPersona } from "./persona"
import { personalCommands, personalContextFunctions } from "./commands"
import { useChatStore } from "@/store/chat"
import { SqliteSessionStore } from "./aria-core/state/sqliteSessionStore"
import { KGStore } from "./aria-core/state/kgStore"
import { sessionAdapter } from "./sessionAdapter"
import { kgAdapter } from "./kgAdapter"
import { findResumeCandidate, buildResumeContext, getReturningGreeting } from "./sessionResolver"
import { getMemoryBlock } from "./memoryInjector"

const store = () => useChatStore.getState()

// ── Persistence layer ───────────────────────────────────────────────────────
export const sessionStore = new SqliteSessionStore(sessionAdapter)
export const kgStore      = new KGStore(kgAdapter)

let _sessionId: string | null = null

// ── Injector state — set before connect, read by closures below ─────────────
let _pendingResumeBlock: string | null = null
let _memoryBlock:        string | null = null

// ── Personal context definition ────────────────────────────────────────────
const personalContext: ContextDefinition = {
  id: "personal",
  label: "Personal",
  functions: personalContextFunctions,
  greeting: personalPersona.greetings["personal"] ?? personalPersona.greetings["default"],
}

// ── Audio pipeline ─────────────────────────────────────────────────────────
const _mic = new MicCapture()
let _scheduler: PlaybackScheduler | null = null

// ── AriaCore ───────────────────────────────────────────────────────────────
export const aria = new AriaCore({
  provider: new GeminiLiveSDKProvider({
    apiKey: () => process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "",
  }),
  persona:        personalPersona,
  contexts:       [personalContext],
  initialContext: "personal",

  onUICommand: (cmd) => {
    if (cmd.type === "OPEN_URL" && typeof cmd.url === "string") {
      window.open(cmd.url, "_blank", "noopener")
    }
  },

  onAudio: (b64) => _scheduler?.scheduleChunk(b64),

  onTranscript: (type, text) => {
    if (type === "user") {
      store().addMessage("user", text)
      if (_sessionId) {
        void sessionStore.appendMessage(_sessionId, "user", text)
        void kgStore.ingestChunk(
          { nodeId: `msg::${Date.now()}`, name: "User message", description: text, nodeType: "message" },
          _sessionId,
        )
      }
    } else {
      store().addMessage("aria", text)
      if (_sessionId) {
        void sessionStore.appendMessage(_sessionId, "aria", text)
      }
    }
  },

  onStatusChange: (status) => {
    store().setStatus(status as import("@/store/chat").AriaStatus)
    if (status === "listening") store().setConnected(true)
    else if (status === "idle")  store().setConnected(false)
  },

  onError: (_source, err) => {
    const msg = err instanceof Error ? err.message : String(err)
    store().addSystemMessage(`⚠ ${msg}`)
    store().setStatus("idle")
  },
})

// Register personal commands
aria.commandRegistry.registerAll(personalCommands)

// ── Context injectors ───────────────────────────────────────────────────────

// Priority 0 — session resume context (one-shot, prepended before all others)
aria.contextEngine.addGlobalInjector({
  id:       "session-resume",
  priority: 0,
  inject:   () => {
    const block = _pendingResumeBlock
    _pendingResumeBlock = null
    return block
  },
})

// Priority 10 — live memory retrieval from KG (populated before each connect)
aria.contextEngine.addGlobalInjector({
  id:       "memory",
  priority: 10,
  inject:   () => _memoryBlock,
})

// ── Connect / disconnect ───────────────────────────────────────────────────

export async function ariaConnect() {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    store().addSystemMessage("⚠ NEXT_PUBLIC_GEMINI_API_KEY not set in .env.local")
    return
  }

  store().setStatus("connecting")
  store().addSystemMessage("Connecting…")

  // ── Auto-resume: check for a recent session ──
  try {
    const candidate = await findResumeCandidate(sessionStore.listSessions.bind(sessionStore))
    if (candidate) {
      const messages = await sessionStore.getResumeContext(candidate.id)
      _pendingResumeBlock = buildResumeContext(candidate, messages)

      // Update greeting to returning variant
      const returningTemplate = personalPersona.greetings["returning"]
      if (returningTemplate) {
        personalContext.greeting = getReturningGreeting(returningTemplate, candidate)
      }
    } else {
      personalContext.greeting = personalPersona.greetings["personal"] ?? personalPersona.greetings["default"]
    }
  } catch (err) {
    console.warn("[aria] Auto-resume check failed:", err)
  }

  // ── Memory injection: populate before connect so injector reads the new value ──
  try {
    _memoryBlock = await getMemoryBlock(kgStore)
  } catch (err) {
    console.warn("[aria] Memory injection failed:", err)
    _memoryBlock = null
  }

  // ── Start a new session ──
  try {
    _sessionId = await sessionStore.startSession(personalPersona.name)
  } catch (err) {
    console.warn("[aria] Session store unavailable:", err)
    _sessionId = null
  }

  try {
    await aria.connect()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    store().addSystemMessage(`⚠ Connect failed: ${msg}`)
    store().setStatus("idle")
    return
  }

  // ── Audio pipeline ──
  _scheduler?.destroy()
  _scheduler = new PlaybackScheduler({
    onSpeakingStart: () => store().setStatus("speaking"),
    onSpeakingEnd:   () => store().setStatus("listening"),
  })
  await _scheduler.init(24000)

  try {
    await _mic.start(
      { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      (b64) => aria.sendAudio(b64),
    )
    store().setMicActive(true)
    store().addSystemMessage("Connected · mic active")
  } catch {
    store().addSystemMessage("Connected · mic unavailable (text mode only)")
  }
}

export function ariaDisconnect() {
  _mic.stop()
  _scheduler?.destroy()
  _scheduler = null
  aria.disconnect()
  store().setConnected(false)
  store().setStatus("idle")
  store().setMicActive(false)
  store().addSystemMessage("Disconnected.")

  if (_sessionId) {
    void sessionStore.endSession(_sessionId)
    _sessionId = null
  }
}

export async function ariaSwitchContext(contextId: string) {
  store().addSystemMessage(`Switching to context: ${contextId}`)
  aria.contextEngine.setActive(contextId)
  store().setActiveContext(contextId)
  await aria.connect()
  store().addSystemMessage(`Context: ${contextId}`)
}

export async function ariaSwitchVoice(voice: string) {
  store().setActiveVoice(voice)
  store().addSystemMessage(`Voice set to ${voice} — reconnecting…`)
  ;(personalPersona.voice as { name: string }).name = voice
  await aria.connect()
  store().addSystemMessage(`Voice: ${voice}`)
}

/**
 * Resume a specific past session — loads its context and reconnects.
 * Called from SessionHistory when the user taps a session card.
 */
export async function ariaResumeSession(session: import("./aria-core/state/sqliteSessionStore").SessionRow) {
  try {
    const messages = await sessionStore.getResumeContext(session.id)
    _pendingResumeBlock = buildResumeContext(session, messages)
    const returningTemplate = personalPersona.greetings["returning"]
    if (returningTemplate) {
      personalContext.greeting = getReturningGreeting(returningTemplate, session)
    }
    store().addSystemMessage(`Resuming: "${session.snapshot_name ?? extractPreview(session.summary)}"`)
  } catch (err) {
    console.warn("[aria] Resume session failed:", err)
  }
  await ariaConnect()
}

// ── Exposed for Phase 3 UI ────────────────────────────────────────────────
export function currentSessionId(): string | null { return _sessionId }

// ── Helpers ──────────────────────────────────────────────────────────────
function extractPreview(summary: string | null): string {
  if (!summary) return "session"
  const match = summary.match(/^Started with: "(.+?)"/)
  return match ? match[1].slice(0, 40) : summary.slice(0, 40)
}
