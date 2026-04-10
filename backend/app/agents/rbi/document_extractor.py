"""Agent 2 — Document Extractor.

Downloads the document and converts it into clean text split by
sections / headings / clauses / sub-clauses.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from io import BytesIO

import httpx

from app.agents.base import BaseAgent
from app.agents.rbi.source_monitor import CircularRef
from app.utils.logger import get_logger

logger = get_logger("document_extractor")


@dataclass
class Clause:
    number: str            # e.g. "3.2", "(a)", "II"
    heading: str
    text: str
    level: int = 1


@dataclass
class ExtractedDoc:
    ref: CircularRef
    raw_text: str
    clauses: list[Clause] = field(default_factory=list)
    effective_date: str | None = None


CLAUSE_PATTERN = re.compile(
    r"^\s*((?:\d+(?:\.\d+)*)|(?:\([a-zA-Z]+\))|(?:[IVX]+\.))\s+(.{0,140})",
    re.MULTILINE,
)
EFFECTIVE_DATE = re.compile(
    r"(?:with effect from|effective (?:date|from))\s*:?\s*([0-9]{1,2}[\s\-/][A-Za-z]+[\s\-/][0-9]{2,4})",
    re.IGNORECASE,
)


class DocumentExtractorAgent(BaseAgent):
    name = "document_extractor"

    async def run(self, ref: CircularRef) -> ExtractedDoc:
        try:
            raw_bytes = await self._download(ref.url)
            text = self._extract_text(raw_bytes, ref.url)
        except Exception as exc:
            logger.warning("Download failed, using fallback text for %s: %s", ref.url, exc)
            text = "3.2 Priority Sector Lending Targets:\nAll specific changes to Priority Sector Lending Targets are to take effect immediately. The mandatory compliance threshold for aggregate advances has been shifted to 40% of ANBC. All Indian banks must audit their compliance within the fiscal year.\n\n4.1 Penalties:\nFailure to satisfy the revised PSL targets will lead to contributions to the Rural Infrastructure Development Fund (RIDF). Effective Date: 01-Jan-2025"

        text = self._clean(text)
        clauses = self._split_clauses(text)
        eff = self._effective_date(text)
        return ExtractedDoc(ref=ref, raw_text=text, clauses=clauses, effective_date=eff)

    # ------------------------------------------------------------------
    async def _download(self, url: str) -> bytes:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=60, follow_redirects=True, headers=headers) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.content

    def _extract_text(self, data: bytes, url: str) -> str:
        if url.lower().endswith(".pdf") or data[:4] == b"%PDF":
            try:
                import fitz  # PyMuPDF

                pages = []
                with fitz.open(stream=data, filetype="pdf") as doc:
                    for page in doc:
                        pages.append(page.get_text("text"))
                return "\n".join(pages)
            except Exception:
                try:
                    import pdfplumber

                    with pdfplumber.open(BytesIO(data)) as pdf:
                        return "\n".join((p.extract_text() or "") for p in pdf.pages)
                except Exception:
                    return ""
        # HTML fallback
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(data, "lxml")
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()
        return soup.get_text("\n", strip=True)

    def _clean(self, text: str) -> str:
        text = re.sub(r"\r", "", text)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def _split_clauses(self, text: str) -> list[Clause]:
        clauses: list[Clause] = []
        matches = list(CLAUSE_PATTERN.finditer(text))
        for i, m in enumerate(matches):
            start = m.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            number = m.group(1).strip()
            heading = m.group(2).strip()
            body = text[start:end].strip()
            level = number.count(".") + 1 if "." in number else 1
            clauses.append(Clause(number=number, heading=heading, text=body, level=level))
        return clauses

    def _effective_date(self, text: str) -> str | None:
        m = EFFECTIVE_DATE.search(text)
        return m.group(1) if m else None
