/**
 * Aria V2.0 Jewelry Context — uses Python backend for product knowledge.
 *
 * Unlike StoreKit's static theme data, this context calls the backend
 * for NAI search and 4D persona state.
 */

import type { ContextDefinition } from "@/lib/aria-core/types/context"

const BACKEND_URL = process.env.NEXT_PUBLIC_ARIA_BACKEND ?? "http://localhost:8000"

// Product hints from the jewelry catalog
const productHint = "gold-bracelet-set, pearl-drop-earrings, sapphire-statement-ring, diamond-solitaire-pendant, rose-gold-chain-necklace, emerald-stud-earrings, vintage-gold-brooch, sterling-silver-cuff"
const categoryHint = "Rings, Necklaces, Earrings, Bracelets, Pendants, Brooches"

/**
 * Jewelry store context — shopping functions powered by backend NAI.
 */
export const jewelryContext: ContextDefinition = {
  id: "jewelry",
  label: "Jewelry Store — Handcrafted with Intention",
  greeting: "Welcome to our studio! I'm Aria. What brings you in today — are you shopping for yourself or looking for the perfect gift?",
  systemPromptSuffix: [
    "STRICT SILENCE RULES — follow exactly:",
    "- navigate: execute silently. Say NOTHING.",
    "- scroll_page: execute silently. Say NOTHING.",
    "- add_to_cart: one warm sentence only.",
    "",
    "Keep all responses under 3 sentences. Be warm, knowledgeable, never pushy.",
  ].join("\n"),
  functions: [
    { name: "navigate", description: "Navigate to any page", parameters: { type: "OBJECT", properties: { url: { type: "STRING", description: "/, /products, /products/[slug], /about, /cart" } }, required: ["url"] } },
    { name: "scroll_page", description: "Scroll the page", parameters: { type: "OBJECT", properties: { direction: { type: "STRING", description: "up | down | top | bottom" } }, required: ["direction"] } },
    { name: "add_to_cart", description: "Add a product to the cart", parameters: { type: "OBJECT", properties: { slug: { type: "STRING", description: productHint }, name: { type: "STRING" } }, required: ["slug", "name"] } },
    { name: "open_cart", description: "Open the shopping cart", parameters: { type: "OBJECT", properties: {} } },
    { name: "filter_products", description: "Filter shop by category", parameters: { type: "OBJECT", properties: { category: { type: "STRING", description: categoryHint } }, required: ["category"] } },
    { name: "filter_by_price", description: "Filter products by maximum price", parameters: { type: "OBJECT", properties: { maxPrice: { type: "NUMBER" } }, required: ["maxPrice"] } },
    { name: "describe_product", description: "Describe a product by slug", parameters: { type: "OBJECT", properties: { slug: { type: "STRING", description: productHint } }, required: ["slug"] } },
    { name: "navigate_to_product", description: "Navigate to a product page", parameters: { type: "OBJECT", properties: { slug: { type: "STRING", description: productHint } }, required: ["slug"] } },
    { name: "list_all_products", description: "List all available products", parameters: { type: "OBJECT", properties: {} } },
    { name: "recommend_product", description: "Recommend a product based on budget or occasion", parameters: { type: "OBJECT", properties: { budget: { type: "NUMBER" }, occasion: { type: "STRING", description: "anniversary | birthday | valentine | graduation | self" } } } },
    { name: "check_stock", description: "Check if a product is in stock", parameters: { type: "OBJECT", properties: { slug: { type: "STRING", description: productHint } }, required: ["slug"] } },
    { name: "search_products", description: "Search products using natural language query via NAI", parameters: { type: "OBJECT", properties: { query: { type: "STRING", description: "Natural language query like 'something under $100 for my mom'" } }, required: ["query"] } },
    { name: "save_memory", description: "Save something to remember about this user", parameters: { type: "OBJECT", properties: { key: { type: "STRING" }, value: { type: "STRING" } }, required: ["key", "value"] } },
  ],
}

export { BACKEND_URL }
