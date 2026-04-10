import asyncio
import sys
import os

# Set up current directory to allow imports
sys.path.append(os.getcwd())

from app.services.email_service import get_email_service
from app.config import settings

async def test_brevo():
    print(f"Testing Brevo Email Service...")
    print(f"API Key: {settings.BREVO_API_KEY[:10]}...")
    print(f"Sender: {settings.BREVO_SENDER_EMAIL}")
    
    service = get_email_service()
    
    # Try sending to your teammate Armaan
    receiver = "armaansyed009@gmail.com"
    subject = "Swarm AI — Brevo Integration Test"
    body = "Hello Armaan! This is a test email from the newly integrated Brevo engine. If you see this, real-time emails to teammates are now working!"
    
    success = await service.send_compliance_alert(
        to_email=receiver,
        to_name="Armaan Syed",
        subject=subject,
        body=body
    )
    
    if success:
        print(f"SUCCESS: Email sent to {receiver}")
    else:
        print(f"FAILED: Check logs for errors.")

if __name__ == "__main__":
    asyncio.run(test_brevo())
