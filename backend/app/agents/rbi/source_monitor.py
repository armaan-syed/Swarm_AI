"""Agent 1 — Source Monitor.

Watches RBI, SEBI, and MCA for new circulars / notifications / master
directions / press releases. Detects new documents and triggers the pipeline.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import httpx
from bs4 import BeautifulSoup

from app.agents.base import BaseAgent
from app.db.supabase_client import get_supabase


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

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            for source in sources:
                url = SOURCE_ENDPOINTS.get(source)
                if not url:
                    continue
                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    found.extend(self._parse(source, resp.text))
                except Exception as exc:  # noqa: BLE001
                    print(f"[SourceMonitor] {source} failed: {exc}")

        return self._filter_new(found)

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
                        url=httpx.URL(
                            "https://www.rbi.org.in/", params=None
                        ).join(href).human_repr(),
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
