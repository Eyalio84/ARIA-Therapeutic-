"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

interface DocEntry {
  id: string
  path: string
  title: string
  description: string
  exists: boolean
  size_kb: number
}

interface DocCategory {
  category: string
  icon: string
  docs: DocEntry[]
}

interface DocContent {
  id: string
  title: string
  path: string
  content: string
  size_kb: number
  lines: number
}

const ICON_MAP: Record<string, string> = {
  blueprint: "\u{1F3D7}",
  heart: "\u{1F49C}",
  chart: "\u{1F4CA}",
  brain: "\u{1F9E0}",
}

const API = "/api/docs"

// ── Safe Markdown Renderer (React elements, no innerHTML) ──

function MarkdownBlock({ content }: { content: string }) {
  const elements = useMemo(() => {
    const lines = content.split("\n")
    const result: React.ReactNode[] = []
    let inCode = false
    let codeLines: string[] = []
    let tableRows: string[][] = []
    let inTable = false
    let key = 0

    const flushTable = () => {
      if (tableRows.length < 2) { tableRows = []; inTable = false; return }
      const headers = tableRows[0]
      const body = tableRows.slice(2) // skip separator row
      result.push(
        <div key={key++} className="overflow-x-auto my-2">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>{headers.map((h, i) => <th key={i} className="px-2 py-1 text-left text-white/60 font-medium border border-white/5 bg-white/3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="px-2 py-1 text-white/40 border border-white/5">{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableRows = []
      inTable = false
    }

    const renderInline = (text: string): React.ReactNode[] => {
      const parts: React.ReactNode[] = []
      let remaining = text
      let ik = 0
      while (remaining) {
        // Bold
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
        // Code
        const codeMatch = remaining.match(/`([^`]+)`/)

        const firstMatch = [boldMatch, codeMatch]
          .filter(Boolean)
          .sort((a, b) => (a!.index ?? 0) - (b!.index ?? 0))[0]

        if (!firstMatch) {
          parts.push(<span key={ik++}>{remaining}</span>)
          break
        }

        const idx = firstMatch.index ?? 0
        if (idx > 0) parts.push(<span key={ik++}>{remaining.slice(0, idx)}</span>)

        if (firstMatch === boldMatch) {
          parts.push(<strong key={ik++} className="text-white/80">{firstMatch[1]}</strong>)
        } else {
          parts.push(<code key={ik++} className="bg-white/5 px-1 rounded text-[10px] text-emerald-300">{firstMatch![1]}</code>)
        }
        remaining = remaining.slice(idx + firstMatch![0].length)
      }
      return parts
    }

    for (const line of lines) {
      // Code blocks
      if (line.startsWith("```")) {
        if (inCode) {
          result.push(
            <pre key={key++} className="bg-black/30 rounded-lg p-3 overflow-x-auto text-[11px] text-emerald-300 font-mono my-2 border border-white/5">
              <code>{codeLines.join("\n")}</code>
            </pre>
          )
          codeLines = []
        }
        inCode = !inCode
        continue
      }
      if (inCode) { codeLines.push(line); continue }

      // Tables
      if (line.match(/^\|.+\|$/)) {
        if (!inTable) inTable = true
        const cells = line.split("|").filter(Boolean).map((c) => c.trim())
        if (!cells.every((c) => /^[-:]+$/.test(c))) {
          tableRows.push(cells)
        } else {
          tableRows.push(cells) // separator row
        }
        continue
      } else if (inTable) {
        flushTable()
      }

      // Headers
      if (line.startsWith("#### ")) { result.push(<h4 key={key++} className="text-sm font-semibold text-white/90 mt-4 mb-1">{line.slice(5)}</h4>); continue }
      if (line.startsWith("### ")) { result.push(<h3 key={key++} className="text-sm font-semibold text-amber-400/90 mt-5 mb-1">{line.slice(4)}</h3>); continue }
      if (line.startsWith("## ")) { result.push(<h2 key={key++} className="text-base font-bold text-amber-400 mt-6 mb-2 border-b border-white/5 pb-1">{line.slice(3)}</h2>); continue }
      if (line.startsWith("# ")) { result.push(<h1 key={key++} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>); continue }

      // HR
      if (line.trim() === "---") { result.push(<hr key={key++} className="border-white/5 my-4" />); continue }

      // List items
      if (line.match(/^- /)) { result.push(<li key={key++} className="text-[11px] text-white/50 ml-4 list-disc leading-relaxed">{renderInline(line.slice(2))}</li>); continue }
      if (line.match(/^\d+\. /)) { result.push(<li key={key++} className="text-[11px] text-white/50 ml-4 list-decimal leading-relaxed">{renderInline(line.replace(/^\d+\. /, ""))}</li>); continue }

      // Empty line
      if (!line.trim()) { result.push(<div key={key++} className="h-2" />); continue }

      // Paragraph
      result.push(<p key={key++} className="text-[11px] text-white/50 leading-relaxed my-1">{renderInline(line)}</p>)
    }

    if (inTable) flushTable()

    return result
  }, [content])

  return <div>{elements}</div>
}


// ── Main Page ──

export default function DocsPage() {
  const [categories, setCategories] = useState<DocCategory[]>([])
  const [activeDoc, setActiveDoc] = useState<DocContent | null>(null)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState("")

  useEffect(() => {
    fetch(`${API}/list`).then((r) => r.json()).then(setCategories).catch(() => {})
  }, [])

  const openDoc = useCallback(async (id: string) => {
    setLoading(true)
    setEditing(false)
    try {
      const res = await fetch(`${API}/read/${id}`)
      if (res.ok) {
        const doc = await res.json()
        setActiveDoc(doc)
        setEditContent(doc.content)
      }
    } catch {}
    setLoading(false)
  }, [])

  const saveDoc = useCallback(async () => {
    if (!activeDoc) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/write/${activeDoc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      })
      if (res.ok) {
        setActiveDoc({ ...activeDoc, content: editContent, size_kb: Math.round(editContent.length / 1024 * 10) / 10, lines: editContent.split("\n").length })
        setEditing(false)
        setToast("Saved!")
        setTimeout(() => setToast(""), 2000)
      }
    } catch {}
    setSaving(false)
  }, [activeDoc, editContent])

  const loadApiIndex = useCallback(async () => {
    const res = await fetch(`${API}/api-index`)
    if (!res.ok) return
    const data = await res.json()
    const grouped = data.endpoints.reduce((acc: Record<string, any[]>, e: any) => {
      acc[e.module] = acc[e.module] || []
      acc[e.module].push(e)
      return acc
    }, {} as Record<string, any[]>)

    const md = `# API Endpoint Index\n\n**${data.count} endpoints** across ${Object.keys(grouped).length} routers\n\n` +
      Object.entries(grouped).map(([mod, eps]: [string, any]) =>
        `## ${mod}\n\n| Method | Path | Name |\n|--------|------|------|\n` +
        eps.map((e: any) => `| ${e.methods.join(",")} | ${e.path} | ${e.name} |`).join("\n")
      ).join("\n\n")

    setActiveDoc({ id: "__api__", title: "API Endpoint Index", path: "(auto-generated)", content: md, size_kb: 0, lines: 0 })
    setEditing(false)
  }, [])

  // ── Doc list view ──
  if (!activeDoc) {
    return (
      <div className="h-[100dvh] flex flex-col" style={{ background: "#07070f", color: "#e4e4e7" }}>
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <a href="/" className="text-xs text-white/30 hover:text-white/60">{"\u2190"} Home</a>
            <span className="text-sm font-semibold" style={{ color: "#d4a853" }}>Documentation</span>
          </div>
          <span className="text-[10px] text-white/20">{categories.reduce((n, c) => n + c.docs.length, 0)} docs</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {categories.map((cat) => (
            <div key={cat.category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{ICON_MAP[cat.icon] || "\u{1F4C4}"}</span>
                <h2 className="text-xs font-bold tracking-wide text-white/70 uppercase">{cat.category}</h2>
              </div>
              <div className="space-y-1.5">
                {cat.docs.map((doc) => (
                  <button key={doc.id} onClick={() => openDoc(doc.id)} disabled={!doc.exists}
                    className="w-full text-left rounded-xl p-3 transition-all hover:bg-white/[0.03]"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", opacity: doc.exists ? 1 : 0.4 }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-white/80">{doc.title}</span>
                      <span className="text-[9px] text-white/20">{doc.exists ? `${doc.size_kb} KB` : "missing"}</span>
                    </div>
                    <p className="text-[10px] text-white/30 mt-0.5">{doc.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <button onClick={loadApiIndex}
              className="w-full text-left rounded-xl p-3 transition-all hover:bg-white/[0.03]"
              style={{ background: "rgba(167,139,250,0.03)", border: "1px dashed rgba(167,139,250,0.15)" }}>
              <span className="text-[12px] font-medium" style={{ color: "#a78bfa" }}>{"\u{1F50C}"} API Endpoint Index</span>
              <p className="text-[10px] text-white/30 mt-0.5">Auto-generated from backend routers</p>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Doc viewer/editor ──
  return (
    <div className="h-[100dvh] flex flex-col" style={{ background: "#07070f", color: "#e4e4e7" }}>
      <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => setActiveDoc(null)} className="text-xs text-white/30 hover:text-white/60 shrink-0">{"\u2190"} Back</button>
        <span className="text-[11px] font-medium text-white/70 truncate flex-1 text-center">{activeDoc.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          {activeDoc.id !== "__api__" && (
            editing ? (
              <>
                <button onClick={() => setEditing(false)} className="text-[10px] text-white/30 px-2 py-1">Cancel</button>
                <button onClick={saveDoc} disabled={saving}
                  className="text-[10px] font-medium px-3 py-1 rounded-lg"
                  style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                  {saving ? "..." : "Save"}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="text-[10px] font-medium px-3 py-1 rounded-lg"
                style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
                Edit
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-1.5 flex items-center gap-3 text-[9px] text-white/20" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        <span>{activeDoc.path}</span>
        <span>{activeDoc.lines} lines</span>
        <span>{activeDoc.size_kb} KB</span>
      </div>

      {toast && (
        <div className="absolute top-16 right-4 z-50 px-3 py-1.5 rounded-lg text-[11px] font-medium"
          style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
          {toast}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
      ) : editing ? (
        <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
          className="flex-1 p-4 text-[11px] font-mono outline-none resize-none"
          style={{ background: "transparent", color: "#e4e4e7", lineHeight: "1.6" }}
          spellCheck={false} />
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <MarkdownBlock content={activeDoc.content} />
        </div>
      )}
    </div>
  )
}
