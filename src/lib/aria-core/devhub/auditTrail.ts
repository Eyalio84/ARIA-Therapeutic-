/**
 * CommandAuditTrail — records every command execution with timing.
 *
 * Provides the DevHub "Aria" tab with the full command history:
 * name, args, result type, duration, success/failure.
 *
 * Subscribable — DevHub components call subscribe() once and re-render on update.
 */

export interface AuditRecord {
  id: string
  timestamp: number
  commandName: string
  args: Record<string, unknown>
  contextId: string
  resultType: "silent" | "speak" | "dispatch" | "error"
  durationMs: number
  responseText?: string
  errorMessage?: string
}

const MAX_RECORDS = 200

export class CommandAuditTrail {
  private _records: AuditRecord[] = []
  private _counter = 0
  private _listeners = new Set<() => void>()

  record(entry: Omit<AuditRecord, "id">): void {
    const record: AuditRecord = { ...entry, id: `audit-${this._counter++}` }
    if (this._records.length >= MAX_RECORDS) {
      this._records = this._records.slice(-MAX_RECORDS + 1)
    }
    this._records.push(record)
    this._notify()
  }

  getAll(): AuditRecord[] { return this._records }

  getByCommand(name: string): AuditRecord[] {
    return this._records.filter((r) => r.commandName === name)
  }

  getErrors(): AuditRecord[] {
    return this._records.filter((r) => r.resultType === "error")
  }

  clear(): void {
    this._records = []
    this._notify()
  }

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  private _notify(): void {
    for (const fn of this._listeners) {
      try { fn() } catch { /* never crash the audit trail */ }
    }
  }

  get recordCount(): number { return this._records.length }
}
