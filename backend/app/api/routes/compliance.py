"""Compliance API routes — RBI/SEBI/MCA pipeline."""
from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.db.supabase_client import get_supabase
from app.models.compliance_schemas import (
    CircularOut,
    ImpactReportOut,
    PipelineRunOut,
    RunOneRequest,
    RunPipelineRequest,
)
from app.services.ingestion_pipeline import IngestionPipeline
from app.data.prebaked_reports import get_next_prebaked_report
from app.services.email_service import get_email_service, DEPT_EMAIL_MAP
from app.utils.logger import get_logger, get_run_log_store

logger = get_logger("compliance_routes")

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


@router.post("/documents/upload", status_code=202)
async def upload_company_document(
    bg_tasks: BackgroundTasks,
    company_id: str = Form(...),
    file: UploadFile = File(...),
) -> dict:
    """Upload a company document (PDF/HTML/text) for embedding into ChromaDB in background."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    # DEFENSIVE SPEED: Hand off to background task *before* doing any AI init
    def _run_ingest(c_id, f_name, data):
        pipeline = IngestionPipeline()
        import asyncio
        asyncio.run(pipeline.ingest_company_document(c_id, f_name, data))

    bg_tasks.add_task(_run_ingest, company_id, file.filename, raw_bytes)
    
    return {
        "success": True, 
        "message": "File received. Indexing started in background.",
        "filename": file.filename
    }


# ── Pre-baked Demo Pipeline ───────────────────────────────────────────────────

@router.get("/prebaked")
async def get_prebaked_report() -> dict:
    """Return the next pre-baked compliance report for demo mode.
    
    Rotates through 3 highly detailed reports (PSL, KYC, NBFC).
    Each call returns a different report with fresh timestamps.
    Also logs the pipeline run to the activity feed.
    """
    report = get_next_prebaked_report()
    
    # Log to activity feed
    log_store = get_run_log_store()
    log_store.record({
        "event": "pipeline_complete",
        "source": report["ref"]["source"],
        "title": report["ref"]["title"],
        "severity": report["severity"],
        "summary": report["summary"],
        "status": "completed",
    })
    
    return {
        "success": True,
        "result": report,
    }


class SendAlertsRequest(BaseModel):
    email_drafts: list[dict]
    extra_recipients: list[dict] | None = None  # [{name, email}]


@router.post("/send-alerts")
async def send_alerts(payload: SendAlertsRequest) -> dict:
    """Send real compliance alert emails via Brevo to all team members.
    
    Dispatches to stored department emails + any extra recipients
    (e.g. a 4th judge-added department).
    """
    email_service = get_email_service()
    results = []
    log_store = get_run_log_store()
    
    # Send pre-baked email drafts to known departments
    for draft in payload.email_drafts:
        to_name = draft.get("to", "Compliance")
        success = await email_service.send_compliance_alert(
            to_name=to_name,
            subject=draft.get("subject", "Regulatory Compliance Update"),
            body=draft.get("body", ""),
        )
        results.append({
            "to": to_name,
            "email": DEPT_EMAIL_MAP.get(to_name.lower().strip(), "fallback"),
            "sent": success,
        })
        log_store.record({
            "event": "email_sent",
            "to": to_name,
            "subject": draft.get("subject", ""),
            "status": "sent" if success else "failed",
        })
    
    # Send to any extra recipients (dynamically added departments)
    if payload.extra_recipients:
        for recipient in payload.extra_recipients:
            r_name = recipient.get("name", "Team Member")
            r_email = recipient.get("email", "")
            if not r_email:
                continue
            
            # Use the first draft as a template but personalize it
            template_draft = payload.email_drafts[0] if payload.email_drafts else {}
            success = await email_service.send_compliance_alert(
                to_email=r_email,
                to_name=r_name,
                subject=template_draft.get("subject", "Regulatory Compliance Update"),
                body=f"Dear {r_name},\n\n"
                     f"This is a personalized compliance intelligence briefing from Swarm AI.\n\n"
                     f"{template_draft.get('body', 'Please review the latest regulatory update.')}\n\n"
                     f"— Swarm AI Compliance Intelligence Engine",
            )
            results.append({
                "to": r_name,
                "email": r_email,
                "sent": success,
            })
            log_store.record({
                "event": "email_sent",
                "to": f"{r_name} ({r_email})",
                "status": "sent" if success else "failed",
            })
    
    return {
        "success": True,
        "dispatched": len(results),
        "results": results,
    }


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


@router.get("/reports/history")
async def get_all_reports() -> list[ImpactReportOut]:
    """Fetch all generated impact reports for the history audit trail."""
    client = get_supabase()
    if not client:
        return []
    res = client.table("impact_reports").select("*").order("created_at", desc=True).execute()
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
