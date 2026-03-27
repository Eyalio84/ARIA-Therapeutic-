"""Documentation API — list, read, and edit project markdown docs."""

import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/docs", tags=["docs"])

# Project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Doc registry — categorized, ordered
DOC_REGISTRY = [
    {
        "category": "Architecture & Reference",
        "icon": "blueprint",
        "docs": [
            {"id": "aria-voice", "path": "docs/ARIA-VOICE-ASSISTANT-REFERENCE.md", "title": "Aria Voice Assistant Reference", "description": "Core architecture: voice engine, function calling, dual mode, SU Lab"},
            {"id": "components", "path": "src/components/game/COMPONENTS.md", "title": "Components Registry", "description": "Living component registry: all React components, stores, endpoints"},
            {"id": "structured-data", "path": "docs/STRUCTURED-DATA-UPGRADE.md", "title": "Structured Data Upgrade", "description": "Data architecture and upgrade plan"},
            {"id": "phase3-research", "path": "docs/PHASE3-RESEARCH-FINDINGS.md", "title": "Phase 3 Research Findings", "description": "Research context for current architecture"},
            {"id": "su-lab-report", "path": "docs/SU-LAB-COMPREHENSIVE-REPORT.md", "title": "SU Lab Comprehensive Report", "description": "Architecture analysis, potential, therapeutic + app/game futures, honest assessment"},
            {"id": "su-lab-logic", "path": "docs/SU-LAB-VISUAL-LOGIC-ARCHITECTURE.md", "title": "Visual Logic System Architecture", "description": "Node editor, logic blocks, event listeners, wires, execution engine, React export path"},
            {"id": "logic-prototype", "path": "docs/LOGIC-PROTOTYPE-IMPLEMENTATION-PLAN.md", "title": "Logic Prototype Implementation Plan", "description": "Step-by-step MVP plan: Button → Logic Block → Object, with ASCII visuals"},
            {"id": "local-inference", "path": "docs/LOCAL-INFERENCE-ALTERNATIVES-REPORT.md", "title": "Local Inference Alternatives", "description": "aiohttp, embedding similarity, code gen, tiered hybrid — 6 out-of-the-box ideas"},
            {"id": "eod-2026-03-24", "path": "docs/END-OF-DAY-REPORT-2026-03-24.md", "title": "End of Day Report — Mar 23-24", "description": "14 features, FunctionGemma pipeline, logic system, achievements, insights"},
        ],
    },
    {
        "category": "Therapeutic & Psychology",
        "icon": "heart",
        "docs": [
            {"id": "therapeutic-research", "path": "docs/THERAPEUTIC-GAME-RESEARCH.md", "title": "Therapeutic Game Research", "description": "Foundation for clinical game approach"},
            {"id": "psychology-sources", "path": "docs/PSYCHOLOGY-DATA-SOURCES.md", "title": "Psychology Data Sources", "description": "ICD-11, LOINC, clinical data layer reference"},
            {"id": "therapy-kb1", "path": "docs/thrapy-KB/thr1.md", "title": "Therapy Knowledge Base 1", "description": "Therapy KB content"},
            {"id": "therapy-kb2", "path": "docs/thrapy-KB/kb2.md", "title": "Therapy Knowledge Base 2", "description": "Therapy KB content"},
        ],
    },
    {
        "category": "Planning & Progress",
        "icon": "chart",
        "docs": [
            {"id": "week1-report", "path": "docs/WEEK1-PROGRESSION-REPORT.md", "title": "Week 1 Progression Report", "description": "Historical context and milestones"},
            {"id": "week2-plan", "path": "docs/WEEK2-NARRATIVE-GAME-PLAN.md", "title": "Week 2 Narrative Game Plan", "description": "Game design decisions"},
            {"id": "session-progression", "path": "docs/SESSION-PROGRESSION-2026-03-21-22.md", "title": "Session Progression (Mar 21-22)", "description": "Recent progress and decisions"},
            {"id": "mega-plan", "path": "docs/MEGA-PLAN-TESTING-GUIDE.md", "title": "Mega Plan Testing Guide", "description": "Testing methodology"},
            {"id": "aria-framework", "path": "docs/plans/2026-03-15-aria-portable-framework.md", "title": "Aria Portable Framework Plan", "description": "Framework portability design"},
        ],
    },
    {
        "category": "Training & Models",
        "icon": "brain",
        "docs": [
            {"id": "training-readme", "path": "data/finetune/TRAINING-README.md", "title": "FunctionGemma Training Guide", "description": "Dataset generation, HF AutoTrain, local inference"},
            {"id": "setfit-pipeline", "path": "docs/SESSION-HANDOFF-SETFIT-PIPELINE.md", "title": "SetFit Voice Router Pipeline", "description": "Replace FunctionGemma with SetFit MiniLM classifier — 85-92% accuracy, <10ms, full implementation plan"},
        ],
    },
]


def _resolve_path(relative_path: str) -> str:
    """Resolve relative path to absolute, ensure it's within project."""
    full = os.path.normpath(os.path.join(PROJECT_ROOT, relative_path))
    if not full.startswith(PROJECT_ROOT):
        raise HTTPException(status_code=403, detail="Path outside project")
    return full


@router.get("/list")
async def list_docs():
    """List all available documentation files, categorized."""
    result = []
    for cat in DOC_REGISTRY:
        cat_data = {"category": cat["category"], "icon": cat["icon"], "docs": []}
        for doc in cat["docs"]:
            full_path = _resolve_path(doc["path"])
            exists = os.path.exists(full_path)
            size = os.path.getsize(full_path) if exists else 0
            cat_data["docs"].append({
                **doc,
                "exists": exists,
                "size_kb": round(size / 1024, 1) if exists else 0,
            })
        result.append(cat_data)
    return result


@router.get("/read/{doc_id}")
async def read_doc(doc_id: str):
    """Read a documentation file by ID."""
    for cat in DOC_REGISTRY:
        for doc in cat["docs"]:
            if doc["id"] == doc_id:
                full_path = _resolve_path(doc["path"])
                if not os.path.exists(full_path):
                    raise HTTPException(status_code=404, detail=f"File not found: {doc['path']}")
                with open(full_path, "r") as f:
                    content = f.read()
                return {
                    "id": doc_id,
                    "title": doc["title"],
                    "path": doc["path"],
                    "content": content,
                    "size_kb": round(len(content) / 1024, 1),
                    "lines": content.count("\n") + 1,
                }
    raise HTTPException(status_code=404, detail=f"Doc ID not found: {doc_id}")


class DocUpdate(BaseModel):
    content: str


@router.put("/write/{doc_id}")
async def write_doc(doc_id: str, body: DocUpdate):
    """Update a documentation file."""
    for cat in DOC_REGISTRY:
        for doc in cat["docs"]:
            if doc["id"] == doc_id:
                full_path = _resolve_path(doc["path"])
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w") as f:
                    f.write(body.content)
                return {"status": "saved", "path": doc["path"], "size_kb": round(len(body.content) / 1024, 1)}
    raise HTTPException(status_code=404, detail=f"Doc ID not found: {doc_id}")


@router.get("/api-index")
async def api_index():
    """Auto-generate API endpoint index from backend routers."""
    import importlib
    import inspect

    endpoints = []
    router_dir = os.path.dirname(os.path.abspath(__file__))

    for fname in sorted(os.listdir(router_dir)):
        if not fname.endswith(".py") or fname.startswith("_"):
            continue
        module_name = fname[:-3]
        try:
            mod = importlib.import_module(f"routers.{module_name}")
            if hasattr(mod, "router"):
                for route in mod.router.routes:
                    if hasattr(route, "methods") and hasattr(route, "path"):
                        endpoints.append({
                            "module": module_name,
                            "path": mod.router.prefix + route.path,
                            "methods": list(route.methods - {"HEAD", "OPTIONS"}),
                            "name": route.name or "",
                        })
        except Exception:
            continue

    return {"count": len(endpoints), "endpoints": endpoints}
