"use client"

import { useProductsStore } from "@/store/products"
import { useCartStore } from "@/store/cart"

const CATEGORIES = ["All", "Rings", "Necklaces", "Earrings", "Bracelets", "Pendants", "Brooches"]

export function StoreHeader() {
  const { category, setCategory, fetchProducts } = useProductsStore()
  const { toggleCart, itemCount } = useCartStore()
  const count = itemCount()

  const handleCategory = (cat: string) => {
    const c = cat === "All" ? null : cat
    setCategory(c)
    fetchProducts(c ?? undefined)
  }

  return (
    <div className="flex-shrink-0 border-b border-white/5 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-semibold text-gold tracking-wide">Jewelry Store</h1>
          <p className="text-[10px] tracking-widest uppercase text-white/30">Handcrafted with Intention</p>
        </div>
        <button
          onClick={toggleCart}
          className="relative p-2 rounded-lg hover:bg-white/5 transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/60">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-gold text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategory(cat)}
            className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap transition ${
              (cat === "All" && !category) || category === cat
                ? "bg-gold/20 text-gold border border-gold/30"
                : "text-white/40 hover:text-white/60 border border-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  )
}
