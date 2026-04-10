import httpx
import asyncio

async def test_auth_flow():
    base_url = "http://127.0.0.1:8000/api/v1/auth"
    email = f"test_{int(asyncio.get_event_loop().time())}@example.com"
    password = "SafePassword123!"
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Test Signup
        print(f"Testing Signup for {email}...")
        try:
            r = await client.post(f"{base_url}/signup", json={"email": email, "password": password})
            print("Signup Status:", r.status_code)
            print("Signup Response:", r.text)
        except Exception as e:
            print("Signup Error:", e)
            return

        # 2. Test Login
        print("\nTesting Login...")
        try:
            r = await client.post(f"{base_url}/login", json={"email": email, "password": password})
            print("Login Status:", r.status_code)
            if r.status_code == 200:
                print("Login Success: Token received.")
            else:
                print("Login Failure:", r.text)
        except Exception as e:
            print("Login Error:", e)

if __name__ == "__main__":
    asyncio.run(test_auth_flow())
