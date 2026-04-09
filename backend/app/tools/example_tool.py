"""Example tool - demonstrates how to register a tool with the registry."""
import httpx

from app.tools.registry import tool_registry


@tool_registry.register(
    name="http_get",
    description="Perform an HTTP GET request and return the response text. Args: url:str",
)
async def http_get(url: str) -> str:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.text
