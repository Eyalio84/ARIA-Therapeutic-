/**
 * Training Data Logger — auto-captures voice→function pairs in FunctionGemma format.
 *
 * Every successful Aria function call is logged as a JSONL training example.
 * Stored in localStorage, exportable as .jsonl file for fine-tuning.
 */

export interface TrainingExample {
  id: string
  timestamp: string
  userUtterance: string
  functionName: string
  functionArgs: Record<string, any>
  result: string
}

const STORAGE_KEY = "aria-lab-training-data"
const MAX_EXAMPLES = 500

class TrainingLogger {
  private examples: TrainingExample[] = []

  constructor() {
    this.load()
  }

  private load() {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) this.examples = JSON.parse(raw)
    } catch {}
  }

  private save() {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.examples))
    } catch {}
  }

  /** Log a voice→function pair */
  capture(userUtterance: string, functionName: string, functionArgs: Record<string, any>, result: string) {
    if (!userUtterance || !functionName) return

    const example: TrainingExample = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userUtterance: userUtterance.trim(),
      functionName,
      functionArgs,
      result,
    }

    this.examples.push(example)
    if (this.examples.length > MAX_EXAMPLES) this.examples = this.examples.slice(-MAX_EXAMPLES)
    this.save()
  }

  /** Get all captured examples */
  getAll(): TrainingExample[] {
    return [...this.examples]
  }

  /** Get count */
  count(): number {
    return this.examples.length
  }

  /** Clear all examples */
  clear() {
    this.examples = []
    this.save()
  }

  /** Export as FunctionGemma JSONL format */
  exportFunctionGemmaJSONL(functionDeclarations: { name: string; description: string; parameters: any }[]): string {
    const lines: string[] = []

    // Build declarations string
    const declStrings = functionDeclarations.map((f) => {
      const params = Object.entries(f.parameters?.properties || {})
        .map(([k, v]: [string, any]) => `${k}:{type:${(v.type || "STRING").toUpperCase()}}`)
        .join(",")
      return `<start_function_declaration>declaration:${f.name}{description:<escape>${f.description}<escape>,parameters:{${params}}}<end_function_declaration>`
    }).join("\n")

    for (const ex of this.examples) {
      // Build function call string
      const argStrings = Object.entries(ex.functionArgs)
        .map(([k, v]) => {
          if (typeof v === "string") return `${k}:<escape>${v}<escape>`
          return `${k}:${v}`
        })
        .join(",")

      const text = [
        `<start_of_turn>developer`,
        `You can call the following functions:`,
        declStrings,
        `<end_of_turn>`,
        `<start_of_turn>user`,
        ex.userUtterance,
        `<end_of_turn>`,
        `<start_of_turn>model`,
        `<start_function_call>call:${ex.functionName}{${argStrings}}<end_function_call>`,
        `<end_of_turn>`,
      ].join("\n")

      lines.push(JSON.stringify({ text }))
    }

    return lines.join("\n")
  }

  /** Export as simple JSONL (for review/debugging) */
  exportSimpleJSONL(): string {
    return this.examples.map((ex) => JSON.stringify(ex)).join("\n")
  }

  /** Download as file */
  download(functionDeclarations: any[], format: "functiongemma" | "simple" = "functiongemma") {
    const content = format === "functiongemma"
      ? this.exportFunctionGemmaJSONL(functionDeclarations)
      : this.exportSimpleJSONL()

    const blob = new Blob([content], { type: "application/jsonl" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `su-lab-training-${format}-${Date.now()}.jsonl`
    a.click()
    URL.revokeObjectURL(url)
  }
}

// Singleton
export const trainingLogger = typeof window !== "undefined" ? new TrainingLogger() : null
