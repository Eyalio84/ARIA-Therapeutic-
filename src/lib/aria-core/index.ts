/**
 * aria-core — provider-agnostic Aria framework
 *
 * Public API. Host apps import from here.
 * This module NEVER imports from @/ — it is StoreKit-independent.
 *
 * Architecture:
 *   types/     — contracts (provider, command, persona, context, knowledge, state, audio)
 *   providers/ — swappable AI backends (GeminiLive, future: OpenAI Realtime)
 *   context/   — dynamic system prompt assembly
 *   commands/  — pluggable command registry + router
 *   knowledge/ — NLKE TypeScript port (BM25, hash embeddings, graph scoring, fusion)
 *   persona/   — persona-as-data (config files, not hardcoded strings)
 *   audio/     — PCM helpers, mic capture, playback scheduler
 *   state/     — Zustand stores (session, suggestion, report pad)
 *   devhub/    — ring buffer logger, command audit trail
 */

// ── Types ─────────────────────────────────────────────────────────────────
export type {
  AriaProvider,
  AriaProviderConfig,
  FunctionDeclaration,
  FunctionParameters,
  FunctionParameterProperty,
  FunctionCall,
  ProviderEvent,
  ProviderEventHandler,
  CommandHandler,
  CommandContext,
  CommandResult,
  CommandResultType,
  UICommand,
  PersonaConfig,
  VoiceConfig,
  ResponseStyle,
  ChangelogEntry,
  GreetingMap,
  SilenceLevel,
  ContextDefinition,
  ContextInjector,
  KnowledgeNode,
  KnowledgeEdge,
  RetrievalResult,
  RetrievalConfig,
  MemoryChunk,
  KnowledgeSource,
  AriaStatus,
  AriaSessionState,
  AudioConfig,
  AudioConstraints,
} from "./types/index"
export { ARIA_TRANSITIONS, DEFAULT_AUDIO_CONFIG } from "./types/index"

// ── Audio ─────────────────────────────────────────────────────────────────
export { floatTo16BitPCM, toBase64, fromBase64, encodeAudioChunk, decodeAudioChunk } from "./audio/pcmHelpers"
export { PlaybackScheduler } from "./audio/playbackScheduler"
export type { PlaybackCallbacks } from "./audio/playbackScheduler"
export { MicCapture } from "./audio/micCapture"
export type { AudioChunkHandler } from "./audio/micCapture"

// ── State Machine ──────────────────────────────────────────────────────────
export { canTransition, transition, validNextStates, isActive, isListening } from "./state/ariaStateMachine"

// ── Providers ─────────────────────────────────────────────────────────────
export { BaseProvider } from "./providers/base"
export { GeminiLiveProvider } from "./providers/geminiLive"
export type { GeminiLiveConfig } from "./providers/geminiLive"

// ── Context Engine ─────────────────────────────────────────────────────────
export { ContextEngine } from "./context/contextEngine"
export { PromptBuilder } from "./context/promptBuilder"

// ── Persona ────────────────────────────────────────────────────────────────
export { loadPersona, mergePersonaOverrides } from "./persona/personaLoader"
export { personaSchema } from "./persona/personaSchema"

// ── Commands ───────────────────────────────────────────────────────────────
export { CommandRegistry } from "./commands/commandRegistry"
export { CommandRouter } from "./commands/commandRouter"
export { BUILTIN_COMMANDS } from "./commands/builtinCommands"

// ── Knowledge (NLKE) ──────────────────────────────────────────────────────
export { defaultRetrievalConfig } from "./knowledge/config"
export { tokenizeAndFilter } from "./knowledge/tokenizer"
export { BM25Index } from "./knowledge/bm25"
export { HashEmbedder } from "./knowledge/hashEmbedder"
export { GraphScorer } from "./knowledge/graphScorer"
export { QueryIntent } from "./knowledge/weightProfiles"
export type { WeightProfile } from "./knowledge/weightProfiles"
export { getWeights, INTENT_WEIGHTS } from "./knowledge/weightProfiles"
export { IntentRouter } from "./knowledge/intentRouter"
export { QueryCache } from "./knowledge/queryCache"
export type { CacheMetrics } from "./knowledge/queryCache"
export { parseMarkdownContent, parseMarkdownSections } from "./knowledge/memoryParser"
export { MemoryFusion } from "./knowledge/memoryFusion"
export { HybridFusion } from "./knowledge/hybridFusion"

// ── DevHub ─────────────────────────────────────────────────────────────────
export { RingBufferLogger } from "./devhub/logger"
export type { GenericLogEntry, LogSourceConfig } from "./devhub/logger"
export { CommandAuditTrail } from "./devhub/auditTrail"
export type { AuditRecord } from "./devhub/auditTrail"

// ── Stores ─────────────────────────────────────────────────────────────────
export { useAriaSession } from "./state/sessionStore"
export { useAriaSuggestion as useAriaSuggestionCore } from "./state/suggestionStore"
export { useReportPad as useReportPadCore } from "./state/reportPadStore"

// ── Persistence (KG + Session) ─────────────────────────────────────────────
export { KGStore } from "./state/kgStore"
export type { KGAdapter, KGNodeRow, KGEdgeRow } from "./state/kgStore"
export { SqliteSessionStore } from "./state/sqliteSessionStore"
export type { SessionAdapter, MessageRow, SessionRow, MessageRole } from "./state/sqliteSessionStore"

// ── Cartridge ──────────────────────────────────────────────────────────────
export type { AriaPersonaJSON } from "./persona/cartridgeTypes"
export { cartridgeSchema } from "./persona/cartridgeSchema"
export { validateCartridge, personaFromCartridge, enabledTools } from "./persona/cartridgeLoader"

// ── AriaCore (the orchestrator) ────────────────────────────────────────────
export { AriaCore } from "./AriaCore"
export type { AriaCoreConfig, ReportPadAdapter } from "./AriaCore"
