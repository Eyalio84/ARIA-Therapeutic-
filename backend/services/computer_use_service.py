"""
Computer Use Service — Web interaction and content analysis.

On Android/Termux, running a full Chromium browser is impractical.
Instead, this service:
1. Fetches web content via urllib (text extraction)
2. Uses Gemini API for web search grounding (no browser needed)
3. Uses Gemini Vision API for screenshot/image analysis
4. For self-testing: calls game API endpoints directly and analyzes responses

Future: On a real Linux server, swap in Playwright for full browser automation.
"""

import asyncio
import json
import urllib.request
import urllib.parse
import re
import os
import base64
from typing import Optional, Dict, Any, List
from html.parser import HTMLParser


# ── HTML Text Extractor ──

class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self._text = []
        self._skip = {"script", "style", "noscript", "svg", "head"}
        self._in_skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self._skip:
            self._in_skip += 1

    def handle_endtag(self, tag):
        if tag in self._skip:
            self._in_skip = max(0, self._in_skip - 1)

    def handle_data(self, data):
        if self._in_skip == 0:
            text = data.strip()
            if text:
                self._text.append(text)

    def get_text(self) -> str:
        return "\n".join(self._text)


def _extract_text_from_html(html: str) -> str:
    parser = _TextExtractor()
    parser.feed(html)
    return parser.get_text()[:5000]  # Cap at 5K chars


# ── Web Fetching ──

async def fetch_url(url: str, timeout: float = 10.0) -> Dict[str, Any]:
    """Fetch a URL and extract text content."""
    def _fetch():
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Aria/1.0"
        })
        with urllib.request.urlopen(req, timeout=int(timeout)) as resp:
            html = resp.read().decode("utf-8", errors="replace")
            return {
                "url": url,
                "status": resp.status,
                "title": _extract_title(html),
                "text": _extract_text_from_html(html),
                "length": len(html),
            }

    loop = asyncio.get_event_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, _fetch),
            timeout=timeout + 2
        )
    except Exception as e:
        return {"url": url, "error": str(e)}


def _extract_title(html: str) -> str:
    match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else ""


# ── Web Search via Gemini ──

async def web_search(query: str, num_results: int = 5) -> Dict[str, Any]:
    """Search the web using Gemini with Google Search grounding."""
    api_key = _get_api_key()
    if not api_key:
        return {"error": "No Gemini API key"}

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    payload = {
        "contents": [{"parts": [{"text": f"Search the web for: {query}\n\nReturn the top {num_results} results with title, URL, and a brief summary for each."}]}],
        "tools": [{"google_search": {}}],
    }

    def _search():
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))

    loop = asyncio.get_event_loop()
    try:
        result = await asyncio.wait_for(loop.run_in_executor(None, _search), timeout=20)
        # Extract text from response
        text = ""
        for candidate in result.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if "text" in part:
                    text += part["text"]
        # Extract grounding sources
        sources = []
        for candidate in result.get("candidates", []):
            metadata = candidate.get("groundingMetadata", {})
            for chunk in metadata.get("groundingChunks", []):
                web = chunk.get("web", {})
                if web.get("uri"):
                    sources.append({"title": web.get("title", ""), "url": web["uri"]})
        return {"query": query, "summary": text[:3000], "sources": sources[:num_results]}
    except Exception as e:
        return {"query": query, "error": str(e)}


# ── Image/Screenshot Analysis via Gemini Vision ──

async def analyze_image(image_path: str, prompt: str = "Describe what you see in this image.") -> Dict[str, Any]:
    """Analyze an image using Gemini Vision."""
    api_key = _get_api_key()
    if not api_key:
        return {"error": "No Gemini API key"}

    # Read and encode image
    try:
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")
    except Exception as e:
        return {"error": f"Cannot read image: {e}"}

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": image_data}},
            ]
        }],
    }

    def _analyze():
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    loop = asyncio.get_event_loop()
    try:
        result = await asyncio.wait_for(loop.run_in_executor(None, _analyze), timeout=35)
        text = ""
        for candidate in result.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if "text" in part:
                    text += part["text"]
        return {"analysis": text, "image_path": image_path}
    except Exception as e:
        return {"error": str(e)}


# ── Self-Test Game ──

async def self_test_game(base_url: str = "http://localhost:8095") -> Dict[str, Any]:
    """Test the game by calling API endpoints and analyzing responses."""
    results = []

    # Test 1: Health check
    try:
        health = await fetch_url(f"{base_url}/health", timeout=5)
        results.append({"test": "health", "passed": "running" in str(health.get("text", "")), "detail": health})
    except Exception as e:
        results.append({"test": "health", "passed": False, "detail": str(e)})

    # Test 2: Cartridge listing
    try:
        def _get_cartridges():
            req = urllib.request.Request(f"{base_url}/api/game/cartridges")
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read())
        loop = asyncio.get_event_loop()
        carts = await loop.run_in_executor(None, _get_cartridges)
        cart_count = len(carts.get("cartridges", []))
        results.append({"test": "cartridges", "passed": cart_count == 3, "detail": f"{cart_count} cartridges found"})
    except Exception as e:
        results.append({"test": "cartridges", "passed": False, "detail": str(e)})

    # Test 3: Load a cartridge and play
    try:
        def _test_gameplay():
            # Load Maya
            req = urllib.request.Request(
                f"{base_url}/api/game/cartridges/load",
                data=json.dumps({"user_id": "self_test", "cartridge_id": "maya"}).encode(),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                config = json.loads(resp.read())

            # Start play
            req = urllib.request.Request(
                f"{base_url}/api/game/play/start",
                data=json.dumps({"user_id": "self_test"}).encode(),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                start = json.loads(resp.read())

            # Look action
            req = urllib.request.Request(
                f"{base_url}/api/game/play/action",
                data=json.dumps({"user_id": "self_test", "action": "look", "target": ""}).encode(),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                look = json.loads(resp.read())

            return {
                "config_title": config.get("title", "?"),
                "start_type": start.get("action_type", "?"),
                "look_narrative": look.get("narrative", "?")[:100],
                "actions_count": len(start.get("available_actions", [])),
            }

        loop = asyncio.get_event_loop()
        gameplay = await loop.run_in_executor(None, _test_gameplay)
        results.append({"test": "gameplay", "passed": bool(gameplay.get("look_narrative")), "detail": gameplay})
    except Exception as e:
        results.append({"test": "gameplay", "passed": False, "detail": str(e)})

    # Test 4: Snapshot
    try:
        def _test_snapshot():
            req = urllib.request.Request(f"{base_url}/api/game/snapshot/self_test")
            with urllib.request.urlopen(req, timeout=5) as resp:
                snap = json.loads(resp.read())
            return {
                "has_config": bool(snap.get("config")),
                "has_player": bool(snap.get("player")),
                "has_map": bool(snap.get("map")),
                "inventory": snap.get("player", {}).get("inventory", []),
                "location": snap.get("player", {}).get("location_id", "?"),
            }
        loop = asyncio.get_event_loop()
        snapshot = await loop.run_in_executor(None, _test_snapshot)
        results.append({"test": "snapshot", "passed": snapshot.get("has_player", False), "detail": snapshot})
    except Exception as e:
        results.append({"test": "snapshot", "passed": False, "detail": str(e)})

    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    return {
        "passed": passed,
        "total": total,
        "all_passed": passed == total,
        "summary": f"{passed}/{total} tests passed",
        "results": results,
    }


# ── Helpers ──

def _get_api_key() -> Optional[str]:
    # Try env first, then file
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    try:
        with open("/storage/emulated/0/Download/perplexity/gemini.txt") as f:
            return f.read().strip()
    except FileNotFoundError:
        return None
