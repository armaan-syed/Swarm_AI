"""Agent routes - main entry to the multi-agent system."""
from dataclasses import asdict

from fastapi import APIRouter, Depends

from app.agents.rbi.orchestrator import RBIOrchestrator
from app.api.deps import get_current_user_optional
from app.models.schemas import AgentRequest, AgentResponse

router = APIRouter()


@router.post("/run", response_model=AgentResponse)
async def run_agent(
    payload: AgentRequest,
    user: dict | None = Depends(get_current_user_optional),
) -> AgentResponse:
    orchestrator = RBIOrchestrator()
    result = await orchestrator.run(
        sources=[payload.query] if payload.query else None,
        max_docs=1,
    )
    success = not bool(result.errors)
    answer = result.reports[0].get("summary") if result.reports else "No report generated"
    return AgentResponse(
        success=success,
        answer=answer,
        steps=[
            {
                "agent": "rbi_orchestrator",
                "output": asdict(result),
            }
        ],
        metadata={
            "user_id": (user or {}).get("sub"),
            "report_count": len(result.reports),
            "errors": result.errors,
        },
    )
