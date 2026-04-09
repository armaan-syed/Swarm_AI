"""Executor agent - performs the steps produced by the Planner using tools."""
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.base import BaseAgent
from app.tools.registry import tool_registry

EXECUTOR_SYSTEM = """You are an Executor agent. Carry out the given step using
the available tools when helpful. Return a concise result for the step."""


class ExecutorAgent(BaseAgent):
    name = "executor"

    async def run(self, plan: list[str], context: dict | None = None) -> list[dict]:
        results: list[dict] = []
        tools_desc = tool_registry.describe()
        for step in plan:
            messages = [
                SystemMessage(content=f"{EXECUTOR_SYSTEM}\nAvailable tools:\n{tools_desc}"),
                HumanMessage(content=f"Step: {step}\nContext: {context or {}}"),
            ]
            response = await self.llm.ainvoke(messages)
            results.append({"step": step, "result": response.content})
        return results
