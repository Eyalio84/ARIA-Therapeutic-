"use client"

import type { Product } from "@/store/products"

interface Props {
  product: Product
  onClick: () => void
}

export function ProductCard({ product, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white/3 rounded-xl border border-white/5 hover:border-gold/20 hover:shadow-lg hover:shadow-gold/5 transition-all overflow-hidden group"
    >
      {/* Image */}
      <div className="aspect-square bg-white/5 overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-gold/30">
            {product.name[0]}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <span className="text-[9px] tracking-widest uppercase text-gold/60">{product.category}</span>
        <h3 className="text-sm font-medium text-white mt-0.5 truncate">{product.name}</h3>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-sm font-semibold text-gold">${product.price}</span>
          {product.stock <= 5 && product.stock > 0 && (
            <span className="text-[9px] text-red-400/70">Only {product.stock} left</span>
          )}
        </div>
      </div>
    </button>
  )
}
