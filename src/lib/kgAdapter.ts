"use client"

/**
 * kgAdapter — SQLite WASM implementation of KGAdapter.
 *
 * Implements the KGAdapter interface from aria-core using the
 * AriaDb singleton from db.ts. The FTS5 virtual table gives us
 * database-level BM25 pre-filtering before NLKE fusion runs.
 */

import type { KGAdapter, KGNodeRow, KGEdgeRow } from "./aria-core/state/kgStore"
import { getDb } from "./db"

export const kgAdapter: KGAdapter = {
  async insertNode(node) {
    const db = await getDb()
    db.run(
      `INSERT OR REPLACE INTO kg_nodes
         (id, type, label, content, embedding, session_id, created_at, updated_at,
          intent_keywords, voice_text, kg_role, source_project)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [node.id, node.type, node.label, node.content,
       node.embedding, node.session_id, node.created_at, node.updated_at,
       node.intent_keywords, node.voice_text, node.kg_role ?? "session", node.source_project],
    )
    // Keep FTS index in sync
    db.run(
      "INSERT OR REPLACE INTO kg_fts (id, label, content) VALUES (?, ?, ?)",
      [node.id, node.label, node.content],
    )
  },

  async insertEdge(edge) {
    const db = await getDb()
    db.run(
      `INSERT OR IGNORE INTO kg_edges (source, target, relation, weight)
       VALUES (?, ?, ?, ?)`,
      [edge.source, edge.target, edge.relation, edge.weight],
    )
  },

  async searchFTS(query, limit) {
    const db = await getDb()
    // FTS5 MATCH with BM25 ranking — returns candidates pre-scored by SQLite
    return db.all<KGNodeRow>(
      `SELECT n.id, n.type, n.label, n.content, n.embedding, n.session_id,
              n.created_at, n.updated_at,
              n.intent_keywords, n.voice_text, n.kg_role, n.source_project
         FROM kg_fts f
         JOIN kg_nodes n ON n.id = f.id
        WHERE kg_fts MATCH ?
        ORDER BY rank
        LIMIT ?`,
      [sanitiseFTSQuery(query), limit],
    )
  },

  async getNeighbors(nodeId) {
    const db = await getDb()
    const rows = db.all<KGEdgeRow & KGNodeRow>(
      `SELECT e.weight,
              n.id, n.type, n.label, n.content, n.embedding,
              n.session_id, n.created_at, n.updated_at,
              n.intent_keywords, n.voice_text, n.kg_role, n.source_project
         FROM kg_edges e
         JOIN kg_nodes n ON n.id = e.target
        WHERE e.source = ?`,
      [nodeId],
    )
    return rows.map((r) => ({
      node:   { id: r.id, type: r.type, label: r.label, content: r.content,
                embedding: r.embedding, session_id: r.session_id,
                created_at: r.created_at, updated_at: r.updated_at,
                intent_keywords: r.intent_keywords, voice_text: r.voice_text,
                kg_role: r.kg_role ?? "session", source_project: r.source_project },
      weight: r.weight,
    }))
  },

  async allNodes() {
    const db = await getDb()
    return db.all<KGNodeRow>(
      `SELECT id, type, label, content, embedding, session_id, created_at, updated_at,
              intent_keywords, voice_text, kg_role, source_project FROM kg_nodes`,
    )
  },

  async deleteSessionNodes(sessionId) {
    const db = await getDb()
    // kg_fts stays in sync because ON DELETE CASCADE removes kg_nodes rows
    db.run("DELETE FROM kg_nodes WHERE session_id = ?", [sessionId])
  },
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * FTS5 MATCH queries fail if the query contains FTS5 operators or special chars.
 * Strip everything except letters, digits, and spaces.
 */
function sanitiseFTSQuery(query: string): string {
  return query.replace(/[^a-zA-Z0-9\s]/g, " ").trim() || '""'
}
