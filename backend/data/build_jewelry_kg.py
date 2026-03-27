#!/usr/bin/env python3
"""
Build the Jewelry Store Knowledge Graph.

Extracts products from themes/jewelry.ts data and adds brand knowledge:
- Products (8), categories, materials, brand values, care instructions, gift occasions
- Edges: belongs_to, made_of, pairs_with, recommended_for, similar_to

Schema: standard (nodes/edges) — compatible with NAI KGManager.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "jewelry-store-kg.db")

# ── Product Data (from themes/jewelry.ts) ────────────────────────────

PRODUCTS = [
    {"id": "gold-bracelet-set", "name": "Gold Bracelet Set", "description": "Delicate 18k gold-plated bangles, set of three. Perfect for stacking.", "price": 89, "category": "Bracelets", "stock": 12},
    {"id": "pearl-drop-earrings", "name": "Pearl Drop Earrings", "description": "Classic freshwater pearl drops on gold vermeil hooks. Timeless elegance.", "price": 65, "category": "Earrings", "stock": 8},
    {"id": "sapphire-statement-ring", "name": "Sapphire Ring", "description": "Oval sapphire set in sterling silver with diamond accents.", "price": 245, "category": "Rings", "stock": 3},
    {"id": "diamond-solitaire-pendant", "name": "Diamond Solitaire Pendant", "description": "0.25ct diamond solitaire on an 18-inch gold chain.", "price": 185, "category": "Pendants", "stock": 6},
    {"id": "rose-gold-chain-necklace", "name": "Rose Gold Chain Necklace", "description": "Delicate rope-style chain in 14k rose gold. Wear alone or layered.", "price": 125, "category": "Necklaces", "stock": 15},
    {"id": "emerald-stud-earrings", "name": "Emerald Stud Earrings", "description": "Natural emerald studs in 18k gold settings.", "price": 145, "category": "Earrings", "stock": 5},
    {"id": "vintage-gold-brooch", "name": "Vintage Gold Brooch", "description": "Art Deco inspired brooch with intricate filigree work in gold.", "price": 75, "category": "Brooches", "stock": 4},
    {"id": "sterling-silver-cuff", "name": "Sterling Silver Cuff", "description": "Wide sterling silver cuff with hammered finish.", "price": 55, "category": "Bracelets", "stock": 20},
]

CATEGORIES = [
    {"id": "cat-rings", "name": "Rings"},
    {"id": "cat-necklaces", "name": "Necklaces"},
    {"id": "cat-earrings", "name": "Earrings"},
    {"id": "cat-bracelets", "name": "Bracelets"},
    {"id": "cat-pendants", "name": "Pendants"},
    {"id": "cat-brooches", "name": "Brooches"},
]

MATERIALS = [
    {"id": "mat-gold-18k", "name": "18k Gold", "description": "Premium gold alloy, 75% pure gold. Warm yellow tone, hypoallergenic."},
    {"id": "mat-rose-gold-14k", "name": "14k Rose Gold", "description": "Gold-copper alloy with a warm pink hue. Romantic and trendy."},
    {"id": "mat-sterling-silver", "name": "Sterling Silver", "description": "92.5% pure silver. Durable, classic, and versatile."},
    {"id": "mat-gold-vermeil", "name": "Gold Vermeil", "description": "Thick gold plating over sterling silver. Affordable luxury."},
    {"id": "mat-sapphire", "name": "Sapphire", "description": "Precious gemstone, deep blue. Symbol of wisdom and royalty."},
    {"id": "mat-diamond", "name": "Diamond", "description": "Hardest natural material. Symbol of eternal love and commitment."},
    {"id": "mat-emerald", "name": "Emerald", "description": "Precious green gemstone. Symbol of rebirth and love."},
    {"id": "mat-pearl", "name": "Freshwater Pearl", "description": "Organic gem from mollusks. Classic elegance and purity."},
]

BRAND_VALUES = [
    {"id": "val-ethical", "name": "Ethical Sourcing", "description": "All metals and stones are conflict-free and traceable to their origins."},
    {"id": "val-handmade", "name": "Handmade Always", "description": "No mass production. Every piece is finished by hand in our studio."},
    {"id": "val-heirloom", "name": "Made to Last", "description": "We design for heirlooms, not trends. Quality over quantity, always."},
    {"id": "val-personal", "name": "Personal Connection", "description": "Every piece begins with a story — yours."},
]

CARE_INSTRUCTIONS = [
    {"id": "care-gold", "name": "Gold Care", "description": "Clean with mild soap and warm water. Polish with a soft cloth. Store separately to avoid scratches."},
    {"id": "care-silver", "name": "Silver Care", "description": "Use a silver polishing cloth to remove tarnish. Store in anti-tarnish bags. Avoid harsh chemicals."},
    {"id": "care-gemstone", "name": "Gemstone Care", "description": "Clean gently with lukewarm water. Avoid ultrasonic cleaners for emeralds. Remove before exercise."},
    {"id": "care-pearl", "name": "Pearl Care", "description": "Wipe with a damp cloth after wearing. Last on, first off. Store flat, away from other jewelry."},
]

GIFT_OCCASIONS = [
    {"id": "gift-anniversary", "name": "Anniversary", "description": "Celebrate milestones with timeless pieces that symbolize enduring love."},
    {"id": "gift-birthday", "name": "Birthday", "description": "A birthday gift of jewelry says 'I know you' in the most personal way."},
    {"id": "gift-valentines", "name": "Valentine's Day", "description": "Express love with something as rare and beautiful as the bond you share."},
    {"id": "gift-graduation", "name": "Graduation", "description": "Mark achievement with a piece they'll carry into their next chapter."},
    {"id": "gift-mothers-day", "name": "Mother's Day", "description": "Honor the woman who gave everything with something she'll treasure forever."},
    {"id": "gift-self", "name": "Self-Purchase", "description": "Because you deserve something beautiful. Treat yourself."},
]

BRAND_IDENTITY = [
    {"id": "brand-name", "name": "Jewelry Store", "description": "Handcrafted with intention. Founded by Maya Chen and Daniel Rowe in 2018."},
    {"id": "brand-tagline", "name": "Handcrafted with Intention", "description": "Each piece tells a story. Personal, ethical, built to last."},
    {"id": "brand-persona", "name": "Aria Personality", "description": "Sophisticated, warm, knowledgeable — like a trusted friend who knows everything about fine jewelry."},
]

# ── Intent Keywords ──────────────────────────────────────────────────

INTENT_KEYWORDS = {
    # Products
    "gold-bracelet-set": "bracelet,bangles,stacking,gold,set,gift,arm,wrist,stack,layer",
    "pearl-drop-earrings": "pearl,earring,drop,classic,elegant,timeless,wedding,bridal",
    "sapphire-statement-ring": "sapphire,ring,statement,blue,silver,diamond,engagement,luxury,expensive,precious",
    "diamond-solitaire-pendant": "diamond,pendant,solitaire,chain,gold,necklace,sparkle,brilliant,love,anniversary",
    "rose-gold-chain-necklace": "rose gold,chain,necklace,delicate,layer,pink,romantic,everyday,versatile",
    "emerald-stud-earrings": "emerald,stud,earring,green,gold,natural,precious,elegant",
    "vintage-gold-brooch": "brooch,vintage,art deco,gold,filigree,antique,pin,classic,retro",
    "sterling-silver-cuff": "silver,cuff,bracelet,hammered,wide,bold,affordable,everyday,casual",
    # Categories
    "cat-rings": "ring,rings,finger,band,engagement",
    "cat-necklaces": "necklace,necklaces,chain,choker,neck",
    "cat-earrings": "earring,earrings,stud,drop,hoop,ear",
    "cat-bracelets": "bracelet,bracelets,bangle,cuff,wrist,arm",
    "cat-pendants": "pendant,pendants,charm,necklace,hang",
    "cat-brooches": "brooch,brooches,pin,lapel,vintage",
    # Materials
    "mat-gold-18k": "gold,18k,yellow gold,precious metal",
    "mat-rose-gold-14k": "rose gold,14k,pink gold,romantic",
    "mat-sterling-silver": "silver,sterling,925,affordable",
    "mat-gold-vermeil": "vermeil,gold plated,affordable luxury",
    "mat-sapphire": "sapphire,blue,gemstone,precious",
    "mat-diamond": "diamond,brilliant,sparkle,precious,engagement",
    "mat-emerald": "emerald,green,gemstone,precious",
    "mat-pearl": "pearl,freshwater,classic,organic,bridal",
    # Gift occasions
    "gift-anniversary": "anniversary,milestone,celebrate,years,love",
    "gift-birthday": "birthday,gift,present,celebrate,personal",
    "gift-valentines": "valentine,love,romantic,heart,february",
    "gift-graduation": "graduation,achievement,milestone,gift",
    "gift-mothers-day": "mother,mom,mum,mothers day,may",
    "gift-self": "self,treat,deserve,myself,reward",
    # Brand
    "brand-name": "store,brand,about,who,founded,maya,daniel",
    "brand-tagline": "handcrafted,intention,story,personal",
    "brand-persona": "aria,assistant,help,recommend,guide",
}

# ── Edges ────────────────────────────────────────────────────────────

EDGES = []

def add_edge(src, tgt, etype, weight=1.0):
    EDGES.append((src, tgt, etype, weight))

# Products → Categories (belongs_to)
for p in PRODUCTS:
    cat_id = f"cat-{p['category'].lower()}"
    add_edge(p["id"], cat_id, "belongs_to")

# Products → Materials (made_of)
material_map = {
    "gold-bracelet-set": ["mat-gold-18k"],
    "pearl-drop-earrings": ["mat-pearl", "mat-gold-vermeil"],
    "sapphire-statement-ring": ["mat-sapphire", "mat-sterling-silver", "mat-diamond"],
    "diamond-solitaire-pendant": ["mat-diamond", "mat-gold-18k"],
    "rose-gold-chain-necklace": ["mat-rose-gold-14k"],
    "emerald-stud-earrings": ["mat-emerald", "mat-gold-18k"],
    "vintage-gold-brooch": ["mat-gold-18k"],
    "sterling-silver-cuff": ["mat-sterling-silver"],
}
for pid, mats in material_map.items():
    for mat in mats:
        add_edge(pid, mat, "made_of")

# Products → Care (needs_care)
care_map = {
    "gold-bracelet-set": "care-gold",
    "pearl-drop-earrings": "care-pearl",
    "sapphire-statement-ring": "care-gemstone",
    "diamond-solitaire-pendant": "care-gold",
    "rose-gold-chain-necklace": "care-gold",
    "emerald-stud-earrings": "care-gemstone",
    "vintage-gold-brooch": "care-gold",
    "sterling-silver-cuff": "care-silver",
}
for pid, care in care_map.items():
    add_edge(pid, care, "needs_care")

# Products → Gift occasions (recommended_for)
gift_map = {
    "gold-bracelet-set": ["gift-birthday", "gift-self", "gift-mothers-day"],
    "pearl-drop-earrings": ["gift-anniversary", "gift-valentines", "gift-mothers-day"],
    "sapphire-statement-ring": ["gift-anniversary", "gift-valentines"],
    "diamond-solitaire-pendant": ["gift-anniversary", "gift-valentines", "gift-birthday"],
    "rose-gold-chain-necklace": ["gift-birthday", "gift-self", "gift-graduation"],
    "emerald-stud-earrings": ["gift-birthday", "gift-mothers-day"],
    "vintage-gold-brooch": ["gift-mothers-day", "gift-self"],
    "sterling-silver-cuff": ["gift-birthday", "gift-self", "gift-graduation"],
}
for pid, occasions in gift_map.items():
    for occ in occasions:
        add_edge(pid, occ, "recommended_for")

# Products → Products (pairs_with)
pairs = [
    ("gold-bracelet-set", "pearl-drop-earrings"),
    ("gold-bracelet-set", "rose-gold-chain-necklace"),
    ("pearl-drop-earrings", "diamond-solitaire-pendant"),
    ("sapphire-statement-ring", "diamond-solitaire-pendant"),
    ("rose-gold-chain-necklace", "emerald-stud-earrings"),
    ("rose-gold-chain-necklace", "gold-bracelet-set"),
    ("emerald-stud-earrings", "sterling-silver-cuff"),
    ("vintage-gold-brooch", "pearl-drop-earrings"),
    ("sterling-silver-cuff", "sapphire-statement-ring"),
]
for a, b in pairs:
    add_edge(a, b, "pairs_with")
    add_edge(b, a, "pairs_with")

# Products → Products (similar_to) — same category
category_products = {}
for p in PRODUCTS:
    category_products.setdefault(p["category"], []).append(p["id"])
for cat, pids in category_products.items():
    for i, a in enumerate(pids):
        for b in pids[i+1:]:
            add_edge(a, b, "similar_to")
            add_edge(b, a, "similar_to")

# Brand values → Brand identity
for val in BRAND_VALUES:
    add_edge(val["id"], "brand-name", "defines")

# Products → Brand identity
for p in PRODUCTS:
    add_edge(p["id"], "brand-name", "sold_by")

# Materials → Care
add_edge("mat-gold-18k", "care-gold", "requires_care")
add_edge("mat-rose-gold-14k", "care-gold", "requires_care")
add_edge("mat-gold-vermeil", "care-gold", "requires_care")
add_edge("mat-sterling-silver", "care-silver", "requires_care")
add_edge("mat-sapphire", "care-gemstone", "requires_care")
add_edge("mat-diamond", "care-gemstone", "requires_care")
add_edge("mat-emerald", "care-gemstone", "requires_care")
add_edge("mat-pearl", "care-pearl", "requires_care")

# Price tiers
add_edge("sterling-silver-cuff", "pearl-drop-earrings", "similar_price_tier")
add_edge("vintage-gold-brooch", "gold-bracelet-set", "similar_price_tier")
add_edge("rose-gold-chain-necklace", "emerald-stud-earrings", "similar_price_tier")
add_edge("diamond-solitaire-pendant", "sapphire-statement-ring", "similar_price_tier")


# ── Build Database ───────────────────────────────────────────────────

def build():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)

    conn.executescript("""
        CREATE TABLE nodes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT,
            price REAL,
            stock INTEGER,
            category TEXT,
            intent_keywords TEXT
        );

        CREATE TABLE edges (
            source TEXT NOT NULL,
            target TEXT NOT NULL,
            type TEXT NOT NULL,
            weight REAL DEFAULT 1.0,
            FOREIGN KEY (source) REFERENCES nodes(id),
            FOREIGN KEY (target) REFERENCES nodes(id)
        );

        CREATE INDEX idx_edges_source ON edges(source);
        CREATE INDEX idx_edges_target ON edges(target);
        CREATE INDEX idx_edges_type ON edges(type);
        CREATE INDEX idx_nodes_type ON nodes(type);
    """)

    # Insert products
    for p in PRODUCTS:
        conn.execute(
            "INSERT INTO nodes (id, name, description, type, price, stock, category, intent_keywords) VALUES (?,?,?,?,?,?,?,?)",
            (p["id"], p["name"], p["description"], "product", p["price"], p["stock"], p["category"],
             INTENT_KEYWORDS.get(p["id"], ""))
        )

    # Insert categories
    for c in CATEGORIES:
        conn.execute(
            "INSERT INTO nodes (id, name, description, type, intent_keywords) VALUES (?,?,?,?,?)",
            (c["id"], c["name"], f"Jewelry category: {c['name']}", "category",
             INTENT_KEYWORDS.get(c["id"], ""))
        )

    # Insert materials
    for m in MATERIALS:
        conn.execute(
            "INSERT INTO nodes (id, name, description, type, intent_keywords) VALUES (?,?,?,?,?)",
            (m["id"], m["name"], m["description"], "material",
             INTENT_KEYWORDS.get(m["id"], ""))
        )

    # Insert brand values
    for v in BRAND_VALUES:
        conn.execute(
            "INSERT INTO nodes (id, name, description, type) VALUES (?,?,?,?)",
            (v["id"], v["name"], v["description"], "brand_value")
        )

    # Insert care instructions
    for c in CARE_INSTRUCTIONS:
        conn.execute(
            "INSERT INTO nodes (id, name, description, type) VALUES (?,?,?,?)",
            (c["id"], c["name"], c["description"], "care_instruction")
        )

    # Insert gift occasions
    for g in GIFT_OCCASIONS:
        conn.execute(
            "INSERT INTO nodes (id, name, description, type, intent_keywords) VALUES (?,?,?,?,?)",
            (g["id"], g["name"], g["description"], "gift_occasion",
             INTENT_KEYWORDS.get(g["id"], ""))
        )

    # Insert brand identity
    for b in BRAND_IDENTITY:
        conn.execute(
            "INSERT INTO nodes (id, name, description, type, intent_keywords) VALUES (?,?,?,?,?)",
            (b["id"], b["name"], b["description"], "brand_identity",
             INTENT_KEYWORDS.get(b["id"], ""))
        )

    # Insert edges
    for src, tgt, etype, weight in EDGES:
        conn.execute(
            "INSERT INTO edges (source, target, type, weight) VALUES (?,?,?,?)",
            (src, tgt, etype, weight)
        )

    conn.commit()

    # Stats
    node_count = conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
    edge_count = conn.execute("SELECT COUNT(*) FROM edges").fetchone()[0]
    types = conn.execute("SELECT type, COUNT(*) FROM nodes GROUP BY type ORDER BY COUNT(*) DESC").fetchall()
    edge_types = conn.execute("SELECT type, COUNT(*) FROM edges GROUP BY type ORDER BY COUNT(*) DESC").fetchall()

    print(f"Built jewelry-store-kg.db:")
    print(f"  Nodes: {node_count}")
    print(f"  Edges: {edge_count}")
    print(f"  Node types: {dict(types)}")
    print(f"  Edge types: {dict(edge_types)}")

    conn.close()
    return DB_PATH


if __name__ == "__main__":
    build()
