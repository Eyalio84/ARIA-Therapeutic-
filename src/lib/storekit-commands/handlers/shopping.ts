/**
 * Jewelry shopping handlers — powered by Python backend NAI.
 *
 * Instead of reading from static theme data, these handlers call
 * the backend API for NAI-powered product search and KG traversal.
 */

import type { CommandHandler } from "@/lib/aria-core/types/command"

const BACKEND = process.env.NEXT_PUBLIC_ARIA_BACKEND ?? "http://localhost:8000"

async function backendFetch(path: string, body?: Record<string, unknown>) {
  const res = await fetch(`${BACKEND}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Backend ${path}: ${res.status}`)
  return res.json()
}

export const shoppingHandlers: CommandHandler[] = [
  {
    name: "add_to_cart",
    contexts: [],
    async execute(args, ctx) {
      const slug = args.slug as string
      const name = args.name as string
      const product = await backendFetch(`/api/products/${slug}`).catch(() => null)
      const price = product?.price ?? 0
      const image = "" // product images come from Unsplash URLs in the DB
      ctx.dispatchUI({ type: "ADD_TO_CART", slug, name, price, image })
      return { type: "silent" }
    },
  },

  {
    name: "open_cart",
    contexts: [],
    async execute(_args, ctx) {
      ctx.dispatchUI({ type: "OPEN_CART" })
      return { type: "silent" }
    },
  },

  {
    name: "describe_product",
    contexts: [],
    async execute(args) {
      const slug = args.slug as string
      const product = await backendFetch(`/api/products/${slug}`).catch(() => null)
      if (!product) return { type: "speak", text: "I couldn't find that piece in our collection." }

      const materials = (product.materials ?? []).map((m: { name: string }) => m.name).join(", ")
      const pairsWith = (product.pairs_with ?? []).map((p: { name: string }) => p.name).join(", ")

      let text = `${product.name} — ${product.description} It's priced at $${product.price}.`
      if (materials) text += ` Crafted with ${materials}.`
      if (pairsWith) text += ` It pairs beautifully with ${pairsWith}.`
      if (product.stock !== null && product.stock <= 5) text += ` Only ${product.stock} left.`

      return { type: "speak", text }
    },
  },

  {
    name: "list_all_products",
    contexts: [],
    async execute() {
      const data = await backendFetch("/api/products").catch(() => null)
      if (!data?.products?.length) return { type: "speak", text: "I couldn't load our catalog right now." }
      const list = data.products.map((p: { name: string; price: number }) =>
        `${p.name} at $${p.price}`
      ).join(", ")
      return { type: "speak", text: `Here's our collection: ${list}.` }
    },
  },

  {
    name: "recommend_product",
    contexts: [],
    async execute(args) {
      const occasion = args.occasion as string | undefined
      const budget = args.budget as number | undefined

      // Use NAI for smart recommendation
      const query = occasion
        ? `recommend for ${occasion}${budget ? ` under $${budget}` : ""}`
        : budget
          ? `jewelry under $${budget}`
          : "recommend a gift"

      const data = await backendFetch("/api/aria/query", { query, top_n: 3, node_type: "product" }).catch(() => null)
      if (!data?.results?.length) return { type: "speak", text: "Let me think... I'd start with our Gold Bracelet Set — it's versatile and beautifully crafted." }

      const pick = data.results[0]
      return { type: "speak", text: `I'd recommend the ${pick.name} — ${pick.description} It's $${pick.price} and one of our most loved pieces.` }
    },
  },

  {
    name: "search_products",
    contexts: [],
    async execute(args) {
      const query = args.query as string
      const data = await backendFetch("/api/aria/query", { query, top_n: 3 }).catch(() => null)
      if (!data?.results?.length) return { type: "speak", text: "I couldn't find anything matching that. Could you describe what you're looking for differently?" }

      const results = data.results
        .filter((r: { node_type: string }) => r.node_type === "product")
        .slice(0, 3)

      if (results.length === 0) return { type: "speak", text: "I found some related information but no specific products. Let me help narrow it down — are you looking for a ring, necklace, or something else?" }

      const list = results.map((r: { name: string; price: number }) => `${r.name} ($${r.price})`).join(", ")
      return { type: "speak", text: `I found ${results.length} pieces that match: ${list}. Would you like to hear more about any of them?` }
    },
  },

  {
    name: "check_stock",
    contexts: [],
    async execute(args) {
      const slug = args.slug as string
      const product = await backendFetch(`/api/products/${slug}`).catch(() => null)
      if (!product) return { type: "speak", text: "I couldn't find that product." }
      if (product.stock === 0) return { type: "speak", text: `${product.name} is currently out of stock.` }
      if (product.stock <= 5) return { type: "speak", text: `${product.name} is in stock — only ${product.stock} remaining.` }
      return { type: "speak", text: `${product.name} is in stock.` }
    },
  },

  {
    name: "filter_products",
    contexts: [],
    async execute(args, ctx) {
      ctx.dispatchUI({ type: "FILTER", category: args.category as string })
      return { type: "silent" }
    },
  },

  {
    name: "filter_by_price",
    contexts: [],
    async execute(args, ctx) {
      ctx.dispatchUI({ type: "NAVIGATE", url: `/products?maxPrice=${args.maxPrice}` })
      return { type: "silent" }
    },
  },

  {
    name: "navigate_to_product",
    contexts: [],
    async execute(args, ctx) {
      ctx.dispatchUI({ type: "NAVIGATE", url: `/products/${args.slug as string}` })
      return { type: "silent" }
    },
  },
]
