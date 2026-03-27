"use client"

import { create } from "zustand"
import type { Node, Edge } from "@xyflow/react"

const BACKEND = process.env.NEXT_PUBLIC_ARIA_BACKEND ?? "http://localhost:8000"

export const NODE_COLORS: Record<string, string> = {
  product: "#c9a96e",
  material: "#7ec8e3",
  category: "#7ee8a3",
  gift_occasion: "#e87d7d",
  care_instruction: "#b87de8",
  brand_value: "#e8c87d",
  brand_identity: "#e0e0e0",
}

interface KgNodeData extends Record<string, unknown> {
  label: string
  type: string
  description: string
  price?: number
  stock?: number
  category?: string
}

interface KgStore {
  nodes: Node<KgNodeData>[]
  edges: Edge[]
  selectedNode: string | null
  editingNode: KgNodeData & { id?: string } | null
  editingEdge: { source: string; target: string; type: string } | null
  isLoading: boolean
  kgStats: { nodes: number; edges: number; node_types: Record<string, number> } | null

  fetchGraph: () => Promise<void>
  addNode: (data: { name: string; description: string; type: string; price?: number; stock?: number; category?: string }) => Promise<void>
  updateNode: (id: string, data: Record<string, unknown>) => Promise<void>
  deleteNode: (id: string) => Promise<void>
  addEdge: (data: { source: string; target: string; type: string }) => Promise<void>
  deleteEdge: (source: string, target: string, type: string) => Promise<void>
  importGraph: (json: string) => Promise<void>
  exportGraph: () => Promise<string>
  setSelectedNode: (id: string | null) => void
  setEditingNode: (node: KgNodeData & { id?: string } | null) => void
  setEditingEdge: (edge: { source: string; target: string; type: string } | null) => void
}

export const useKgStore = create<KgStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  editingNode: null,
  editingEdge: null,
  isLoading: false,
  kgStats: null,

  fetchGraph: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch(`${BACKEND}/api/kg/graph`)
      const data = await res.json()
      const uniqueEdges = (data.edges ?? []).filter((e: Edge, i: number, arr: Edge[]) => arr.findIndex((x) => x.id === e.id) === i)
      set({ nodes: data.nodes ?? [], edges: uniqueEdges, kgStats: data.stats ?? null, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  addNode: async (data) => {
    try {
      await fetch(`${BACKEND}/api/kg/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      get().fetchGraph()
    } catch { /* */ }
  },

  updateNode: async (id, data) => {
    try {
      await fetch(`${BACKEND}/api/kg/nodes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      get().fetchGraph()
    } catch { /* */ }
  },

  deleteNode: async (id) => {
    try {
      await fetch(`${BACKEND}/api/kg/nodes/${id}`, { method: "DELETE" })
      get().fetchGraph()
    } catch { /* */ }
  },

  addEdge: async (data) => {
    try {
      await fetch(`${BACKEND}/api/kg/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      get().fetchGraph()
    } catch { /* */ }
  },

  deleteEdge: async (source, target, type) => {
    try {
      await fetch(`${BACKEND}/api/kg/edges`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, target, type }),
      })
      get().fetchGraph()
    } catch { /* */ }
  },

  importGraph: async (json) => {
    try {
      await fetch(`${BACKEND}/api/kg/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      })
      get().fetchGraph()
    } catch { /* */ }
  },

  exportGraph: async () => {
    try {
      const res = await fetch(`${BACKEND}/api/kg/export`)
      return await res.text()
    } catch {
      return "{}"
    }
  },

  setSelectedNode: (id) => set({ selectedNode: id }),
  setEditingNode: (node) => set({ editingNode: node }),
  setEditingEdge: (edge) => set({ editingEdge: edge }),
}))
