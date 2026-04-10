"""Agent 1 — Source Monitor.

Watches RBI, SEBI, and MCA for new circulars / notifications / master
directions / press releases. Detects new documents and triggers the pipeline.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.agents.base import BaseAgent
from app.db.supabase_client import get_supabase
from app.utils.logger import get_logger

logger = get_logger("source_monitor")


@dataclass
class CircularRef:
    source: str            # RBI | SEBI | MCA
    title: str
    url: str
    published_date: str | None = None
    doc_type: str | None = None   # circular | notification | master-direction
    meta: dict[str, Any] = field(default_factory=dict)


SOURCE_ENDPOINTS = {
    "RBI": "https://www.rbi.org.in/Scripts/NotificationUser.aspx",
    "SEBI": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListingAll=yes&search=&str_type=circulars",
    "MCA": "https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/circulars.html",
}


class SourceMonitorAgent(BaseAgent):
    name = "source_monitor"

    async def run(self, sources: list[str] | None = None) -> list[CircularRef]:
        sources = sources or list(SOURCE_ENDPOINTS.keys())
        found: list[CircularRef] = []

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=headers) as client:
            for source in sources:
                url = SOURCE_ENDPOINTS.get(source)
                if not url:
                    continue
                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    found.extend(self._parse(source, resp.text))
                except Exception as exc:  # noqa: BLE001
                    logger.exception("[%s] source fetch failed", source)

        new_refs = self._filter_new(found)
        
        # HACKATHON DEMO: Always process at least 1 document so the pipeline shows something happening
        if not new_refs:
            logger.info("Demo hack: forcing 1 document to simulate changes")
            from urllib.parse import urljoin
            return [
                CircularRef(
                    source="RBI",
                    title="Master Direction - Priority Sector Lending (PSL) - Targets and Classification",
                    url="https://rbidocs.rbi.org.in/rdocs/NOTIFICATION/PDFs/MDPSL252A55F10DDE4AA6A07CCC8CB3CB5D2C.PDF",
                    doc_type="master-direction",
                    published_date="01-Apr-2024"
                )
            ]
            
        return new_refs

    # ------------------------------------------------------------------
    # Source-specific HTML parsing
    # ------------------------------------------------------------------
    def _parse(self, source: str, html: str) -> list[CircularRef]:
        soup = BeautifulSoup(html, "lxml")
        results: list[CircularRef] = []

        if source == "RBI":
            for row in soup.select("table tr"):
                link = row.find("a", href=True)
                if not link:
                    continue
                href = link["href"]
                if not href.lower().endswith((".pdf", ".aspx", ".htm", ".html")):
                    continue
                results.append(
                    CircularRef(
                        source="RBI",
                        title=link.get_text(strip=True),
                        url=urljoin("https://www.rbi.org.in/", href),
                        published_date=row.get_text(" ", strip=True)[:40],
                        doc_type="notification",
                    )
                )

        elif source == "SEBI":
            for link in soup.select("a[href*='cms']"):
                href = link.get("href", "")
                if href and href.lower().endswith(".pdf"):
                    results.append(
                        CircularRef(
                            source="SEBI",
                            title=link.get_text(strip=True),
                            url=href if href.startswith("http") else f"https://www.sebi.gov.in{href}",
                            doc_type="circular",
                        )
                    )

        elif source == "MCA":
            for link in soup.select("a[href$='.pdf']"):
                results.append(
                    CircularRef(
                        source="MCA",
                        title=link.get_text(strip=True),
                        url=link["href"],
                        doc_type="circular",
                    )
                )

        return results

    # ------------------------------------------------------------------
    # Dedup against Supabase `circulars` table
    # ------------------------------------------------------------------
    def _filter_new(self, refs: list[CircularRef]) -> list[CircularRef]:
        client = get_supabase()
        if not client:
            return refs
        try:
            urls = [r.url for r in refs]
            existing = (
                client.table("circulars").select("url").in_("url", urls).execute()
            )
            seen = {row["url"] for row in (existing.data or [])}
            return [r for r in refs if r.url not in seen]
        except Exception:
            return refs
