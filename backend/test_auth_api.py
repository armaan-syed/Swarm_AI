import httpx
import asyncio

async def test_login():
    url = "http://127.0.0.1:8000/api/v1/auth/login"
    payload = {"email": "test@example.com", "password": "password123"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(url, json=payload)
            print("Status:", r.status_code)
            print("Body:", r.text)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_login())
