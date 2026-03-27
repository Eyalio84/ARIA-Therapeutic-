/**
 * MemoryParser — TypeScript port of Python memory_parser.py.
 *
 * Parses markdown content into indexable MemoryChunk objects.
 * Splits at ## and ### headings. Skips content inside fenced code blocks.
 *
 * Key change from Python: operates on string content (not file paths).
 * Host apps provide markdown content strings; this module is browser-compatible.
 *
 * Adapted from NLKE/agents/shared/retrieval/memory_parser.py
 */

import type { MemoryChunk } from "../types/knowledge"

const HEADING_RE = /^(#{2,3})\s+(.+)$/

/** Parse a single markdown content string into MemoryChunk objects */
export function parseMarkdownContent(
  content: string,
  sourceFile = "memory",
  directory = "",
): MemoryChunk[] {
  const lines = content.split("\n")
  const chunks: MemoryChunk[] = []

  let currentName = ""
  let currentLevel = 0
  let currentBody: string[] = []
  let currentLine = 1
  let insideCodeBlock = false
  let preambleTitle = sourceFile

  function flushSection(): void {
    const body = currentBody.join("\n").trim()
    if (!currentName && !body) return

    const name = currentName || preambleTitle
    const level = currentLevel || 1
    const prefix = "#".repeat(level)
    const nodeId = `${sourceFile}::${prefix} ${name}`
    chunks.push({
      nodeId,
      name,
      description: body,
      nodeType: "memory_chunk",
      intentKeywords: "",
      sourceFile,
      directory,
      headingLevel: level,
      lineNumber: currentLine,
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Track fenced code blocks to avoid false heading splits
    if (line.trim().startsWith("```")) {
      insideCodeBlock = !insideCodeBlock
      currentBody.push(line)
      continue
    }

    if (insideCodeBlock) {
      currentBody.push(line)
      continue
    }

    // Check for ## or ### heading (split points)
    const m = HEADING_RE.exec(line)
    if (m) {
      flushSection()
      currentName = m[2].trim()
      currentLevel = m[1].length
      currentBody = []
      currentLine = i + 1
      continue
    }

    // H1 title (# Title) — use as preamble name, not a split point
    if (line.startsWith("# ") && !line.startsWith("##") && chunks.length === 0 && !currentName) {
      preambleTitle = line.slice(2).trim()
      currentBody.push(line)
      continue
    }

    currentBody.push(line)
  }

  flushSection()
  return chunks
}

/** Parse multiple markdown files provided as {sourceFile: content} map */
export function parseMarkdownSections(
  files: Record<string, string>,
  directory = "",
): MemoryChunk[] {
  const allChunks: MemoryChunk[] = []
  for (const [sourceFile, content] of Object.entries(files)) {
    allChunks.push(...parseMarkdownContent(content, sourceFile, directory))
  }
  return allChunks
}
