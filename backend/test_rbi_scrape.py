import httpx
from bs4 import BeautifulSoup
import asyncio

async def test_rbi():
    url = "https://www.rbi.org.in/Scripts/NotificationUser.aspx"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=headers) as client:
        try:
            resp = await client.get(url)
            print(f"Status: {resp.status_code}")
            soup = BeautifulSoup(resp.text, "lxml")
            links = soup.select("table tr a[href]")
            print(f"Found {len(links)} potential links")
            for link in links[:5]:
                print(f" - {link.get_text(strip=True)} ({link['href']})")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_rbi())
