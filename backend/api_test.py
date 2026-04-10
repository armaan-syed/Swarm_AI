import httpx
import json
import asyncio

async def main():
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                "http://localhost:8000/api/v1/compliance/run", 
                json={"sources": ["RBI"], "max_docs": 1}
            )
            print("Status:", r.status_code)
            print(json.dumps(r.json(), indent=2))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
