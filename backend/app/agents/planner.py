"""Planner agent - turns a user query into an ordered plan of steps."""
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.base import BaseAgent

PLANNER_SYSTEM = """You are a Planner agent in a multi-agent system.
Given a user query, break it down into a numbered list of concrete steps the
Executor agent can perform. Keep steps short, specific, and actionable.
Output ONLY the numbered list."""


class PlannerAgent(BaseAgent):
    name = "planner"

    async def run(self, query: str, context: dict | None = None) -> list[str]:
        messages = [
            SystemMessage(content=PLANNER_SYSTEM),
            HumanMessage(content=f"Query: {query}\nContext: {context or {}}"),
        ]
        response = await self.llm.ainvoke(messages)
        plan = [
            line.lstrip("0123456789.- )").strip()
            for line in response.content.splitlines()
            if line.strip()
        ]
        return [step for step in plan if step]
