"""
ICD-11 Integration Service — WHO International Classification of Diseases.

Provides:
1. OAuth2 token management (auto-refresh)
2. Disorder lookup by code or name
3. Bulk import of Chapter 06 (Mental disorders) taxonomy
4. Search across the classification

Credentials stored at: /storage/emulated/0/Download/perplexity/icd11_credentials.json
"""

import json
import os
import time
import urllib.request
import urllib.parse
import ssl
from typing import Dict, Any, List, Optional


CREDENTIALS_PATH = "/storage/emulated/0/Download/perplexity/icd11_credentials.json"
CACHE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data", "psychology", "icd11_mental_disorders.json"
)

# Chapter 06 entity ID in ICD-11
CHAPTER_06_ID = "334423054"

# SSL context
_ssl_ctx = ssl.create_default_context()


class ICD11Service:
    """
    ICD-11 API client with token caching and bulk import.
    """

    def __init__(self, credentials_path: str = CREDENTIALS_PATH):
        self._creds_path = credentials_path
        self._token: Optional[str] = None
        self._token_expires: float = 0
        self._creds: Optional[Dict] = None
        self._base_url = "https://id.who.int/icd/release/11/2024-01/mms"

    def _load_credentials(self) -> Dict:
        if self._creds is None:
            with open(self._creds_path) as f:
                self._creds = json.load(f)
        return self._creds

    def _get_token(self) -> str:
        """Get OAuth2 token, refreshing if expired."""
        if self._token and time.time() < self._token_expires:
            return self._token

        creds = self._load_credentials()
        data = urllib.parse.urlencode({
            "client_id": creds["client_id"],
            "client_secret": creds["client_secret"],
            "scope": "icdapi_access",
            "grant_type": "client_credentials",
        }).encode()

        token_url = creds.get("token_url", "https://icdaccessmanagement.who.int/connect/token")
        req = urllib.request.Request(token_url, data=data)
        req.add_header("Content-Type", "application/x-www-form-urlencoded")

        resp = urllib.request.urlopen(req, context=_ssl_ctx, timeout=30)
        token_data = json.loads(resp.read())

        self._token = token_data["access_token"]
        # Tokens typically valid for 3600 seconds; refresh 5 min early
        self._token_expires = time.time() + token_data.get("expires_in", 3600) - 300
        return self._token

    def _api_get(self, url: str) -> Dict:
        """Make an authenticated GET request to the ICD-11 API."""
        token = self._get_token()
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Accept", "application/json")
        req.add_header("Accept-Language", "en")
        req.add_header("API-Version", "v2")

        resp = urllib.request.urlopen(req, context=_ssl_ctx, timeout=30)
        return json.loads(resp.read())

    # ── Lookup ────────────────────────────────────────────────────

    def get_entity(self, entity_id: str) -> Dict[str, Any]:
        """Get a single ICD-11 entity by ID."""
        url = f"{self._base_url}/{entity_id}"
        data = self._api_get(url)
        return self._parse_entity(data)

    def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search ICD-11 for disorders matching a query."""
        params = urllib.parse.urlencode({
            "q": query,
            "subtreeFilterUsesFoundationDescendants": "false",
            "includeKeywordResult": "false",
            "useFlexiSearch": "true",
            "flatResults": "true",
        })
        url = f"{self._base_url}/search?{params}"
        data = self._api_get(url)

        results = []
        for item in data.get("destinationEntities", [])[:limit]:
            results.append({
                "id": item.get("id", "").split("/")[-1],
                "title": item.get("title", ""),
                "code": item.get("theCode", ""),
                "score": item.get("score", 0),
            })
        return results

    # ── Bulk Import ───────────────────────────────────────────────

    def import_mental_disorders(self, max_depth: int = 3,
                                 delay: float = 0.3) -> Dict[str, Any]:
        """
        Bulk import Chapter 06 (Mental disorders) taxonomy.

        Recursively walks the ICD-11 tree up to max_depth levels.
        Saves to data/psychology/icd11_mental_disorders.json.

        Returns the full taxonomy tree.
        """
        print("Fetching ICD-11 Chapter 06: Mental disorders...")
        root = self._fetch_subtree(CHAPTER_06_ID, depth=0,
                                    max_depth=max_depth, delay=delay)

        # Count
        count = self._count_nodes(root)
        root["_meta"] = {
            "source": "WHO ICD-11 API (2024-01 release)",
            "chapter": "06 — Mental, behavioural or neurodevelopmental disorders",
            "imported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "total_entities": count,
            "max_depth": max_depth,
        }

        # Save
        os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
        with open(CACHE_PATH, "w") as f:
            json.dump(root, f, indent=2, ensure_ascii=False)

        print(f"Saved {count} entities to {CACHE_PATH}")
        return root

    def _fetch_subtree(self, entity_id: str, depth: int,
                        max_depth: int, delay: float) -> Dict:
        """Recursively fetch an entity and its children."""
        time.sleep(delay)  # Rate limiting

        url = f"{self._base_url}/{entity_id}"
        try:
            data = self._api_get(url)
        except Exception as e:
            return {"id": entity_id, "error": str(e)}

        node = self._parse_entity(data)

        # Recurse into children if not at max depth
        if depth < max_depth and data.get("child"):
            node["children"] = []
            for child_url in data["child"]:
                child_id = child_url.split("/")[-1]
                child_node = self._fetch_subtree(
                    child_id, depth + 1, max_depth, delay
                )
                node["children"].append(child_node)
                # Progress indicator
                if depth == 0:
                    print(f"  [{len(node['children'])}/{len(data['child'])}] "
                          f"{child_node.get('title', child_id)}")

        return node

    def _parse_entity(self, data: Dict) -> Dict:
        """Parse an ICD-11 API response into a clean dict."""
        title = data.get("title", {})
        definition = data.get("definition", {})
        coding_note = data.get("codingNote", {})

        return {
            "id": data.get("@id", "").split("/")[-1],
            "code": data.get("code", data.get("codeRange", "")),
            "title": title.get("@value", "") if isinstance(title, dict) else str(title),
            "definition": definition.get("@value", "") if isinstance(definition, dict) else str(definition),
            "coding_note": coding_note.get("@value", "") if isinstance(coding_note, dict) else "",
            "child_count": len(data.get("child", [])),
        }

    def _count_nodes(self, node: Dict) -> int:
        """Count total nodes in a tree."""
        count = 1
        for child in node.get("children", []):
            count += self._count_nodes(child)
        return count

    # ── Cached Access ─────────────────────────────────────────────

    def get_cached_taxonomy(self) -> Optional[Dict]:
        """Load the cached ICD-11 taxonomy (if previously imported)."""
        if os.path.exists(CACHE_PATH):
            with open(CACHE_PATH) as f:
                return json.load(f)
        return None

    def get_disorder_list(self) -> List[Dict]:
        """Get a flat list of all imported disorders (from cache)."""
        taxonomy = self.get_cached_taxonomy()
        if not taxonomy:
            return []

        flat = []
        self._flatten(taxonomy, flat, depth=0)
        return flat

    def _flatten(self, node: Dict, result: List, depth: int):
        """Flatten taxonomy tree into a list with depth info."""
        result.append({
            "id": node.get("id", ""),
            "code": node.get("code", ""),
            "title": node.get("title", ""),
            "depth": depth,
        })
        for child in node.get("children", []):
            self._flatten(child, result, depth + 1)


# ── Convenience ────────────────────────────────────────────────────

def import_icd11_mental_disorders(max_depth: int = 2, delay: float = 0.4):
    """
    One-shot import of ICD-11 mental disorders taxonomy.

    Usage:
        python3 -c "from services.icd11_service import import_icd11_mental_disorders; import_icd11_mental_disorders()"
    """
    svc = ICD11Service()
    result = svc.import_mental_disorders(max_depth=max_depth, delay=delay)
    meta = result.get("_meta", {})
    print(f"\nDone! {meta.get('total_entities', '?')} entities imported.")
    return result
