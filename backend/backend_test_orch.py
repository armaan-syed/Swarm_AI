import asyncio
from app.services.ingestion_pipeline import IngestionPipeline
async def main():
    p = IngestionPipeline()
    res = await p.run_regulatory()
    print("Found:", len(res.found_refs))
    if len(res.reports) > 0:
        print("First Report Valid:", res.reports[0].get("report") is not None)
    else:
        print("No reports processed.")
asyncio.run(main())
