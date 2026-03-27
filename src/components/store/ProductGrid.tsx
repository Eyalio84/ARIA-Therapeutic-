"use client"

import { useEffect } from "react"
import { useProductsStore } from "@/store/products"
import { ProductCard } from "./ProductCard"

export function ProductGrid() {
  const { products, isLoading, fetchProducts, fetchProduct } = useProductsStore()

  useEffect(() => {
    if (products.length === 0) fetchProducts()
  }, [products.length, fetchProducts])

  if (isLoading && products.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-white/3 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onClick={() => fetchProduct(p.id)} />
      ))}
    </div>
  )
}
