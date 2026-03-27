"use client"

import { useCartStore } from "@/store/cart"

export function Cart() {
  const { items, isOpen, giftNote, toggleCart, removeItem, updateQuantity, setGiftNote, subtotal, clearCart } = useCartStore()

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={toggleCart} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-[#0f0f14] border-l border-white/5 z-50 drawer-open flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h2 className="text-sm font-semibold text-gold">Cart ({items.length})</h2>
          <button onClick={toggleCart} className="text-white/40 hover:text-white/60 text-lg">✕</button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-8">Your cart is empty</p>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex gap-3 bg-white/3 rounded-lg p-2.5 border border-white/5">
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-14 h-14 rounded object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{item.name}</p>
                  <p className="text-xs text-gold">${item.price}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-5 h-5 rounded bg-white/5 text-white/40 hover:bg-white/10 text-xs flex items-center justify-center"
                    >−</button>
                    <span className="text-xs text-white/60">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-5 h-5 rounded bg-white/5 text-white/40 hover:bg-white/10 text-xs flex items-center justify-center"
                    >+</button>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="ml-auto text-[10px] text-red-400/50 hover:text-red-400"
                    >Remove</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-white/5 p-4 space-y-3">
            <textarea
              value={giftNote}
              onChange={(e) => setGiftNote(e.target.value)}
              placeholder="Add a gift note..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Subtotal</span>
              <span className="text-sm font-semibold text-gold">${subtotal().toFixed(2)}</span>
            </div>
            <button className="w-full py-2.5 bg-gold text-black text-xs font-semibold rounded-lg hover:bg-gold-light transition">
              Checkout
            </button>
            <button onClick={clearCart} className="w-full py-1.5 text-[10px] text-white/20 hover:text-white/40">
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  )
}
