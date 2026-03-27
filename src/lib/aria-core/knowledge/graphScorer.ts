/**
 * GraphScorer — TypeScript port of Python graph_scorer.py.
 *
 * Graph proximity scoring using neighbor boosting + BFS path finding.
 * Python defaultdict(set) → Map<string, Set<string>>
 *
 * Key insight: top 1/3 of ranked candidates form the "reference set".
 * Other candidates get boosted if they're adjacent to reference set members.
 *
 * Adapted from NLKE/agents/shared/retrieval/graph_scorer.py
 */

import type { KnowledgeEdge, KnowledgeSource } from "../types/knowledge"
import { EDGE_WEIGHTS } from "./config"

export class GraphScorer {
  // Bidirectional neighbor index: nodeId → Set of neighbor IDs
  private _neighborIds = new Map<string, Set<string>>()
  // Weighted neighbors: nodeId → Set of (neighborId, edgeType, weight)
  private _neighbors = new Map<string, Set<{ id: string; edgeType: string; weight: number }>>()
  private _indexed = false

  /** Build index from a knowledge source */
  buildIndex(source: KnowledgeSource, gamma = 0.15): number {
    this._neighborIds.clear()
    this._neighbors.clear()

    const nodes = source.getNodes()
    let edgeCount = 0

    for (const node of nodes) {
      const edges = source.getEdgesForNode?.(node.nodeId) ?? []
      for (const edge of edges) {
        const weight = (EDGE_WEIGHTS[edge.edgeType] ?? 0.5) * edge.weight
        this._addEdge(edge.sourceId, edge.targetId, edge.edgeType, weight)
        edgeCount++
      }
    }

    this._indexed = true
    return edgeCount
  }

  /** Build index directly from edge arrays (for pre-loaded data) */
  buildIndexFromEdges(edges: KnowledgeEdge[]): number {
    this._neighborIds.clear()
    this._neighbors.clear()

    for (const edge of edges) {
      const weight = (EDGE_WEIGHTS[edge.edgeType] ?? 0.5) * edge.weight
      this._addEdge(edge.sourceId, edge.targetId, edge.edgeType, weight)
    }

    this._indexed = true
    return edges.length
  }

  private _addEdge(src: string, tgt: string, edgeType: string, weight: number): void {
    // Bidirectional
    if (!this._neighborIds.has(src)) this._neighborIds.set(src, new Set())
    if (!this._neighborIds.has(tgt)) this._neighborIds.set(tgt, new Set())
    this._neighborIds.get(src)!.add(tgt)
    this._neighborIds.get(tgt)!.add(src)

    if (!this._neighbors.has(src)) this._neighbors.set(src, new Set())
    if (!this._neighbors.has(tgt)) this._neighbors.set(tgt, new Set())
    this._neighbors.get(src)!.add({ id: tgt, edgeType, weight })
    this._neighbors.get(tgt)!.add({ id: src, edgeType, weight })
  }

  /** Calculate neighbor proximity boost for a node */
  neighborBoost(nodeId: string, topResultIds: Set<string>, gamma = 0.15, maxHits = 3): number {
    const nbrs = this._neighborIds.get(nodeId)
    if (!nbrs) return 0

    let hits = 0
    for (const nbr of nbrs) {
      if (topResultIds.has(nbr)) hits++
    }
    if (hits === 0) return 0
    return gamma * Math.min(hits, maxHits) / maxHits
  }

  /** Score all candidates with neighbor boosting. Top 1/3 form the reference set. */
  scoreResults(candidateIds: string[], gamma = 0.15): Map<string, number> {
    const scores = new Map<string, number>()
    if (candidateIds.length === 0 || !this._indexed) return scores

    const topCount = Math.max(1, Math.floor(candidateIds.length / 3))
    const topSet = new Set(candidateIds.slice(0, topCount))

    for (const id of candidateIds) {
      scores.set(id, this.neighborBoost(id, topSet, gamma))
    }
    return scores
  }

  /** BFS shortest path between two nodes */
  bfsPath(startId: string, endId: string, maxDepth = 4): string[] | null {
    if (startId === endId) return [startId]
    if (!this._neighborIds.has(startId) || !this._neighborIds.has(endId)) return null

    const visited = new Set([startId])
    const queue: Array<[string, string[]]> = [[startId, [startId]]]

    while (queue.length > 0) {
      const [current, path] = queue.shift()!
      if (path.length > maxDepth) break

      for (const neighbor of this._neighborIds.get(current) ?? []) {
        if (neighbor === endId) return [...path, neighbor]
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push([neighbor, [...path, neighbor]])
        }
      }
    }

    return null
  }

  getNeighbors(nodeId: string): Set<string> {
    return this._neighborIds.get(nodeId) ?? new Set()
  }

  get indexedNodes(): number { return this._neighborIds.size }
  get isIndexed(): boolean { return this._indexed }
}
