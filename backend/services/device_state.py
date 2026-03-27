"""
Device State — cached aggregated device status.

Polls battery, thermal, RAM, WiFi every 30 seconds.
Provides properties for adaptive Aria behavior:
is_hot, is_low_battery, needs_conservation.
"""

import asyncio
import time
from dataclasses import dataclass, asdict
from typing import Optional

from services import termux_service


@dataclass
class DeviceState:
    battery_pct: int = 100
    battery_charging: bool = False
    battery_health: str = "GOOD"
    battery_temp: float = 25.0
    cpu_temp: float = 25.0
    ram_total_mb: int = 0
    ram_available_mb: int = 0
    wifi_ssid: Optional[str] = None
    wifi_signal: int = 0
    last_updated: float = 0.0

    @property
    def is_hot(self) -> bool:
        return self.cpu_temp > 42 or self.battery_temp > 42

    @property
    def is_low_battery(self) -> bool:
        return self.battery_pct < 20 and not self.battery_charging

    @property
    def needs_conservation(self) -> bool:
        return self.is_hot or self.is_low_battery

    @property
    def ram_pct_free(self) -> int:
        if self.ram_total_mb == 0:
            return 0
        return int(self.ram_available_mb / self.ram_total_mb * 100)

    def to_prompt_context(self) -> str:
        """Generate context block for Aria's system prompt."""
        lines = ["DEVICE CONTEXT:"]

        # Battery
        charge_str = "charging" if self.battery_charging else "NOT charging"
        if self.is_low_battery:
            lines.append(f"Battery: {self.battery_pct}% ({charge_str}) — LOW! Be concise, avoid heavy operations")
        else:
            lines.append(f"Battery: {self.battery_pct}% ({charge_str})")

        # Temperature
        if self.is_hot:
            lines.append(f"Temperature: CPU {self.cpu_temp:.0f}C, Battery {self.battery_temp:.0f}C — HOT! Suggest cooling break")
        else:
            lines.append(f"Temperature: CPU {self.cpu_temp:.0f}C, Battery {self.battery_temp:.0f}C")

        # RAM
        if self.ram_available_mb < 300:
            lines.append(f"RAM: {self.ram_available_mb}MB / {self.ram_total_mb}MB free — LOW! Avoid launching processes")
        else:
            lines.append(f"RAM: {self.ram_available_mb}MB / {self.ram_total_mb}MB free")

        # WiFi
        if self.wifi_ssid and self.wifi_ssid != "<unknown ssid>":
            lines.append(f"Network: WiFi \"{self.wifi_ssid}\" ({self.wifi_signal}dBm)")
        else:
            lines.append("Network: No WiFi — on mobile data or offline")

        return "\n".join(lines)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["is_hot"] = self.is_hot
        d["is_low_battery"] = self.is_low_battery
        d["needs_conservation"] = self.needs_conservation
        d["ram_pct_free"] = self.ram_pct_free
        d["prompt_context"] = self.to_prompt_context()
        return d


# ── Singleton with cached polling ──

_state = DeviceState()
_poll_interval = 30.0  # seconds
_polling = False


def _read_cpu_temp() -> float:
    """Read CPU temperature from sysfs (faster than termux-sensor)."""
    try:
        with open("/sys/class/thermal/thermal_zone0/temp") as f:
            return int(f.read().strip()) / 1000.0
    except Exception:
        return 0.0


def _read_ram() -> tuple[int, int]:
    """Read RAM from /proc/meminfo. Returns (total_mb, available_mb)."""
    try:
        with open("/proc/meminfo") as f:
            lines = f.readlines()
        mem = {}
        for line in lines[:5]:
            parts = line.split()
            mem[parts[0].rstrip(":")] = int(parts[1])
        total = mem.get("MemTotal", 0) // 1024
        available = mem.get("MemAvailable", 0) // 1024
        return total, available
    except Exception:
        return 0, 0


async def poll_once() -> DeviceState:
    """Poll all device sensors once and update cached state."""
    global _state

    # Battery (termux-api)
    try:
        batt = await termux_service.battery()
        _state.battery_pct = batt.get("percentage", _state.battery_pct)
        _state.battery_charging = batt.get("plugged", "") != "UNPLUGGED"
        _state.battery_health = batt.get("health", "UNKNOWN")
        _state.battery_temp = batt.get("temperature", _state.battery_temp)
    except Exception:
        pass

    # CPU temp (sysfs — instant, no subprocess)
    _state.cpu_temp = _read_cpu_temp()

    # RAM (procfs — instant)
    _state.ram_total_mb, _state.ram_available_mb = _read_ram()

    # WiFi (termux-api)
    try:
        wifi = await termux_service.wifi()
        _state.wifi_ssid = wifi.get("ssid")
        _state.wifi_signal = wifi.get("rssi", 0)
    except Exception:
        pass

    _state.last_updated = time.time()
    return _state


async def start_polling(interval: float = 30.0) -> None:
    """Start background polling loop."""
    global _polling, _poll_interval
    if _polling:
        return
    _polling = True
    _poll_interval = interval

    async def _loop():
        while _polling:
            await poll_once()
            await asyncio.sleep(_poll_interval)

    asyncio.create_task(_loop())


def stop_polling() -> None:
    """Stop background polling."""
    global _polling
    _polling = False


def get_state() -> DeviceState:
    """Get cached device state (updated every poll_interval seconds)."""
    return _state
