/**
 * Super User function declarations — Aria as Jarvis.
 * This file is extractable: delete su/ folder to remove SU from the build.
 */

import type { FunctionDeclaration } from "../../aria-core/types/provider"

export const SU_FUNCTIONS: FunctionDeclaration[] = [
  // ── Panel control (5) ──
  { name: "open_devhub", description: "Open the developer hub panel.", parameters: { type: "object", properties: {} } },
  { name: "open_transcript", description: "Open the therapeutic session transcript.", parameters: { type: "object", properties: {} } },
  { name: "open_aria_settings", description: "Open the Aria configuration panel.", parameters: { type: "object", properties: {} } },
  { name: "open_journal", description: "Open the game journal drawer.", parameters: { type: "object", properties: {} } },
  { name: "open_burger_menu", description: "Open the settings menu.", parameters: { type: "object", properties: {} } },

  // ── Configuration (2) ──
  { name: "switch_theme", description: "Switch the visual theme.", parameters: { type: "object", properties: { theme: { type: "string", description: "Theme name: default, maya, ren, or ash" } }, required: ["theme"] } },
  { name: "save_game", description: "Save the current game state.", parameters: { type: "object", properties: {} } },

  // ── Diagnostics (4) ──
  { name: "show_game_state", description: "Show full game state: location, stats, inventory, quest progress, map.", parameters: { type: "object", properties: {} } },
  { name: "show_errors", description: "Show recent errors from the dev log.", parameters: { type: "object", properties: {} } },
  { name: "show_audit_trail", description: "Show recent voice command executions with timing.", parameters: { type: "object", properties: {} } },
  { name: "export_transcript", description: "Export the session transcript as JSON.", parameters: { type: "object", properties: {} } },

  // ── Mode (1) ──
  { name: "switch_to_game", description: "Return to game mode. Aria becomes the storyteller again.", parameters: { type: "object", properties: {} } },

  // ── Device Control (11) — Termux API ──
  { name: "device_status", description: "Get aggregated device status: battery percentage, temperature, RAM, WiFi signal. Tells you the health of the device.", parameters: { type: "object", properties: {} } },
  { name: "battery_check", description: "Get detailed battery info: percentage, health, temperature, charging state, voltage.", parameters: { type: "object", properties: {} } },
  { name: "toggle_torch", description: "Turn the flashlight on or off.", parameters: { type: "object", properties: { on: { type: "boolean", description: "true=on, false=off. Default true." } } } },
  { name: "set_volume", description: "Set device volume for a stream.", parameters: { type: "object", properties: { stream: { type: "string", description: "Stream: music, ring, alarm, notification, system" }, value: { type: "number", description: "Volume level (0-15)" } }, required: ["stream", "value"] } },
  { name: "vibrate", description: "Make the device vibrate.", parameters: { type: "object", properties: { duration_ms: { type: "number", description: "Duration in milliseconds. Default 500." } } } },
  { name: "send_notification", description: "Send an Android notification to the device.", parameters: { type: "object", properties: { title: { type: "string", description: "Notification title" }, content: { type: "string", description: "Notification body text" } }, required: ["title", "content"] } },
  { name: "clipboard_read", description: "Read the current clipboard content.", parameters: { type: "object", properties: {} } },
  { name: "clipboard_write", description: "Copy text to the device clipboard.", parameters: { type: "object", properties: { text: { type: "string", description: "Text to copy" } }, required: ["text"] } },
  { name: "wifi_info", description: "Get current WiFi connection details: SSID, signal strength, IP.", parameters: { type: "object", properties: {} } },
  { name: "location_check", description: "Get current GPS location: coordinates, altitude, accuracy.", parameters: { type: "object", properties: {} } },
  { name: "open_url", description: "Open a URL in the device's default browser.", parameters: { type: "object", properties: { url: { type: "string", description: "URL to open" } }, required: ["url"] } },

  // ── Computer Use (7) — Web interaction + analysis ──
  { name: "web_search", description: "Search the web using Google. Returns summarized results with sources. Use for any research question.", parameters: { type: "object", properties: { query: { type: "string", description: "Search query" } }, required: ["query"] } },
  { name: "read_page", description: "Fetch a URL and extract its text content. Good for reading articles, documentation, product pages.", parameters: { type: "object", properties: { url: { type: "string", description: "URL to read" } }, required: ["url"] } },
  { name: "analyze_photo", description: "Analyze an image file using Gemini Vision. Describe what's in the photo, read text from images, identify objects.", parameters: { type: "object", properties: { image_path: { type: "string", description: "Path to image file" }, prompt: { type: "string", description: "What to look for or analyze" } }, required: ["image_path"] } },
  { name: "take_and_analyze_photo", description: "Take a photo with the device camera and immediately analyze it with Gemini Vision. Great for 'what am I looking at?' questions.", parameters: { type: "object", properties: { camera: { type: "string", description: "front or back camera. Default: back" }, prompt: { type: "string", description: "What to look for" } } } },
  { name: "self_test_game", description: "Run automated tests on the game engine. Checks: health, cartridges, gameplay flow, snapshot. Returns pass/fail report.", parameters: { type: "object", properties: {} } },
  { name: "summarize_url", description: "Fetch a URL, extract text, and ask Gemini to summarize it concisely.", parameters: { type: "object", properties: { url: { type: "string", description: "URL to summarize" } }, required: ["url"] } },
  { name: "research_topic", description: "Deep research: web search + read top 3 results + synthesize findings. For thorough investigation of a topic.", parameters: { type: "object", properties: { topic: { type: "string", description: "Topic to research" } }, required: ["topic"] } },

  // ── Future Phase 3: Physical world bridge ──
  // take_photo, analyze_surroundings, read_light, read_motion, scan_nfc, haptic_pattern
  // Phase 4: read_messages, send_message, missed_calls, set_reminder
]
