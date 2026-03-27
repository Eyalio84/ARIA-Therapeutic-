"""
Gemini Narrative Service — LLM-powered narrative generation for the game engine.

Uses Gemini API for:
1. Enriching game location descriptions from interview answers
2. Generating dynamic NPC dialogue
3. Creating personalized quest narratives
4. Powering the "Story So Far" recap with natural language
5. Mirror bubble reflections with context awareness

Uses aiohttp with persistent connection pool (saves 50-200ms per request).
Fallback to urllib for sync contexts.
"""

import json
import os
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List


def _load_api_key() -> str:
    """Load Gemini API key from environment or config."""
    key = os.environ.get("GEMINI_API_KEY", "")
    if key:
        return key
    # Try key file
    key_path = "/storage/emulated/0/Download/perplexity/gemini.txt"
    if os.path.exists(key_path):
        with open(key_path) as f:
            key = f.read().strip()
        if key:
            return key
    # Fallback: AI-LAB config
    config_path = "/storage/emulated/0/Download/gemini-3-pro/AI-LAB/config/lab_config.json"
    if os.path.exists(config_path):
        with open(config_path) as f:
            cfg = json.load(f)
        key = cfg.get("api_config", {}).get("gemini_api_key", "")
    return key


class GeminiNarrative:
    """
    Gemini-powered narrative generation.

    All methods are synchronous (urllib) and can be wrapped with
    asyncio.run_in_executor for async contexts.
    """

    MODEL = "gemini-2.5-flash"
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self, api_key: str = None):
        self.api_key = api_key or _load_api_key()

    def _call(self, prompt: str, max_tokens: int = 1024,
              temperature: float = 0.7) -> Optional[str]:
        """Make a Gemini API call. Returns text or None on failure."""
        if not self.api_key:
            return None

        url = f"{self.BASE_URL}/{self.MODEL}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                candidates = result.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
        except (urllib.error.URLError, urllib.error.HTTPError, Exception) as e:
            print(f"[GeminiNarrative] API error: {e}")
            return None

        return None

    async def _acall(self, prompt: str, max_tokens: int = 1024,
                     temperature: float = 0.7) -> Optional[str]:
        """Async Gemini API call via aiohttp with persistent connections."""
        if not self.api_key:
            return None

        from services.http_client import get_session

        url = f"{self.BASE_URL}/{self.MODEL}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }

        try:
            session = await get_session()
            async with session.post(url, json=payload) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    candidates = result.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "")
                else:
                    text = await resp.text()
                    print(f"[GeminiNarrative] API {resp.status}: {text[:100]}")
        except Exception as e:
            print(f"[GeminiNarrative] aiohttp error: {e}")
            return None

        return None

    # Async versions of generation methods
    async def aenrich_location(self, location_name: str, base_description: str,
                                tone: str, genre: str) -> str:
        prompt = f"""You are a narrative game writer. Write a vivid, atmospheric description
for a game location. Keep it 2-3 sentences. Tone: {tone}. Genre: {genre}.
Never scary or disturbing — inviting and engaging.

Location: {location_name}
Base idea: {base_description}

Write ONLY the description, nothing else:"""
        result = await self._acall(prompt, max_tokens=400, temperature=0.8)
        return result.strip() if result else base_description

    async def agenerate_npc_dialogue(self, npc_name: str, npc_role: str,
                                      npc_personality: str,
                                      player_context: str,
                                      interaction_count: int) -> str:
        prompt = f"""You are writing dialogue for a game NPC. Keep it natural, warm, 1-3 sentences.
Never clinical or therapeutic-sounding. This is a GAME character speaking.

Character: {npc_name}
Role: {npc_role}
Personality: {npc_personality}
This is interaction #{interaction_count} with the player.
Player context: {player_context}

Write ONLY the dialogue line (in quotes), nothing else:"""
        result = await self._acall(prompt, max_tokens=150, temperature=0.8)
        if result:
            text = result.strip().strip('"').strip("'")
            return f'**{npc_name}**: "{text}"'
        return f'**{npc_name}** nods thoughtfully.'

    async def agenerate_quest_narrative(self, quest_title: str,
                                         stage_title: str,
                                         protagonist: str,
                                         companion: str,
                                         context: str) -> str:
        comp_line = f" {companion} is with you." if companion else ""
        prompt = f"""You are narrating a text adventure game. Write 2-4 sentences for this scene.
Tone: warm, engaging, never scary. The player is the hero.

Quest: {quest_title}
Scene: {stage_title}
Protagonist: {protagonist}{comp_line}
Context: {context}

Write ONLY the scene narration:"""
        result = await self._acall(prompt, max_tokens=250, temperature=0.7)
        return result.strip() if result else f"The adventure continues. {protagonist} moves forward."

    def is_available(self) -> bool:
        """Check if Gemini API is accessible."""
        if not self.api_key:
            return False
        result = self._call(
            "You are a test. Respond with exactly: AVAILABLE",
            max_tokens=50, temperature=0.0
        )
        return result is not None and len(result.strip()) > 0

    # ── Narrative Generation Methods ────────────────────────────

    def enrich_location(self, location_name: str, base_description: str,
                         tone: str, genre: str) -> str:
        """Enrich a location description with vivid, atmospheric narrative."""
        prompt = f"""You are a narrative game writer. Write a vivid, atmospheric description
for a game location. Keep it 2-3 sentences. Tone: {tone}. Genre: {genre}.
Never scary or disturbing — inviting and engaging.

Location: {location_name}
Base idea: {base_description}

Write ONLY the description, nothing else:"""

        result = self._call(prompt, max_tokens=400, temperature=0.8)
        return result.strip() if result else base_description

    def generate_npc_dialogue(self, npc_name: str, npc_role: str,
                                npc_personality: str,
                                player_context: str,
                                interaction_count: int) -> str:
        """Generate dynamic NPC dialogue based on context."""
        prompt = f"""You are writing dialogue for a game NPC. Keep it natural, warm, 1-3 sentences.
Never clinical or therapeutic-sounding. This is a GAME character speaking.

Character: {npc_name}
Role: {npc_role}
Personality: {npc_personality}
This is interaction #{interaction_count} with the player.
Player context: {player_context}

Write ONLY the dialogue line (in quotes), nothing else:"""

        result = self._call(prompt, max_tokens=150, temperature=0.8)
        if result:
            # Clean up — remove quotes if wrapped
            text = result.strip().strip('"').strip("'")
            return f'**{npc_name}**: "{text}"'
        return f'**{npc_name}** nods thoughtfully.'

    def generate_quest_narrative(self, quest_title: str,
                                  stage_title: str,
                                  protagonist: str,
                                  companion: str,
                                  context: str) -> str:
        """Generate narrative for a quest stage."""
        comp_line = f" {companion} is with you." if companion else ""
        prompt = f"""You are narrating a text adventure game. Write 2-4 sentences for this scene.
Tone: warm, engaging, never scary. The player is the hero.

Quest: {quest_title}
Scene: {stage_title}
Protagonist: {protagonist}{comp_line}
Context: {context}

Write ONLY the scene narration:"""

        result = self._call(prompt, max_tokens=250, temperature=0.7)
        return result.strip() if result else f"The adventure continues. {protagonist} moves forward."

    def generate_mirror_reflection(self, user_answer: str,
                                     question_context: str,
                                     vibe: str) -> str:
        """Generate a gentle mirror bubble reflection."""
        vibe_instruction = {
            "build_cool": "Stay entirely within the game fiction. No therapy language.",
            "your_way": "Gently bridge fiction and reality. Very subtle.",
            "explore_together": "You can gently connect the story to the person's real feelings.",
        }.get(vibe, "Stay within the game fiction.")

        prompt = f"""You are Aria, a warm creative companion helping someone build a game.
The user just shared something that seems meaningful. Write a brief, gentle reflection.
1 sentence only. {vibe_instruction}
Never analyze, diagnose, or interpret. Just reflect warmth.

Question was about: {question_context}
User said: {user_answer}

Your reflection:"""

        result = self._call(prompt, max_tokens=200, temperature=0.6)
        return result.strip() if result else "That feels important."

    def generate_story_recap(self, protagonist: str, companion: str,
                              location: str, concerns: List[str],
                              last_event: str) -> str:
        """Generate a natural 'Story So Far' recap for session handoff."""
        concerns_str = ", ".join(concerns[:3]) if concerns else ""
        prompt = f"""You are Aria, welcoming a player back to their game. Write a warm,
brief recap (2-3 sentences) of where they left off. Natural and friendly.

Protagonist: {protagonist}
Companion: {companion}
Last location: {location}
What was happening: {last_event}
{"Themes being explored: " + concerns_str if concerns_str else ""}

End with an invitation to continue. Write the recap:"""

        result = self._call(prompt, max_tokens=200, temperature=0.6)
        return result.strip() if result else f"Welcome back! {protagonist} is ready to continue."

    def check_narrative_safety(self, text: str) -> bool:
        """Quick check if generated narrative is appropriate. Returns True if safe."""
        # Use the existing TherapySafetyService instead of an API call
        from services.therapy_safety import TherapySafetyService
        safety = TherapySafetyService()
        result = safety.check_response(text)
        return result.action == "pass"
