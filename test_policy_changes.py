#!/usr/bin/env python3
"""Test script for the policy changes endpoint."""

import asyncio
import httpx

async def test_policy_changes():
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post("http://127.0.0.1:8000/api/v1/compliance/check-policy-changes")
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"New changes: {data.get('new_changes', 0)}")
                for change in data.get('changes', []): 
                    print(f"- {change['title']} ({change['published_date']})")
            else:
                print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_policy_changes())