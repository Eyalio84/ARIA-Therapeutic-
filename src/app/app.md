<!-- last-verified: 2026-03-25 -->

# app/ — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `src/app/` |
| **Purpose** | Next.js App Router — page routes and root layout for the Aria application |
| **Framework / stack** | Next.js 14+ (App Router), React, TypeScript |
| **Entry point** | `layout.tsx` |
| **External dependencies** | `@/components/TabBar`, `@/components/TabContainer`, `@/components/dashboard/DashboardShell`, `@/components/game/GameShell`, `@/components/su/SUShell`, Google Fonts (Instrument Serif, DM Sans, JetBrains Mono) |
| **Component/file count** | 7 files across 5 directories |
| **Architecture style** | Thin route wrappers delegating to component shells |

## File Tree

```
app/
├── layout.tsx          # Root HTML layout, fonts, metadata
├── page.tsx            # Home route — TabBar + TabContainer
├── globals.css         # Global styles, animations, dark theme
├── dashboard/
│   └── page.tsx        # /dashboard — DashboardShell wrapper
├── docs/
│   └── page.tsx        # /docs — built-in markdown doc viewer/editor
├── game/
│   └── page.tsx        # /game — GameShell wrapper
└── su/
    └── page.tsx        # /su — SUShell wrapper
```

## Component/Module Index

<a id="layout"></a>
### layout.tsx

**Root layout component. Sets HTML metadata (title: "Aria"), loads three Google Fonts, applies dark mode class, and renders children.**

- **Connects to:** Google Fonts CDN (external)

---

<a id="page"></a>
### page.tsx

**Home page. Renders TabBar for navigation and TabContainer for content in a full-viewport flex layout.**

- **Connects to:** `@/components/TabBar`, `@/components/TabContainer`

---

<a id="globals"></a>
### globals.css

**Global stylesheet. Defines dark theme (#07070f base), glass-morphism utilities, ambient gradients, orb/drawer/game animations, React Flow overrides, and custom scrollbar styles.**

- **Connects to:** All components (global scope)

---

<a id="DashboardPage"></a>
### dashboard/page.tsx

**Thin wrapper for /dashboard route. Sets page metadata ("Aria — Therapist Dashboard") and renders DashboardShell.**

- **Connects to:** `@/components/dashboard/DashboardShell`

---

<a id="DocsPage"></a>
### docs/page.tsx

**Self-contained documentation viewer/editor. Fetches doc index from `/api/docs`, renders markdown safely (no innerHTML), supports editing and saving. The most complex page — all others are thin wrappers.**

- Fetches categories and documents from `/api/docs` endpoint
- Safe markdown renderer (`MarkdownBlock`) handles headers, code blocks, tables, lists
- Edit mode with save via PUT
- Auto-generates API endpoint documentation from backend routers
- **Connects to:** `/api/docs` (backend API)

---

<a id="GamePage"></a>
### game/page.tsx

**Thin wrapper for /game route. Sets page metadata ("Aria — Your Story") and renders GameShell.**

- **Connects to:** `@/components/game/GameShell`

---

<a id="SUPage"></a>
### su/page.tsx

**Thin wrapper for /su route. Sets page metadata ("Aria — SU Lab") and renders SUShell.**

- **Connects to:** `@/components/su/SUShell`

---

## External Dependencies Summary

### Components

| Component | Purpose |
|---|---|
| `TabBar` | Top-level tab navigation |
| `TabContainer` | Content area switching between tabs |
| `DashboardShell` | Full therapist dashboard UI |
| `GameShell` | Full game engine UI |
| `SUShell` | Full SU Lab UI |

### Libraries

| Library | Purpose |
|---|---|
| Next.js (App Router) | File-based routing, metadata, layouts |
| Google Fonts | Typography (Instrument Serif, DM Sans, JetBrains Mono) |
| React | UI rendering (useState, useEffect, useCallback, useMemo in docs page) |
