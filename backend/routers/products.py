"""
Products API Router — /api/products/* endpoints.

GET  /api/products           — List all products
GET  /api/products/{id}      — Get single product
GET  /api/products/{id}/related — Get related products (pairs_with, similar_to)
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

router = APIRouter(prefix="/api/products", tags=["products"])

_nai = None


def init_services(nai):
    global _nai
    _nai = nai


@router.get("")
async def list_products(category: Optional[str] = None):
    """List all products, optionally filtered by category."""
    try:
        products = _nai.get_products(category=category)
        return {"products": products, "count": len(products)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{product_id}")
async def get_product(product_id: str):
    """Get a single product by ID."""
    product = _nai.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product not found: {product_id}")

    # Enrich with KG neighbors
    neighbors = _nai.get_neighbors(product_id)
    product["materials"] = [n for n in neighbors if n["node_type"] == "material"]
    product["care"] = [n for n in neighbors if n["node_type"] == "care_instruction"]
    product["pairs_with"] = [n for n in neighbors if n["edge_type"] == "pairs_with"]
    product["recommended_for"] = [n for n in neighbors if n["edge_type"] == "recommended_for"]

    return product


@router.get("/{product_id}/related")
async def get_related(product_id: str):
    """Get related products (pairs_with, similar_to)."""
    product = _nai.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product not found: {product_id}")

    neighbors = _nai.get_neighbors(product_id)
    related = [n for n in neighbors if n["edge_type"] in ("pairs_with", "similar_to", "similar_price_tier")]

    return {"product_id": product_id, "related": related}
