<!-- last-verified: 2026-03-27 -->

# store/ — Component Reference

## StorePage

**File:** `StorePage.tsx` (23 lines)
**Exports:** `StorePage` (named)
**Route:** Rendered inside `TabContainer` when `activeTab === "store"`

### What it does
Root shell for the jewelry store. Pure layout — renders header, conditional content area (grid or detail), cart overlay, and Jarvis orb.

### Layout
- StoreHeader (fixed top)
- Content area: `selectedProduct ? <ProductDetail /> : <ProductGrid />`
- Cart (overlay)
- JarvisOrb (floating)

### Dependencies
- `useProductsStore` — reads `selectedProduct` to toggle grid vs detail

---

## StoreHeader

**File:** `StoreHeader.tsx` (59 lines)
**Exports:** `StoreHeader` (named)
**Store:** `useProductsStore` — `category`, `setCategory`, `fetchProducts`; `useCartStore` — `toggleCart`, `itemCount`

### What it does
Top navigation bar with branding, category filters, and cart toggle.

### Key features
- "Jewelry Store" title with tagline
- 7 category pills: All, Rings, Necklaces, Earrings, Bracelets, Pendants, Brooches
- Cart bag icon with badge count (capped at "9+")
- Selecting a category triggers `fetchProducts(category)`

---

## ProductGrid

**File:** `ProductGrid.tsx` (31 lines)
**Exports:** `ProductGrid` (named)
**Store:** `useProductsStore` — `products`, `isLoading`, `fetchProducts`, `fetchProduct`

### What it does
Responsive grid of product cards. Auto-fetches on mount if empty. Shows 8 skeleton cards while loading.

### Layout
- Grid: 2 cols (mobile), 3 cols (md), 4 cols (lg)
- Each product renders as a `ProductCard`
- Click on card calls `fetchProduct(id)` to load detail

---

## ProductCard

**File:** `ProductCard.tsx` (44 lines)
**Exports:** `ProductCard` (named)
**Props:** `{ product: Product, onClick: () => void }`

### What it does
Presentational product card with image, category tag, name, price, and low-stock warning.

### Key features
- Aspect-square image with hover zoom (scale-105)
- Lazy image loading
- Fallback: first letter of name in gold when no image
- Low-stock warning when `stock <= 5`
- Gold border glow on hover

---

## ProductDetail

**File:** `ProductDetail.tsx` (93 lines)
**Exports:** `ProductDetail` (named)
**Store:** `useProductsStore` — `selectedProduct`, `clearSelection`; `useCartStore` — `addItem`

### What it does
Full product detail view with all metadata and add-to-cart.

### Layout
- Back button ("← Back to products")
- 2-column grid: image (left), info (right)
- Info: category, name, price, description, stock warning, Add to Cart button, materials tags, care instructions, "pairs with" recommendations

---

## Cart

**File:** `Cart.tsx` (82 lines)
**Exports:** `Cart` (named)
**Store:** `useCartStore` — `items`, `isOpen`, `giftNote`, `toggleCart`, `removeItem`, `updateQuantity`, `setGiftNote`, `subtotal`, `clearCart`

### What it does
Right-sliding cart drawer with item management and checkout.

### Key features
- Backdrop overlay (click to dismiss)
- Item cards: image, name, price, quantity controls (−/+), remove
- Gift note textarea
- Subtotal display
- Checkout button (currently UI-only)
- Clear cart button
- Empty state message

---

## JarvisOrb

**File:** `JarvisOrb.tsx` (50 lines)
**Exports:** `JarvisOrb` (named)

### What it does
Floating action button that toggles the Jarvis/Aria chat panel.

### State
- `isOpen` — toggles chat panel visibility
- `status` — "idle" | "thinking" — passed from chat panel

### Visual
- Gold gradient orb when closed, with animated pulse rings
- Muted glass orb with ✕ when open
- Pulse animation when thinking
- Fixed position: `bottom-6 right-6`

---

## JarvisChatPanel

**File:** `JarvisChatPanel.tsx` (136 lines)
**Exports:** `JarvisChatPanel` (named)
**Props:** `{ onClose, onStatusChange }`
**Store:** `useSdkStore` — `setPersonaState`

### What it does
Chat panel for store-context conversations with Aria. Sends messages to the backend and displays streamed responses. Syncs persona state to the SDK tab.

### Key features
- Greeting message on mount
- Message history with user (gold) / aria (glass) bubble styles
- Typing indicator (3 bouncing dots)
- Calls `POST /api/aria/respond` with message, conversation_history (last 10), session_id
- Parses `kg_context` from response as Aria's reply
- Syncs `persona_state` from response to `useSdkStore`
- Fixed position: bottom-right, 80x384px

### Dependencies
- Backend: `NEXT_PUBLIC_ARIA_BACKEND` env var (default: `http://localhost:8000`)

---

## External Dependencies

### Backend API
| Endpoint | Method | Router | Purpose |
|----------|--------|--------|---------|
| `/api/products` | GET | products | List all products (optional `?category=` filter) |
| `/api/products/{id}` | GET | products | Fetch single product with materials, care, pairs_with |
| `/api/aria/respond` | POST | aria | Send chat message, receive KG-context response and persona state |
