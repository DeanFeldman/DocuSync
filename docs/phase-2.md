# Phase 2 vertical-slice evidence

The implemented slice follows the SRS sequence:

1. Upload a related DOCX set and open its Microsoft Word-generated layout without downloading it.
2. Switch to Select text, scroll logical pages, and select a supported body element by keyboard or pointer.
3. Discover deterministic exact matches by stable `DocumentElement` ID.
4. Include or exclude every target; the selected source remains mandatory.
5. Enter one replacement and inspect every before/after location.
6. Apply only the confirmed targets as new active DOCX versions, then continue editing those versions.
7. Download one current DOCX or a full current-workspace ZIP and inspect the persisted generation history.

## Implemented SRS coverage

- `VIEW-01`–`VIEW-05`, `VIEW-07`, and `VIEW-08` through Word-rendered visual preview plus structured selection.
- `EDIT-01`–`EDIT-05` for main-body paragraphs, headings, and list items.
- `MATCH-01`, `MATCH-03`–`MATCH-05` for exact, type-compatible body elements.
- `VER-01`–`VER-03`, `VER-05`, and atomic failure cleanup from `VER-06`.

## Deliberate boundaries

- The visual preview uses Word pagination; selection-mode page grouping remains estimated because PDF-to-element coordinates are not mapped yet.
- Similarity suggestions, selectable table cells, direct selection over the Word render, rollback, reusable link groups, and multi-edit change sets remain backlog items.
- Authentication and tenant ownership enforcement remain deployment blockers, as documented in the README.

## Verification

- `python -m pytest -q`: covers viewer payloads, element match discovery, preview/generation, consecutive edits, refreshed groups, current downloads, target exclusion, audit history, and byte-for-byte original immutability.
- `npm run build`: type-checks and produces the Vite production bundle.
