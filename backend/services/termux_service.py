"""
Termux Service — async wrapper for termux-api commands.

Provides typed Python access to Android device capabilities:
battery, sensors, camera, GPS, SMS, notifications, torch, vibration,
clipboard, contacts, volume, WiFi, NFC, media player.

All methods use asyncio.create_subprocess_exec (not shell) with timeout protection.
Arguments are passed as list elements, never interpolated into strings.
"""

import asyncio
import json
from typing import Optional, Dict, Any, List


async def _run(cmd: str, args: Optional[List[str]] = None, timeout: float = 5.0) -> str:
    """Execute a termux command safely via create_subprocess_exec (no shell)."""
    full_args = [cmd] + (args or [])
    try:
        proc = await asyncio.create_subprocess_exec(
            *full_args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return stdout.decode("utf-8").strip()
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except ProcessLookupError:
            pass
        return json.dumps({"error": f"Timeout after {timeout}s"})
    except Exception as e:
        return json.dumps({"error": str(e)})


async def _run_json(cmd: str, args: Optional[List[str]] = None, timeout: float = 5.0) -> Any:
    """Execute a termux command and parse JSON output."""
    raw = await _run(cmd, args, timeout)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw": raw, "error": "Non-JSON output"}


# ── Device Hardware ──

async def battery() -> Dict[str, Any]:
    """Battery status: percentage, health, temperature, charging state."""
    return await _run_json("termux-battery-status")


async def vibrate(duration_ms: int = 500) -> None:
    """Vibrate the device."""
    await _run("termux-vibrate", ["-d", str(duration_ms)])


async def torch(on: bool = True) -> None:
    """Toggle flashlight."""
    await _run("termux-torch", ["on" if on else "off"])


async def brightness(value: int) -> Any:
    """Set screen brightness (0-255)."""
    return await _run_json("termux-brightness", [str(value)])


async def volume(stream: Optional[str] = None, value: Optional[int] = None) -> Any:
    """Get or set volume."""
    if stream and value is not None:
        return await _run_json("termux-volume", [stream, str(value)])
    return await _run_json("termux-volume")


# ── Sensors ──

async def sensor(sensor_type: str, count: int = 1) -> Any:
    """Read sensor data. Types: accelerometer, gyroscope, light, pressure, proximity."""
    return await _run_json("termux-sensor", ["-s", sensor_type, "-n", str(count)], timeout=10.0)


async def camera_photo(camera_id: int = 0, output_path: Optional[str] = None) -> str:
    """Take a photo. Returns the file path."""
    import time
    path = output_path or f"/data/data/com.termux/files/home/aria_photo_{int(time.time())}.jpg"
    await _run("termux-camera-photo", ["-c", str(camera_id), path], timeout=15.0)
    return path


# ── Location ──

async def location(provider: str = "gps") -> Any:
    """Get GPS location."""
    return await _run_json("termux-location", ["-p", provider], timeout=30.0)


# ── Network ──

async def wifi() -> Any:
    """Current WiFi connection info."""
    return await _run_json("termux-wifi-connectioninfo")


# ── Communication ──

async def sms_inbox(limit: int = 10) -> Any:
    """Read SMS inbox."""
    return await _run_json("termux-sms-inbox", ["-l", str(limit)])


async def sms_send(number: str, text: str) -> str:
    """Send SMS."""
    return await _run("termux-sms-send", ["-n", number, text], timeout=10.0)


async def contact_list() -> Any:
    """List contacts."""
    return await _run_json("termux-contact-list", timeout=10.0)


async def call_log(limit: int = 10) -> Any:
    """Recent call log."""
    return await _run_json("termux-call-log", ["-l", str(limit)])


# ── Clipboard ──

async def clipboard_get() -> str:
    """Read clipboard content."""
    return await _run("termux-clipboard-get")


async def clipboard_set(text: str) -> None:
    """Write to clipboard."""
    await _run("termux-clipboard-set", [text])


# ── Notifications ──

async def notification(title: str, content: str, notification_id: Optional[str] = None) -> None:
    """Send Android notification."""
    args = ["--title", title, "--content", content]
    if notification_id:
        args.extend(["--id", notification_id])
    await _run("termux-notification", args)


async def notification_remove(notification_id: str) -> None:
    """Remove notification by ID."""
    await _run("termux-notification-remove", ["--id", notification_id])


# ── Media ──

async def tts_speak(text: str) -> None:
    """Text-to-speech via Android TTS."""
    await _run("termux-tts-speak", [text], timeout=30.0)


# ── NFC ──

async def nfc_read() -> Any:
    """Read NFC tag."""
    return await _run_json("termux-nfc", timeout=30.0)


# ── System ──

async def dialog(widget: str = "confirm", title: str = "Confirm") -> Any:
    """Show Android dialog."""
    return await _run_json("termux-dialog", [widget, "-t", title], timeout=60.0)


async def open_url(url: str) -> None:
    """Open URL in default browser."""
    await _run("termux-open-url", [url])


async def wake_lock(acquire: bool = True) -> None:
    """Acquire or release wake lock."""
    cmd = "termux-wake-lock" if acquire else "termux-wake-unlock"
    await _run(cmd)
