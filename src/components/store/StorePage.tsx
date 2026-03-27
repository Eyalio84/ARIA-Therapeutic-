"use client"

import { useProductsStore } from "@/store/products"
import { StoreHeader } from "./StoreHeader"
import { ProductGrid } from "./ProductGrid"
import { ProductDetail } from "./ProductDetail"
import { Cart } from "./Cart"
import { JarvisOrb } from "./JarvisOrb"

export function StorePage() {
  const selectedProduct = useProductsStore((s) => s.selectedProduct)

  return (
    <div className="h-full flex flex-col relative">
      <StoreHeader />
      <div className="flex-1 overflow-y-auto">
        {selectedProduct ? <ProductDetail /> : <ProductGrid />}
      </div>
      <Cart />
      <JarvisOrb />
    </div>
  )
}
