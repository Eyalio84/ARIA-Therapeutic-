"use client"

import { create } from "zustand"

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  image: string
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  giftNote: string

  addItem: (product: { id: string; name: string; price: number; image: string }) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  toggleCart: () => void
  setGiftNote: (note: string) => void
  clearCart: () => void

  subtotal: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  giftNote: "",

  addItem: (product) => {
    const existing = get().items.find((i) => i.productId === product.id)
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      })
    } else {
      set({
        items: [...get().items, { productId: product.id, name: product.name, price: product.price, quantity: 1, image: product.image }],
        isOpen: true,
      })
    }
  },

  removeItem: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),

  updateQuantity: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId)
    } else {
      set({ items: get().items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)) })
    }
  },

  toggleCart: () => set({ isOpen: !get().isOpen }),
  setGiftNote: (note) => set({ giftNote: note }),
  clearCart: () => set({ items: [], giftNote: "" }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
