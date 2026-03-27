"use client"

import { useProductsStore } from "@/store/products"
import { useCartStore } from "@/store/cart"

export function ProductDetail() {
  const { selectedProduct: p, clearSelection } = useProductsStore()
  const { addItem } = useCartStore()

  if (!p) return null

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      {/* Back button */}
      <button onClick={clearSelection} className="text-xs text-white/40 hover:text-white/60 transition">
        ← Back to products
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image */}
        <div className="aspect-square bg-white/5 rounded-xl overflow-hidden">
          {p.image ? (
            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-gold/20">{p.name[0]}</div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <span className="text-[10px] tracking-widest uppercase text-gold/60">{p.category}</span>
            <h1 className="text-2xl font-semibold text-white mt-1">{p.name}</h1>
            <p className="text-xl font-bold text-gold mt-2">${p.price}</p>
          </div>

          <p className="text-sm text-white/50 leading-relaxed">{p.description}</p>

          {/* Stock */}
          {p.stock <= 5 && p.stock > 0 && (
            <p className="text-xs text-red-400">Only {p.stock} left in stock</p>
          )}

          {/* Add to Cart */}
          <button
            onClick={() => addItem({ id: p.id, name: p.name, price: p.price, image: p.image })}
            className="w-full py-3 bg-gold text-black font-semibold rounded-lg hover:bg-gold-light transition"
          >
            Add to Cart
          </button>

          {/* Materials */}
          {p.materials && p.materials.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-2">Materials</h3>
              <div className="flex flex-wrap gap-2">
                {p.materials.map((m) => (
                  <span key={m.id} className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Care */}
          {p.care && p.care.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-2">Care Instructions</h3>
              {p.care.map((c) => (
                <p key={c.id} className="text-xs text-white/40">{c.name}: {c.description}</p>
              ))}
            </div>
          )}

          {/* Pairs with */}
          {p.pairs_with && p.pairs_with.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-2">Pairs Well With</h3>
              <div className="flex flex-wrap gap-2">
                {p.pairs_with.map((pw) => (
                  <span key={pw.id} className="text-xs px-2.5 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
                    {pw.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
