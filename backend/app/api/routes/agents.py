"""Agent routes - main entry to the multi-agent system."""
from fastapi import APIRouter, Depends

from app.agents.orchestrator import Orchestrator
from app.api.deps import get_current_user_optional
from app.models.schemas import AgentRequest, AgentResponse

router = APIRouter()


@router.post("/run", response_model=AgentResponse)
async def run_agent(
    payload: AgentRequest,
    user: dict | None = Depends(get_current_user_optional),
) -> AgentResponse:
    orchestrator = Orchestrator()
    result = await orchestrator.run(
        query=payload.query,
        context=payload.context or {},
        user_id=(user or {}).get("sub"),
    )
    return AgentResponse(**result)
