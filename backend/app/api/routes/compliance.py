"""Compliance API routes — RBI/SEBI/MCA pipeline."""
from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.agents.rbi.orchestrator import RBIOrchestrator
from app.db.supabase_client import get_supabase
from app.models.compliance_schemas import (
    CircularOut,
    ImpactReportOut,
    PipelineRunOut,
    RunOneRequest,
    RunPipelineRequest,
)

router = APIRouter()


# ── Pipeline triggers ──────────────────────────────────────────────────────────

@router.post("/run", response_model=PipelineRunOut)
async def run_pipeline(payload: RunPipelineRequest) -> PipelineRunOut:
    """Scan sources for new circulars and run the full 5-agent pipeline."""
    orchestrator = RBIOrchestrator()
    result = await orchestrator.run(
        sources=payload.sources, max_docs=payload.max_docs
    )
    return PipelineRunOut(
        found=len(result.found_refs),
        processed=len(result.reports),
        errors=result.errors,
        reports=result.reports,
    )


@router.post("/run-one")
async def run_one(payload: RunOneRequest) -> dict:
    """Run the pipeline on a single URL (for demo/testing)."""
    orchestrator = RBIOrchestrator()
    try:
        report = await orchestrator.run_one(url=payload.url, source=payload.source)
        return {"success": True, "result": report}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/run-background", status_code=202)
async def run_pipeline_background(
    payload: RunPipelineRequest, bg: BackgroundTasks
) -> dict:
    """Trigger pipeline in background and return immediately."""
    orchestrator = RBIOrchestrator()
    bg.add_task(orchestrator.run, payload.sources, payload.max_docs)
    return {"message": "Pipeline started in background"}


# ── Data reads ─────────────────────────────────────────────────────────────────

@router.get("/circulars", response_model=list[CircularOut])
async def list_circulars(
    source: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[CircularOut]:
    """List stored circulars, optionally filtered by source."""
    client = get_supabase()
    if not client:
        return []
    query = client.table("circulars").select("*").order("created_at", desc=True)
    if source:
        query = query.eq("source", source.upper())
    res = query.range(offset, offset + limit - 1).execute()
    return res.data or []


@router.get("/reports", response_model=list[ImpactReportOut])
async def list_reports(
    severity: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[ImpactReportOut]:
    """List generated impact reports."""
    client = get_supabase()
    if not client:
        return []
    query = (
        client.table("impact_reports")
        .select("*")
        .order("created_at", desc=True)
    )
    if severity:
        query = query.eq("severity", severity.upper())
    res = query.range(offset, offset + limit - 1).execute()
    return res.data or []


@router.get("/reports/{report_id}", response_model=ImpactReportOut)
async def get_report(report_id: str) -> ImpactReportOut:
    client = get_supabase()
    if not client:
        raise HTTPException(status_code=503, detail="DB unavailable")
    res = client.table("impact_reports").select("*").eq("id", report_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Report not found")
    return res.data


@router.get("/stats")
async def stats() -> dict:
    """Quick stats for the dashboard header cards."""
    client = get_supabase()
    if not client:
        return {}
    circulars = client.table("circulars").select("id", count="exact").execute()
    reports = client.table("impact_reports").select("id", count="exact").execute()
    high = (
        client.table("impact_reports")
        .select("id", count="exact")
        .eq("severity", "HIGH")
        .execute()
    )
    return {
        "total_circulars": circulars.count or 0,
        "total_reports": reports.count or 0,
        "high_severity": high.count or 0,
    }
