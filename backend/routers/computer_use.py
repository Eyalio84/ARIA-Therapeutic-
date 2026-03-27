"""
Computer Use Router — /api/computer/* endpoints.
Web interaction, content analysis, and self-testing.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/computer", tags=["computer-use"])


class FetchRequest(BaseModel):
    url: str
    timeout: float = 10.0

class SearchRequest(BaseModel):
    query: str
    num_results: int = 5

class AnalyzeImageRequest(BaseModel):
    image_path: str
    prompt: str = "Describe what you see in this image in detail."


@router.post("/fetch")
async def fetch_page(req: FetchRequest):
    """Fetch a URL and extract text content."""
    from services.computer_use_service import fetch_url
    return await fetch_url(req.url, req.timeout)


@router.post("/search")
async def search_web(req: SearchRequest):
    """Search the web using Gemini with Google Search grounding."""
    from services.computer_use_service import web_search
    return await web_search(req.query, req.num_results)


@router.post("/analyze-image")
async def analyze_image(req: AnalyzeImageRequest):
    """Analyze an image using Gemini Vision."""
    from services.computer_use_service import analyze_image
    return await analyze_image(req.image_path, req.prompt)


@router.get("/self-test")
async def self_test():
    """Run self-test suite on the game engine."""
    from services.computer_use_service import self_test_game
    return await self_test_game()
