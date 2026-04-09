# Agent 2 — Document Extractor

## Purpose
Downloads each new regulatory document and converts it into clean, structured text split by sections / headings / clauses / sub-clauses.

## Responsibilities
- Fetch the PDF or HTML
- Extract raw text (handling multi-column PDFs, tables)
- Strip junk (headers, footers, page numbers)
- Split into hierarchical clauses
- Identify the **effective date** of the regulation

## Inputs
A single `CircularRef` from Agent 1.

## Outputs
```python
ExtractedDoc(
    ref: CircularRef,
    raw_text: str,
    clauses: list[Clause],
    effective_date: str | None,
)

Clause(
    number: str,    # '3.2', '(a)', 'II'
    heading: str,
    text: str,
    level: int,
)
```

## Tools / Libraries
- `httpx` — download
- `PyMuPDF` (`fitz`) — primary PDF extractor (fast, accurate)
- `pdfplumber` — fallback for multi-column / table-heavy PDFs
- `BeautifulSoup4` — HTML extraction
- `re` — clause segmentation regex

## Clause Detection Regex
```python
^\s*((?:\d+(?:\.\d+)*)|(?:\([a-zA-Z]+\))|(?:[IVX]+\.))\s+(.{0,140})
```
Matches:
- `1.`, `1.1`, `2.3.4` (numeric)
- `(a)`, `(iv)` (lettered)
- `I.`, `II.`, `III.` (Roman)

## Effective Date Regex
```python
(?:with effect from|effective (?:date|from))\s*:?\s*([0-9]{1,2}[\s\-/][A-Za-z]+[\s\-/][0-9]{2,4})
```

## Cleaning Pipeline
1. Strip `\r`, normalize whitespace
2. Collapse `\n{3,}` → `\n\n`
3. Remove navigation, scripts, styles (HTML)

## Next Agent
Passes `ExtractedDoc` to **Agent 3 (Change Detector)**.
