"""
Shared aiohttp ClientSession — persistent connection pool for all API calls.

Create once at server startup, reuse for all requests.
Connection pooling eliminates repeated TLS handshakes (saves 50-200ms per request).
"""
import aiohttp
from typing import Optional

_session: Optional[aiohttp.ClientSession] = None


async def get_session() -> aiohttp.ClientSession:
    """Get or create the shared session."""
    global _session
    if _session is None or _session.closed:
        _session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=60),
            connector=aiohttp.TCPConnector(limit=10, keepalive_timeout=30),
        )
    return _session


async def close_session():
    """Close the shared session (call on shutdown)."""
    global _session
    if _session and not _session.closed:
        await _session.close()
        _session = None
