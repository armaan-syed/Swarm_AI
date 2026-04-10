import asyncio
from app.agents.rbi.source_monitor import SourceMonitorAgent
async def main():
    am = SourceMonitorAgent()
    res = await am.run()
    print('FOUND:', len(res))
    if len(res) > 0: print(res[0].url)
asyncio.run(main())
