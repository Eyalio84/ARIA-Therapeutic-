/**
 * RingBufferLogger — provider-agnostic DevHub logger.
 *
 * Generic version of lib/devLogger.ts — the LogSource type is a string,
 * not a fixed union. Host apps provide their own source names.
 *
 * Ring buffer: O(1) writes at all times. Max 500 entries.
 * Pub/sub: subscribers notified on every write.
 * No-op in production (controlled by isDev flag).
 */

export interface LogSourceConfig {
  name: string
  color?: string
}

export interface GenericLogEntry {
  id: string
  timestamp: number
  source: string
  level: "debug" | "info" | "warn" | "error" | "system"
  component: string
  message: string
  data?: unknown
  duration?: number
}

const MAX_ENTRIES = 500

export class RingBufferLogger {
  private _entries: GenericLogEntry[] = []
  private _counter = 0
  private _listeners = new Set<() => void>()
  private _isDev: boolean

  constructor(isDev = process.env.NODE_ENV === "development") {
    this._isDev = isDev
  }

  log(
    source: string,
    level: GenericLogEntry["level"],
    component: string,
    message: string,
    data?: unknown,
    duration?: number,
  ): void {
    if (!this._isDev) return

    const entry: GenericLogEntry = {
      id: `${Date.now()}-${this._counter++}`,
      timestamp: Date.now(),
      source,
      level,
      component,
      message,
      data,
      duration,
    }

    // Ring buffer — discard oldest when full
    if (this._entries.length >= MAX_ENTRIES) {
      this._entries = this._entries.slice(-MAX_ENTRIES + 1)
    }
    this._entries.push(entry)
    this._notify()
  }

  getAll(): GenericLogEntry[] { return this._entries }

  getBySource(source: string): GenericLogEntry[] {
    return this._entries.filter((e) => e.source === source)
  }

  getByLevel(level: GenericLogEntry["level"]): GenericLogEntry[] {
    return this._entries.filter((e) => e.level === level)
  }

  clear(): void {
    this._entries = []
    this._notify()
  }

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  private _notify(): void {
    for (const fn of this._listeners) {
      try { fn() } catch { /* listener errors must not crash logger */ }
    }
  }

  get entryCount(): number { return this._entries.length }
}
