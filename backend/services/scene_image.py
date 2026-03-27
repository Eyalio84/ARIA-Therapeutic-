"""
Scene Image Generation — Per-location atmospheric images via Gemini Imagen.

Generates and caches scene images for game locations based on:
- Location description + atmosphere
- Current mood/theme colors
- Time of day (from device state)

Uses Gemini 2.0 Flash with image generation capability.
"""

import os
import json
import hashlib
import urllib.request
import ssl
from typing import Optional, Dict

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "scene_cache")
_ssl_ctx = ssl.create_default_context()


def _load_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "")
    if key:
        return key
    key_path = "/storage/emulated/0/Download/perplexity/gemini.txt"
    if os.path.exists(key_path):
        with open(key_path) as f:
            return f.read().strip()
    return ""


def _cache_key(location_id: str, mood: str, time_of_day: str) -> str:
    raw = f"{location_id}:{mood}:{time_of_day}"
    return hashlib.md5(raw.encode()).hexdigest()


class SceneImageService:
    """Generates and caches atmospheric scene images."""

    def __init__(self):
        self.api_key = _load_api_key()
        os.makedirs(CACHE_DIR, exist_ok=True)

    def generate_scene(self, location_name: str, location_description: str,
                        atmosphere: str, mood_color: str = "",
                        time_of_day: str = "day",
                        location_id: str = "") -> Optional[Dict]:
        """
        Generate a scene image for a game location.

        Returns: {"image_base64": str, "prompt_used": str, "cached": bool}
        or None on failure.
        """
        if not self.api_key:
            return None

        # Check cache
        cache_id = _cache_key(location_id or location_name, atmosphere, time_of_day)
        cache_path = os.path.join(CACHE_DIR, f"{cache_id}.json")
        if os.path.exists(cache_path):
            with open(cache_path) as f:
                cached = json.load(f)
                cached["cached"] = True
                return cached

        # Build prompt
        prompt = self._build_prompt(location_name, location_description,
                                     atmosphere, time_of_day)

        # Call Gemini
        result = self._call_gemini(prompt)
        if not result:
            return None

        # Cache
        cache_data = {
            "image_base64": result,
            "prompt_used": prompt,
            "location_id": location_id,
            "cached": False,
        }
        with open(cache_path, "w") as f:
            json.dump(cache_data, f)

        return cache_data

    def _build_prompt(self, name: str, description: str,
                       atmosphere: str, time_of_day: str) -> str:
        time_mod = {
            "dawn": "early morning light, pink and gold sky, gentle mist",
            "day": "full daylight, clear atmosphere",
            "dusk": "warm sunset colors, long shadows, golden hour",
            "night": "moonlit, stars visible, soft darkness, peaceful night",
            "dream": "surreal lighting, soft glow, dreamlike quality, slightly ethereal",
        }.get(time_of_day, "natural lighting")

        return (
            f"Generate a wide atmospheric landscape illustration for a narrative game. "
            f"Scene: {name} — {description}. "
            f"Mood: {atmosphere}. "
            f"Lighting: {time_mod}. "
            f"Style: painterly digital art, Studio Ghibli inspired, warm and inviting, "
            f"no text, no characters, no UI elements. "
            f"Aspect ratio: 16:9 landscape."
        )

    def _call_gemini(self, prompt: str) -> Optional[str]:
        """Call Gemini API for image generation. Returns base64 image or None."""
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash-exp:generateContent?key={self.api_key}"
        )

        payload = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
            },
        }).encode()

        req = urllib.request.Request(url, data=payload)
        req.add_header("Content-Type", "application/json")

        try:
            resp = urllib.request.urlopen(req, context=_ssl_ctx, timeout=60)
            data = json.loads(resp.read())

            # Extract image from response
            candidates = data.get("candidates", [])
            if not candidates:
                return None

            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                if "inlineData" in part:
                    return part["inlineData"].get("data")

            return None
        except Exception as e:
            print(f"Scene image generation failed: {e}")
            return None

    def get_cached_scene(self, location_id: str, mood: str = "",
                          time_of_day: str = "day") -> Optional[Dict]:
        """Get a cached scene image without generating."""
        cache_id = _cache_key(location_id, mood, time_of_day)
        cache_path = os.path.join(CACHE_DIR, f"{cache_id}.json")
        if os.path.exists(cache_path):
            with open(cache_path) as f:
                data = json.load(f)
                data["cached"] = True
                return data
        return None

    def clear_cache(self):
        """Clear all cached scene images."""
        import glob
        for f in glob.glob(os.path.join(CACHE_DIR, "*.json")):
            os.remove(f)
