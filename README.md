# Aria Personal — Therapeutic AI Voice Assistant

**Author**: Eyal Nof
**Platform**: Next.js 15 + FastAPI, runs on Android/Termux (Galaxy S21 FE)
**Status**: Working prototype — SU Lab + Game + Dashboard + Voice

---

## What Is This

Aria is a real-time bidirectional voice AI assistant built on Gemini Live. She narrates therapeutic games, controls a visual composition canvas, and is being fine-tuned to run entirely on-device.

### Key Pages

| Route | Purpose |
|-------|---------|
| `/` | NAI v2.0 — KG search, introspection, store |
| `/game` | Therapeutic narrative game with voice |
| `/su` | SU Lab — 45-function voice-controlled canvas |
| `/dashboard` | Therapist dashboard (6-tab DevHub) |
| `/docs` | Documentation viewer/editor |

---

## Architecture

```
Frontend (Next.js 15, React 19, Zustand)
├── /            NAI — KG search, persona, store
├── /game        Therapeutic game — Aria narrator
├── /su          SU Lab — voice canvas (45 functions)
├── /dashboard   Therapist — controls, logs, clinical
└── /docs        Markdown viewer/editor

Backend (FastAPI, Python 3)
├── serve_game.py     Main server (port 8095)
├── routers/          7 router modules
│   ├── game.py       Game engine
│   ├── aria.py       Voice/Gemini Live
│   ├── therapy.py    Clinical data
│   ├── dashboard.py  Therapist panel
│   ├── termux.py     Device APIs
│   ├── docs.py       Documentation API
│   └── kg.py         Knowledge graph
└── services/         Business logic

Voice (Gemini Live WebSocket)
├── AriaCore          Engine: mic, playback, functions
├── GeminiLiveProvider   BidiGenerateContent WebSocket
└── 80+ function declarations (game + SU + system)

Local AI (in progress)
├── FunctionGemma 270M   Voice→function routing (242MB)
├── Kokoro 82M           Text→speech (141MB)
└── Training pipeline    1,448 examples, HF AutoTrain
```

---

## Quick Start

```bash
# Backend
cd backend && python3 serve_game.py 8095

# Frontend
cd /root/aria-personal && HOSTNAME=localhost npx next dev -p 3001

# Open
# http://localhost:3001      — NAI home
# http://localhost:3001/su   — SU Lab
# http://localhost:3001/game — Game
# http://localhost:3001/docs — Documentation
```

---

## Key Documentation

Access via `/docs` page or directly:

| Doc | Path |
|-----|------|
| Aria Voice Reference | `docs/ARIA-VOICE-ASSISTANT-REFERENCE.md` |
| Components Registry | `src/components/game/COMPONENTS.md` |
| Structured Data Upgrade | `docs/STRUCTURED-DATA-UPGRADE.md` |
| FunctionGemma Training | `data/finetune/TRAINING-README.md` |
| Therapeutic Research | `docs/THERAPEUTIC-GAME-RESEARCH.md` |
| Psychology Sources | `docs/PSYCHOLOGY-DATA-SOURCES.md` |

---

## SU Lab (45 Voice Functions)

Voice-controlled composition engine that doubles as a FunctionGemma training data factory.

**Object types**: Shape, Image, Button
**Canvas**: Zoom, background, grid, snap-to-grid
**Relationships**: Align, layer, group, distribute, export
**Animations**: Spin, bounce, pulse, orbit
**Device**: Torch, battery, notifications, volume
**Training**: Auto-captures every voice→function pair

---

## FunctionGemma Pipeline

Goal: Replace Gemini Live (cloud) with local 270M model for zero-cost offline voice control.

```
generate_dataset.py → 1,448 examples → HF AutoTrain → GGUF Q4
                                                        ↓
scripts/download_functiongemma.py → phone → local inference (~50ms)
```

---

## Context Packets

Session handoffs stored in `context-packets/SESSION-*.md`. Latest:
`context-packets/SESSION-2026-03-22_15-37.md`

---

*Built with Next.js 15, FastAPI, Gemini Live, Zustand, on Android/Termux*
