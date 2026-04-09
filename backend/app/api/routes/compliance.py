"""Compliance API routes — RBI/SEBI/MCA pipeline."""
from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form

from app.db.supabase_client import get_supabase
from app.models.compliance_schemas import (
    CircularOut,
    ImpactReportOut,
    PipelineRunOut,
    RunOneRequest,
    RunPipelineRequest,
)
from app.services.ingestion_pipeline import IngestionPipeline

router = APIRouter()


# ── Pipeline triggers ──────────────────────────────────────────────────────────

@router.post("/run", response_model=PipelineRunOut)
async def run_pipeline(payload: RunPipelineRequest) -> PipelineRunOut:
    """Scan sources for new circulars and run the full 6-agent pipeline."""
    pipeline = IngestionPipeline()
    result = await pipeline.run_regulatory(
        sources=payload.sources,
        max_docs=payload.max_docs,
        company_id=payload.company_id,
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
    from app.agents.rbi.orchestrator import RBIOrchestrator

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
    pipeline = IngestionPipeline()
    bg.add_task(pipeline.run_regulatory, payload.sources, payload.max_docs, payload.company_id)
    return {"message": "Pipeline started in background"}


@router.post("/documents/upload")
async def upload_company_document(
    company_id: str = Form(...),
    file: UploadFile = File(...),
) -> dict:
    """Upload a company document (PDF/HTML/text) for embedding into ChromaDB."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    pipeline = IngestionPipeline()
    result = await pipeline.ingest_company_document(
        company_id=company_id,
        filename=file.filename,
        raw_bytes=raw_bytes,
    )
    return {"success": True, "result": result}


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
