"use client"

/**
 * AriaCore — the orchestrator.
 *
 * Wires all aria-core pieces into a single runnable object:
 *   provider   — AI backend (Gemini Live, future: OpenAI Realtime)
 *   registry   — command handlers registered by host app
 *   engine     — context definitions + system prompt builder
 *   router     — dispatches FunctionCall events to handlers
 *   stores     — session + report pad (Zustand)
 *
 * Usage (StoreKit example):
 *   const aria = new AriaCore({
 *     provider: new GeminiLiveProvider({ apiKey }),
 *     persona: storekitPersona,
 *     contexts: [platformContext, memberContext],
 *     initialContext: "platform",
 *     onUICommand: (cmd) => dispatchToNextRouter(cmd),
 *     onAudio: (pcm) => playbackScheduler.scheduleChunk(pcm),
 *   })
 *   registerStorekitCommands(aria.commandRegistry)
 *   await aria.connect()
 *
 * Dependency rule: this file imports from aria-core/* only. No @/ imports.
 */

import type { AriaProvider, AriaProviderConfig, FunctionCall, ProviderEvent } from "./types/provider"
import type { PersonaConfig } from "./types/persona"
import type { ContextDefinition } from "./types/context"
import type { CommandContext, UICommand } from "./types/command"
import type { AriaStatus } from "./types/state"
import { CommandRegistry } from "./commands/commandRegistry"
import { CommandRouter }   from "./commands/commandRouter"
import { ContextEngine }   from "./context/contextEngine"
import { createBuiltinCommands } from "./commands/builtinCommands"
import { useAriaSession }  from "./state/sessionStore"
import { useReportPad }    from "./state/reportPadStore"
import type { EntryType }  from "./state/reportPadStore"

// ── Config ───────────────────────────────────────────────────────────────────

export interface ReportPadAdapter {
  addEntry: (text: string, type: string) => void
  clearEntries: () => void
  getEntries: () => Array<{ timestamp: string; type: string; text: string }>
}

export interface AriaCoreConfig {
  /** The AI provider — constructed with its backend credentials */
  provider: AriaProvider
  /** Persona: voice, personality, changelog */
  persona: PersonaConfig
  /** Context definitions to register (platform / template / member / custom) */
  contexts: ContextDefinition[]
  /** Which context to activate on connect. Defaults to first context. */
  initialContext?: string

  // ── Host app callbacks ────────────────────────────────────────────────────

  /**
   * Handle UI dispatch commands (navigate, scroll, add_to_cart, etc.).
   * In StoreKit this calls router.push / window.scrollTo / Zustand dispatch.
   */
  onUICommand?: (command: UICommand) => void

  /**
   * Receive raw audio chunks from the provider for playback.
   * In StoreKit this calls PlaybackScheduler.scheduleChunk(base64).
   */
  onAudio?: (base64Pcm: string) => void

  /**
   * Transcript updates — "user" for speech-to-text, "aria" for Aria's response.
   * Drive any transcript UI from here.
   */
  onTranscript?: (type: "user" | "aria", text: string) => void

  /**
   * Called when Aria's status changes (idle/connecting/listening/thinking/speaking).
   * Drive status indicators, orb animations, etc.
   */
  onStatusChange?: (status: AriaStatus) => void

  /** Error handler — provider errors, command handler throws, etc. */
  onError?: (source: string, error: unknown) => void

  // ── Optional integration overrides ───────────────────────────────────────

  /**
   * Override the report pad target for write_to_report / summarize_session.
   * Defaults to aria-core's built-in useReportPad Zustand store.
   * Pass a custom adapter if the host app manages its own report pad.
   */
  reportPad?: ReportPadAdapter

  /**
   * Persist a user memory key-value pair across sessions.
   * Wires the save_memory Aria command to the host app's storage layer.
   * In StoreKit this calls POST /api/aria/memory.
   */
  onSaveMemory?: (key: string, value: string) => Promise<void>
}

// ── AriaCore ─────────────────────────────────────────────────────────────────

export class AriaCore {
  /**
   * Host app registers all command handlers here before calling connect().
   * e.g. registerStorekitCommands(aria.commandRegistry)
   */
  readonly commandRegistry: CommandRegistry

  /**
   * Host app can add extra contexts or global injectors after construction.
   * e.g. aria.contextEngine.addGlobalInjector(canvasInjector)
   */
  readonly contextEngine: ContextEngine

  private readonly _provider: AriaProvider
  private readonly _persona: PersonaConfig
  private readonly _router: CommandRouter
  private readonly _config: AriaCoreConfig

  private _currentPage = "/"
  private _hostState: Record<string, unknown> = {}
  private _unsubProvider: (() => void) | null = null

  constructor(config: AriaCoreConfig) {
    this._config  = config
    this._provider = config.provider
    this._persona  = config.persona

    // ── Command registry + builtins ──────────────────────────────────────
    this.commandRegistry = new CommandRegistry()
    this._registerBuiltins()

    // ── Context engine ────────────────────────────────────────────────────
    this.contextEngine = new ContextEngine()
    for (const ctx of config.contexts) this.contextEngine.register(ctx)
    const startContext = config.initialContext ?? config.contexts[0]?.id
    if (startContext) this.contextEngine.setActive(startContext)

    // ── Command router ────────────────────────────────────────────────────
    this._router = new CommandRouter(this.commandRegistry, {
      sendFunctionResponse: (id, name, result) =>
        this._provider.sendFunctionResponse(id, name, result),
      dispatchUI: (cmd) =>
        config.onUICommand?.(cmd as UICommand),
      onError: (name, err) =>
        config.onError?.(name, err),
    })
  }

  // ── Connection lifecycle ──────────────────────────────────────────────────

  /**
   * Connect to the AI provider.
   * Builds the system prompt from the active context + persona, then opens
   * the WebSocket (or HTTP connection, depending on provider).
   * Safe to call again — disconnects existing session first.
   */
  async connect(): Promise<void> {
    // Unsubscribe previous event listener before reconnecting
    this._unsubProvider?.()
    this._unsubProvider = this._provider.onEvent((ev) => this._handleEvent(ev))

    const session = useAriaSession.getState()
    session.setStatus("connecting")
    session.setCurrentContext(this.contextEngine.activeContextId)
    session.setCurrentPage(this._currentPage)

    await this._provider.connect(this._buildProviderConfig())
  }

  /**
   * Disconnect from the AI provider and reset session state.
   */
  disconnect(): void {
    this._provider.disconnect()
    this._unsubProvider?.()
    this._unsubProvider = null
    const session = useAriaSession.getState()
    session.setConnected(false)
    session.setStatus("idle")
  }

  /**
   * Switch active context and reconnect with a new system prompt + function set.
   * Aria's "personality" and available commands both change.
   *
   * e.g. aria.switchContext("member") — full owner assistant mode
   *      aria.switchContext("platform") — homepage visitor mode
   */
  async switchContext(contextId: string): Promise<void> {
    this._provider.disconnect()
    this.contextEngine.setActive(contextId)
    useAriaSession.getState().setCurrentContext(contextId)
    await this.connect()
  }

  // ── Audio + text ──────────────────────────────────────────────────────────

  /** Send a raw PCM audio chunk (base64-encoded) to the provider. */
  sendAudio(base64Pcm: string): void {
    this._provider.sendAudio(base64Pcm)
  }

  /** Send a text message directly to the provider (programmatic input). */
  sendText(text: string): void {
    this._provider.sendText(text)
  }

  // ── Page context injection ────────────────────────────────────────────────

  /**
   * Notify Aria of a page navigation.
   * Updates the current page for CommandContext and tells the provider
   * where the user is — Aria can reference it in responses.
   *
   * Call this from your router's navigation event:
   *   router.on("routeChange", (url) => aria.injectPageContext(url))
   */
  injectPageContext(pathname: string): void {
    this._currentPage = pathname
    useAriaSession.getState().setCurrentPage(pathname)
    if (this._provider.isConnected) {
      this._provider.sendPageContext(pathname)
    }
  }

  // ── Host state ────────────────────────────────────────────────────────────

  /**
   * Merge arbitrary state into the CommandContext.hostState object.
   * Handlers receive this at execution time.
   *
   * e.g. aria.setHostState({ themeId: "jewelry", pageId: "abc123" })
   *
   * This is also available to ContextInjectors registered on the contextEngine,
   * allowing dynamic system prompt enrichment (canvas description, component list, etc.)
   */
  setHostState(state: Record<string, unknown>): void {
    this._hostState = { ...this._hostState, ...state }
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private _buildProviderConfig(): AriaProviderConfig {
    return {
      apiKey: "",  // credential lives inside the provider constructor (e.g. GeminiLiveProvider._apiKey)
      systemPrompt: this.contextEngine.buildSystemPrompt(this._persona, this._hostState),
      functions: this.contextEngine.getActiveFunctions(),
      voice: this._persona.voice.name,
      sampleRate: this._persona.voice.sampleRate,
    }
  }

  private _handleEvent(event: ProviderEvent): void {
    const session = useAriaSession.getState()

    switch (event.type) {
      case "ready":
        session.setConnected(true)
        session.setStatus("listening")
        this._config.onStatusChange?.("listening")
        break

      case "audio":
        session.setStatus("speaking")
        this._config.onAudio?.(event.data)
        this._config.onStatusChange?.("speaking")
        break

      case "text":
        session.setAriaTranscript(event.text)
        this._config.onTranscript?.("aria", event.text)
        break

      case "inputTranscription":
        session.setUserTranscript(event.text)
        session.setStatus("thinking")
        this._config.onTranscript?.("user", event.text)
        this._config.onStatusChange?.("thinking")
        break

      case "toolCall":
        session.setStatus("thinking")
        void this._routeCalls(event.calls)
        break

      case "error":
        this._config.onError?.("provider", event.message)
        break

      case "disconnected":
        session.setConnected(false)
        session.setStatus("idle")
        this._config.onStatusChange?.("idle")
        break
    }
  }

  private async _routeCalls(calls: FunctionCall[]): Promise<void> {
    const ctx: Omit<CommandContext, "dispatchUI"> = {
      contextId: this.contextEngine.activeContextId,
      currentPage: this._currentPage,
      hostState: this._hostState,
    }
    await this._router.routeAll(calls, ctx)

    // Return to listening state after all tool calls complete
    if (this._provider.isConnected) {
      useAriaSession.getState().setStatus("listening")
      this._config.onStatusChange?.("listening")
    }
  }

  private _registerBuiltins(): void {
    // Use host-provided report pad adapter, or wrap the built-in store
    const pad: ReportPadAdapter = this._config.reportPad ?? {
      addEntry: (text, type) =>
        useReportPad.getState().addEntry(text, type as EntryType),
      clearEntries: () =>
        useReportPad.getState().clearAll(),
      getEntries: () =>
        useReportPad.getState().entries,
    }

    const builtins = createBuiltinCommands(
      this._persona.changelog,
      pad.getEntries,
      pad.addEntry,
      pad.clearEntries,
      this._config.onSaveMemory,
    )
    this.commandRegistry.registerAll(builtins)
  }
}
