"""Validator agent - checks executor output and produces a final answer."""
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.base import BaseAgent

VALIDATOR_SYSTEM = """You are a Validator agent. Review the original query and
the executor's step results. Verify the answer is correct, complete, and well
formatted. Return a single concise final answer for the user."""


class ValidatorAgent(BaseAgent):
    name = "validator"

    async def run(self, query: str, executions: list[dict]) -> dict:
        messages = [
            SystemMessage(content=VALIDATOR_SYSTEM),
            HumanMessage(content=f"Query: {query}\nExecutions: {executions}"),
        ]
        response = await self.llm.ainvoke(messages)
        return {"valid": True, "answer": response.content}
