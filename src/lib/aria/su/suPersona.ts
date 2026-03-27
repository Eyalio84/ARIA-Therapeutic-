/**
 * Super User Persona — Aria as YOUR personal Jarvis.
 * Extractable: delete su/ folder to remove from build.
 *
 * This persona is separate from the game. It's Eyal's dev tool.
 * Future: Computer Use, web browsing, cross-app control, Android.
 */

import { useGameStore } from "@/store/game"
import { useGameVoiceStore } from "@/store/gameVoice"
import { useTranscriptStore } from "@/store/transcript"
import { useAriaModeStore } from "@/store/ariaMode"
import { devLogger, commandAudit } from "../../gameDevLogger"
import { SU_FUNCTIONS } from "./suFunctions"
import type { PersonaConfig } from "../persona"
import type { FunctionCall } from "../../aria-core/types/provider"

// ── UI Callbacks (set by GameScreen or any host app) ──
interface SUCallbacks {
  openPanel: (panel: "devhub" | "transcript" | "aria" | "burger" | "drawer") => void
  switchToGame: () => void
}
let _suCallbacks: SUCallbacks | null = null

export function setSUCallbacks(cbs: SUCallbacks) { _suCallbacks = cbs }

// ── Build SU system prompt ──
function buildSUPrompt(): string {
  const gs = useGameStore.getState()
  const gc = gs.gameConfig

  let prompt = "You are Aria in SUPER USER mode. You are Eyal's personal AI assistant.\n" +
    "You are aware of the full application: DevHub, transcript, persistence, themes, stores, voice config.\n" +
    "Speak clearly and directly. No atmospheric narration. You are Jarvis.\n\n"

  prompt += "SYSTEM STATE:\n"
  prompt += `Game loaded: ${gc ? `"${gc.title}" — ${gc.protagonist_name}` : "No game"}\n`
  prompt += `Turn: ${gs.turnCount} | Courage: ${gs.playerStats.courage} | Trust: ${gs.playerStats.trust} | Items: ${gs.playerStats.items}\n`
  prompt += `Locations discovered: ${gs.mapNodes.filter((n) => n.discovered).length} / ${gs.mapNodes.length}\n`
  prompt += `Voice: ${useGameVoiceStore.getState().isConnected ? "connected" : "disconnected"}\n`
  prompt += `Transcript entries: ${useTranscriptStore.getState().entries.length}\n`
  prompt += `Dev log entries: ${devLogger.entryCount}\n`
  prompt += `Audit records: ${commandAudit.recordCount}\n\n`

  prompt += "AVAILABLE PANELS:\n" +
    "- DevHub: logs, voice events, game state, command audit, config\n" +
    "- Transcript: therapeutic session log\n" +
    "- Aria Settings: voice, persona, NPC presets\n" +
    "- Journal: map, inventory, quests, companion\n" +
    "- Burger Menu: theme, profile, save/exit\n\n"

  prompt += "DEVICE CAPABILITIES:\n" +
    "You can control the physical device: flashlight, volume, vibration, notifications, clipboard.\n" +
    "You can read device state: battery, temperature, RAM, WiFi, GPS location.\n\n" +
    "WEB CAPABILITIES:\n" +
    "You can search the web (web_search), read any URL (read_page, summarize_url), and do deep research (research_topic).\n" +
    "You can take photos with the camera and analyze them with Gemini Vision (take_and_analyze_photo).\n" +
    "You can run automated tests on the game engine (self_test_game).\n" +
    "For research questions, use research_topic for thorough investigation.\n\n"

  prompt += "BEHAVIOR:\n" +
    "- Use functions to execute actions. Don't just describe — do it.\n" +
    "- Be concise and helpful. Answer questions about the system directly.\n" +
    "- When asked to go back to game, use switch_to_game.\n" +
    "- For device control ('turn on flashlight', 'what's my battery'), use the device functions.\n" +
    "- Infer intent: 'it's dark in here' → toggle_torch(on=true). 'I need to remember this' → clipboard_write.\n" +
    "- NEVER narrate atmospherically. You are Jarvis.\n"

  return prompt
}

const BASE = process.env.NEXT_PUBLIC_GAME_API || ""

// ── Handle SU function calls ──
async function handleSUFunctionCall(fc: FunctionCall): Promise<Record<string, unknown> | null> {
  const gs = useGameStore.getState()

  switch (fc.name) {
    case "open_devhub":
      _suCallbacks?.openPanel("devhub")
      return { narrative: "DevHub opened." }
    case "open_transcript":
      _suCallbacks?.openPanel("transcript")
      return { narrative: "Transcript opened." }
    case "open_aria_settings":
      _suCallbacks?.openPanel("aria")
      return { narrative: "Aria settings opened." }
    case "open_journal":
      _suCallbacks?.openPanel("drawer")
      return { narrative: "Journal opened." }
    case "open_burger_menu":
      _suCallbacks?.openPanel("burger")
      return { narrative: "Settings menu opened." }

    case "switch_theme": {
      const theme = String(fc.args?.theme || "default")
      const { useGameThemeStore } = await import("@/store/gameTheme")
      useGameThemeStore.getState().applyTheme(theme)
      return { narrative: `Theme switched to ${theme}.` }
    }

    case "save_game": {
      const { saveFullGame } = await import("@/lib/gameApi")
      const gc = gs.gameConfig
      if (!gc) return { narrative: "No game to save." }
      const entries = useTranscriptStore.getState().entries
      await saveFullGame({
        userId: gs.userId,
        gameId: gc.game_id || gc.title.toLowerCase().replace(/\s+/g, "_"),
        cartridgeId: (gc as any).cartridge_id,
        narratives: [],
        transcript: entries,
      })
      return { narrative: "Game saved." }
    }

    case "export_transcript": {
      const ts = useTranscriptStore.getState()
      return { narrative: `Transcript ready. ${ts.entries.length} entries.` }
    }

    case "show_game_state": {
      const gc = gs.gameConfig
      const discovered = gs.mapNodes.filter((n) => n.discovered).map((n) => n.label)
      const current = gs.mapNodes.find((n) => n.current)
      return {
        narrative: "Here's the current game state.",
        game: gc?.title || "None",
        protagonist: gc?.protagonist_name || "—",
        location: current?.label || "unknown",
        turn: gs.turnCount,
        stats: gs.playerStats,
        locations_discovered: discovered,
        total_locations: gs.mapNodes.length,
        choices_available: gs.currentChoices.map((c) => c.text),
        actions_available: gs.availableActions.length,
      }
    }

    case "show_errors": {
      const errors = devLogger.getByLevel("error")
      return {
        narrative: errors.length === 0 ? "No errors in the log." : `${errors.length} errors found.`,
        errors: errors.slice(-5).map((e) => ({ time: new Date(e.timestamp).toLocaleTimeString(), source: e.source, message: e.message })),
      }
    }

    case "show_audit_trail": {
      const records = commandAudit.getAll()
      return {
        narrative: `${records.length} commands in audit trail.`,
        recent: records.slice(-5).map((r) => ({ command: r.commandName, result: r.resultType, duration: r.durationMs + "ms" })),
      }
    }

    case "switch_to_game":
      useAriaModeStore.getState().setMode("game")
      _suCallbacks?.switchToGame()
      return { narrative: "Returning to game mode. The story continues..." }

    // ── Device Control (Termux API) ──
    case "device_status": {
      const res = await fetch(`${BASE}/api/termux/device-state`)
      const state = await res.json()
      return {
        narrative: `Battery ${state.battery_pct}%, ${state.cpu_temp?.toFixed(0) || "?"}C CPU, ${state.ram_available_mb}MB RAM free${state.wifi_ssid ? `, WiFi: ${state.wifi_ssid}` : ""}.${state.is_hot ? " Device is running hot." : ""}${state.is_low_battery ? " Battery is low!" : ""}`,
        ...state,
      }
    }
    case "battery_check": {
      const res = await fetch(`${BASE}/api/termux/battery`)
      const batt = await res.json()
      return {
        narrative: `Battery at ${batt.percentage}%. Health: ${batt.health}. Temperature: ${batt.temperature}C. ${batt.plugged !== "UNPLUGGED" ? "Charging." : "Not charging."}`,
        ...batt,
      }
    }
    case "toggle_torch": {
      const on = fc.args?.on !== false
      await fetch(`${BASE}/api/termux/torch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on }) })
      return { narrative: on ? "Flashlight on." : "Flashlight off." }
    }
    case "set_volume": {
      const stream = String(fc.args?.stream || "music")
      const value = Number(fc.args?.value ?? 7)
      await fetch(`${BASE}/api/termux/volume`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stream, value }) })
      return { narrative: `${stream} volume set to ${value}.` }
    }
    case "vibrate": {
      const ms = Number(fc.args?.duration_ms ?? 500)
      await fetch(`${BASE}/api/termux/vibrate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duration_ms: ms }) })
      return { narrative: `Vibrated for ${ms}ms.` }
    }
    case "send_notification": {
      const title = String(fc.args?.title || "Aria")
      const content = String(fc.args?.content || "")
      await fetch(`${BASE}/api/termux/notification`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, content }) })
      return { narrative: `Notification sent: "${title}"` }
    }
    case "clipboard_read": {
      const res = await fetch(`${BASE}/api/termux/clipboard`)
      const data = await res.json()
      return { narrative: `Clipboard contains: "${String(data.text || "").slice(0, 100)}"`, text: data.text }
    }
    case "clipboard_write": {
      const text = String(fc.args?.text || "")
      await fetch(`${BASE}/api/termux/clipboard`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })
      return { narrative: "Copied to clipboard." }
    }
    case "wifi_info": {
      const res = await fetch(`${BASE}/api/termux/wifi`)
      const wifi = await res.json()
      return {
        narrative: `WiFi: ${wifi.ssid || "not connected"}. Signal: ${wifi.rssi}dBm. IP: ${wifi.ip}.`,
        ...wifi,
      }
    }
    case "location_check": {
      const res = await fetch(`${BASE}/api/termux/location?provider=network`)
      const loc = await res.json()
      if (loc.latitude) {
        return { narrative: `Location: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}. Altitude: ${loc.altitude?.toFixed(0) || "?"}m. Accuracy: ${loc.accuracy?.toFixed(0) || "?"}m.`, ...loc }
      }
      return { narrative: "Could not get location. GPS may be disabled.", ...loc }
    }
    case "open_url": {
      const url = String(fc.args?.url || "")
      // Use termux-open-url via a simple GET that triggers the command
      await fetch(`${BASE}/api/computer/fetch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) })
      return { narrative: `Opened ${url}.` }
    }

    // ── Computer Use ──
    case "web_search": {
      const query = String(fc.args?.query || "")
      const res = await fetch(`${BASE}/api/computer/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) })
      const data = await res.json()
      if (data.error) return { narrative: `Search failed: ${data.error}` }
      return {
        narrative: `Found results for "${query}".`,
        summary: data.summary?.slice(0, 500),
        sources: data.sources,
        instruction: "Summarize the key findings concisely. Mention 2-3 most relevant sources.",
      }
    }
    case "read_page": {
      const url = String(fc.args?.url || "")
      const res = await fetch(`${BASE}/api/computer/fetch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) })
      const data = await res.json()
      if (data.error) return { narrative: `Failed to read ${url}: ${data.error}` }
      return {
        narrative: `Read "${data.title || url}".`,
        title: data.title,
        text: data.text?.slice(0, 1000),
        instruction: "Summarize the page content concisely.",
      }
    }
    case "analyze_photo": {
      const path = String(fc.args?.image_path || "")
      const prompt = String(fc.args?.prompt || "Describe what you see.")
      const res = await fetch(`${BASE}/api/computer/analyze-image`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_path: path, prompt }) })
      const data = await res.json()
      if (data.error) return { narrative: `Image analysis failed: ${data.error}` }
      return { narrative: data.analysis || "Analysis complete.", analysis: data.analysis }
    }
    case "take_and_analyze_photo": {
      const camera = String(fc.args?.camera || "back") === "front" ? 1 : 0
      const prompt = String(fc.args?.prompt || "Describe what you see in detail.")
      // Take photo via termux
      const photoRes = await fetch(`${BASE}/api/termux/camera/photo?camera_id=${camera}`, { method: "POST" })
      const photoData = await photoRes.json()
      if (!photoData.path) return { narrative: "Failed to take photo." }
      // Analyze with Gemini Vision
      const analyzeRes = await fetch(`${BASE}/api/computer/analyze-image`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_path: photoData.path, prompt }) })
      const analysis = await analyzeRes.json()
      return { narrative: analysis.analysis || "Photo analyzed.", analysis: analysis.analysis, photo_path: photoData.path }
    }
    case "self_test_game": {
      const res = await fetch(`${BASE}/api/computer/self-test`)
      const data = await res.json()
      return {
        narrative: `Self-test complete: ${data.summary}. ${data.all_passed ? "All systems operational." : "Issues found."}`,
        ...data,
        instruction: data.all_passed ? "Confirm all tests passed." : "Explain which tests failed and suggest fixes.",
      }
    }
    case "summarize_url": {
      const url = String(fc.args?.url || "")
      const res = await fetch(`${BASE}/api/computer/fetch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) })
      const data = await res.json()
      if (data.error) return { narrative: `Failed: ${data.error}` }
      return {
        narrative: `Summarizing "${data.title || url}"...`,
        title: data.title,
        text: data.text?.slice(0, 2000),
        instruction: "Provide a concise 3-5 sentence summary of this page content.",
      }
    }
    case "research_topic": {
      const topic = String(fc.args?.topic || "")
      // Step 1: Search
      const searchRes = await fetch(`${BASE}/api/computer/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: topic, num_results: 3 }) })
      const searchData = await searchRes.json()
      // Step 2: Read top sources
      const readings = []
      for (const src of (searchData.sources || []).slice(0, 3)) {
        try {
          const pageRes = await fetch(`${BASE}/api/computer/fetch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: src.url, timeout: 8 }) })
          const page = await pageRes.json()
          if (page.text) readings.push({ title: page.title || src.title, text: page.text.slice(0, 500) })
        } catch { /* skip failed pages */ }
      }
      return {
        narrative: `Researched "${topic}". Read ${readings.length} sources.`,
        search_summary: searchData.summary?.slice(0, 500),
        sources: searchData.sources,
        readings,
        instruction: "Synthesize the findings from all sources into a comprehensive but concise answer. Cite the sources.",
      }
    }

    default:
      return null
  }
}

// ── Create SU persona ──
export function createSUPersona(): PersonaConfig {
  return {
    id: "aria-su",
    name: "Aria (Super User)",
    systemPrompt: buildSUPrompt,
    functions: SU_FUNCTIONS,
    voice: "Kore",
    onFunctionCall: handleSUFunctionCall,
    mode: "su",
  }
}

/** Check if SU mode is enabled (dev-only flag) */
export function isSUEnabled(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem("aria_su_enabled") === "true"
}

/** Enable/disable SU mode */
export function setSUEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  if (enabled) localStorage.setItem("aria_su_enabled", "true")
  else localStorage.removeItem("aria_su_enabled")
}
