"""
Termux API Router — /api/termux/* endpoints.
Exposes device capabilities to the frontend for Aria's Jarvis features.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/termux", tags=["termux"])


# ── Request Models ──

class VibrationRequest(BaseModel):
    duration_ms: int = 500

class TorchRequest(BaseModel):
    on: bool = True

class NotificationRequest(BaseModel):
    title: str
    content: str
    notification_id: Optional[str] = None

class ClipboardSetRequest(BaseModel):
    text: str

class SmsSendRequest(BaseModel):
    number: str
    text: str

class VolumeSetRequest(BaseModel):
    stream: str
    value: int


# ── Device State (aggregated, cached) ──

@router.get("/device-state")
async def get_device_state():
    """Aggregated device status — battery, temp, RAM, WiFi. Cached, polled every 30s."""
    from services.device_state import get_state, poll_once
    state = get_state()
    if state.last_updated == 0:
        state = await poll_once()
    return state.to_dict()


# ── Battery ──

@router.get("/battery")
async def get_battery():
    """Detailed battery status."""
    from services import termux_service
    return await termux_service.battery()


# ── Hardware Controls ──

@router.post("/torch")
async def set_torch(req: TorchRequest):
    """Toggle flashlight."""
    from services import termux_service
    await termux_service.torch(req.on)
    return {"status": "on" if req.on else "off"}


@router.post("/vibrate")
async def do_vibrate(req: VibrationRequest):
    """Vibrate the device."""
    from services import termux_service
    await termux_service.vibrate(req.duration_ms)
    return {"vibrated": True, "duration_ms": req.duration_ms}


@router.get("/volume")
async def get_volume():
    """Get all volume streams."""
    from services import termux_service
    return await termux_service.volume()


@router.post("/volume")
async def set_volume(req: VolumeSetRequest):
    """Set volume for a stream."""
    from services import termux_service
    return await termux_service.volume(req.stream, req.value)


# ── Notifications ──

@router.post("/notification")
async def send_notification(req: NotificationRequest):
    """Send Android notification."""
    from services import termux_service
    await termux_service.notification(req.title, req.content, req.notification_id)
    return {"sent": True}


@router.delete("/notification/{notification_id}")
async def remove_notification(notification_id: str):
    """Remove a notification."""
    from services import termux_service
    await termux_service.notification_remove(notification_id)
    return {"removed": True}


# ── Clipboard ──

@router.get("/clipboard")
async def get_clipboard():
    """Read clipboard content."""
    from services import termux_service
    text = await termux_service.clipboard_get()
    return {"text": text}


@router.post("/clipboard")
async def set_clipboard(req: ClipboardSetRequest):
    """Write to clipboard."""
    from services import termux_service
    await termux_service.clipboard_set(req.text)
    return {"copied": True}


# ── Network ──

@router.get("/wifi")
async def get_wifi():
    """WiFi connection info."""
    from services import termux_service
    return await termux_service.wifi()


# ── Location ──

@router.get("/location")
async def get_location(provider: str = "network"):
    """Get GPS location. Provider: gps, network, passive."""
    from services import termux_service
    return await termux_service.location(provider)


# ── Communication ──

@router.get("/sms/inbox")
async def get_sms_inbox(limit: int = 10):
    """Read SMS inbox."""
    from services import termux_service
    return await termux_service.sms_inbox(limit)


@router.post("/sms/send")
async def send_sms(req: SmsSendRequest):
    """Send SMS (use with caution)."""
    from services import termux_service
    result = await termux_service.sms_send(req.number, req.text)
    return {"sent": True, "result": result}


@router.get("/contacts")
async def get_contacts():
    """List contacts."""
    from services import termux_service
    return await termux_service.contact_list()


@router.get("/calls")
async def get_call_log(limit: int = 10):
    """Recent call log."""
    from services import termux_service
    return await termux_service.call_log(limit)


# ── Sensors ──

@router.get("/sensors/{sensor_type}")
async def get_sensor(sensor_type: str, count: int = 1):
    """Read sensor data. Types: accelerometer, gyroscope, light, pressure, proximity."""
    from services import termux_service
    return await termux_service.sensor(sensor_type, count)


# ── Camera ──

@router.post("/camera/photo")
async def take_photo(camera_id: int = 0):
    """Take a photo. Returns file path and base64 data."""
    import base64
    from services import termux_service
    path = await termux_service.camera_photo(camera_id)
    # Read and return as base64
    b64 = ""
    try:
        import os
        if os.path.exists(path):
            with open(path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("ascii")
    except Exception:
        pass
    return {"path": path, "base64": b64}
