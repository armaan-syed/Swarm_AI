# Agent 1 — Source Monitor

## Purpose
Continuously watches RBI, SEBI, and MCA for new circulars, notifications, master directions, and press releases. Acts as the **trigger** for the entire pipeline.

## Responsibilities
- Poll official pages on a schedule (cron / APScheduler)
- Detect new documents that haven't been processed before
- Store document URLs + metadata in Supabase
- Trigger the pipeline when something new appears

## Inputs
| Field | Type | Description |
|---|---|---|
| `sources` | `list[str] \| None` | Subset of `["RBI","SEBI","MCA"]`. None = all. |

## Outputs
A list of `CircularRef` dataclasses:
```python
CircularRef(
    source: str,            # 'RBI' | 'SEBI' | 'MCA'
    title: str,
    url: str,
    published_date: str | None,
    doc_type: str | None,   # 'circular' | 'notification' | 'master-direction'
    meta: dict,
)
```

## Tools / Libraries
- `httpx` — async HTTP client
- `BeautifulSoup4` + `lxml` — HTML parsing
- `Playwright` — for JS-heavy pages (SEBI dashboards) [optional]
- `APScheduler` — periodic polling
- `supabase-py` — dedup against `circulars` table

## Source Endpoints
| Source | URL |
|---|---|
| RBI | `https://www.rbi.org.in/Scripts/NotificationUser.aspx` |
| SEBI | `https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListingAll=yes&search=&str_type=circulars` |
| MCA | `https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/circulars.html` |

## Dedup Logic
1. Scrape all current document URLs from the source page
2. Query Supabase: `circulars.url IN (...)` 
3. Return only URLs that don't already exist in the table

## Failure Handling
- Per-source try/except → one source failing never blocks others
- Returns whatever was successfully scraped, errors logged

## Next Agent
Passes `CircularRef` list to **Agent 2 (Document Extractor)**.
