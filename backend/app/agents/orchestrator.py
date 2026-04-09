"""Orchestrator - coordinates Planner -> Executor -> Validator."""
from typing import Any

from app.agents.executor import ExecutorAgent
from app.agents.planner import PlannerAgent
from app.agents.validator import ValidatorAgent
from app.memory.short_term import ShortTermMemory
from app.memory.long_term import LongTermMemory


class Orchestrator:
    def __init__(self) -> None:
        self.planner = PlannerAgent()
        self.executor = ExecutorAgent()
        self.validator = ValidatorAgent()
        self.short_term = ShortTermMemory()
        self.long_term = LongTermMemory()

    async def run(
        self,
        query: str,
        context: dict[str, Any] | None = None,
        user_id: str | None = None,
    ) -> dict:
        ctx = context or {}

        # Pull recent + relevant memory
        ctx["recent"] = self.short_term.recent(user_id)
        ctx["relevant"] = await self.long_term.search(query, user_id=user_id)

        plan = await self.planner.run(query, ctx)
        executions = await self.executor.run(plan, ctx)
        validation = await self.validator.run(query, executions)

        # Persist
        self.short_term.append(user_id, {"query": query, "answer": validation["answer"]})
        await self.long_term.store(query, validation["answer"], user_id=user_id)

        return {
            "success": validation.get("valid", False),
            "answer": validation["answer"],
            "steps": [
                {"agent": "planner", "output": plan},
                {"agent": "executor", "output": executions},
                {"agent": "validator", "output": validation},
            ],
            "metadata": {"user_id": user_id},
        }
