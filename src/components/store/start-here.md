<!-- last-verified: 2026-03-27 -->
> Parent: [../start-here.md](../start-here.md)

# Store — Start Here

> Read this first. Jump to [store.md](store.md) or [store.ctx](store.ctx) only for the component you need.

| Component | What it is | store.md | store.ctx |
|---|---|---|---|
| **StorePage** | Root shell. Renders StoreHeader, ProductGrid or ProductDetail (conditional), Cart overlay, and JarvisOrb. Reads `selectedProduct` from store. | [StorePage](store.md#StorePage) | `StorePage` node |
| **StoreHeader** | Top bar with "Jewelry Store" branding, 7 category filter pills (All/Rings/Necklaces/Earrings/Bracelets/Pendants/Brooches), and cart icon with badge count. | [StoreHeader](store.md#StoreHeader) | `StoreHeader` node |
| **ProductGrid** | Responsive product grid (2/3/4 cols). Fetches products on mount, shows skeleton loaders while loading. | [ProductGrid](store.md#ProductGrid) | `ProductGrid` node |
| **ProductCard** | Single product card. Image with hover zoom, category label, name, price, low-stock warning. Click navigates to detail. | [ProductCard](store.md#ProductCard) | `ProductCard` node |
| **ProductDetail** | Full product view. Image, description, materials, care instructions, "pairs with" recommendations, and Add to Cart button. Back button returns to grid. | [ProductDetail](store.md#ProductDetail) | `ProductDetail` node |
| **Cart** | Right-slide drawer. Item list with quantity +/- controls, remove button, gift note textarea, subtotal, checkout button, and clear cart. Backdrop dismisses. | [Cart](store.md#Cart) | `Cart` node |
| **JarvisOrb** | Floating action button (bottom-right). Gold gradient orb with pulse rings. Toggles JarvisChatPanel open/closed. | [JarvisOrb](store.md#JarvisOrb) | `JarvisOrb` node |
| **JarvisChatPanel** | Aria chat panel for the store context. Fixed bottom-right chat window with message history, typing indicator, and text input. Sends queries to `/api/aria/respond` and syncs persona state to SDK tab. | [JarvisChatPanel](store.md#JarvisChatPanel) | `JarvisChatPanel` node |

## Backend Counterpart

> Also load these when working on this folder — components make direct API calls.

| Router | What this folder uses it for | Entry point |
|--------|------------------------------|-------------|
| **products** | Product catalog listing and detail fetches (via `useProductsStore`) | [backend/routers/start-here.md](../../../backend/routers/start-here.md) |
| **aria** | Store chat assistant — `JarvisChatPanel` sends messages to `/api/aria/respond` | [backend/routers/start-here.md](../../../backend/routers/start-here.md) |
