import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

from app.agents.rbi.orchestrator import RBIOrchestrator
from app.utils.logger import get_logger

async def test_run():
    print("Starting Pipeline Test...")
    orch = RBIOrchestrator()
    try:
        # Use a fake but plausible company_id or None
        result = await orch.run(company_id=None, max_docs=1)
        print("\nPipeline Result:")
        print(f"Reports: {len(result.reports)}")
        if result.reports:
            print(f"Summary: {result.reports[0].get('summary', 'No summary')}")
            print(f"Report Generated: {bool(result.reports[0].get('report'))}")
            if result.reports[0].get('report'):
                print("Report Preview (50 chars):", result.reports[0]['report']['markdown'][:100])
        
        if result.errors:
            print("\nErrors Encountered:")
            for err in result.errors:
                print(f"  - {err}")
                
    except Exception as e:
        print(f"\nCRASHED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_run())
