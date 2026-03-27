"use client"

import { create } from "zustand"

const BACKEND = process.env.NEXT_PUBLIC_ARIA_BACKEND ?? "http://localhost:8000"

// Hardcoded image URLs from themes/jewelry.ts (KG doesn't store images)
const PRODUCT_IMAGES: Record<string, string> = {
  "gold-bracelet-set": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80",
  "pearl-drop-earrings": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
  "sapphire-statement-ring": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80",
  "diamond-solitaire-pendant": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80",
  "rose-gold-chain-necklace": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80",
  "emerald-stud-earrings": "https://images.pexels.com/photos/29193422/pexels-photo-29193422.jpeg?auto=compress&cs=tinysrgb&w=800",
  "vintage-gold-brooch": "https://images.pexels.com/photos/7528932/pexels-photo-7528932.jpeg?auto=compress&cs=tinysrgb&w=800",
  "sterling-silver-cuff": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  stock: number
  category: string
  image: string
  // Enriched fields (from /api/products/{id})
  materials?: Array<{ id: string; name: string; description: string }>
  care?: Array<{ id: string; name: string; description: string }>
  pairs_with?: Array<{ id: string; name: string; description: string }>
  recommended_for?: Array<{ id: string; name: string }>
}

interface ProductsStore {
  products: Product[]
  selectedProduct: Product | null
  isLoading: boolean
  category: string | null

  fetchProducts: (category?: string) => Promise<void>
  fetchProduct: (id: string) => Promise<void>
  setCategory: (cat: string | null) => void
  clearSelection: () => void
}

export const useProductsStore = create<ProductsStore>((set) => ({
  products: [],
  selectedProduct: null,
  isLoading: false,
  category: null,

  fetchProducts: async (category) => {
    set({ isLoading: true })
    try {
      const url = category ? `${BACKEND}/api/products?category=${category}` : `${BACKEND}/api/products`
      const res = await fetch(url)
      const data = await res.json()
      const products = (data.products ?? []).map((p: Product) => ({
        ...p,
        image: PRODUCT_IMAGES[p.id] ?? "",
      }))
      set({ products, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchProduct: async (id) => {
    set({ isLoading: true })
    try {
      const res = await fetch(`${BACKEND}/api/products/${id}`)
      const data = await res.json()
      data.image = PRODUCT_IMAGES[data.id] ?? ""
      set({ selectedProduct: data, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  setCategory: (cat) => set({ category: cat }),
  clearSelection: () => set({ selectedProduct: null }),
}))
