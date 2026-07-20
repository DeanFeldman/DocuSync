# ADR 0001: Use Python for the first document-processing backend

- **Status:** Accepted for the Milestone 1 prototype
- **Date:** 2026-07-20

## Context

The highest-risk part of DocumentSync is opening existing DOCX files, identifying structural elements, changing only confirmed content, and generating usable updated documents. The proposal listed Node.js with Express or Fastify as a low-risk option, but explicitly left the final stack for the team to agree and justify.

## Decision

Use a separate React/TypeScript frontend and a FastAPI/Python backend for the first working vertical slice. Use `python-docx` for DOCX parsing and reconstruction, and SQLAlchemy for relational persistence.

## Reasons

- Python has a mature and approachable DOCX library for opening and updating existing files.
- The team can prototype the main technical risk early rather than spending Milestone 1 building low-level Office Open XML manipulation.
- FastAPI still provides a team-designed, hand-written HTTP interface and keeps the frontend and backend separate.
- SQLAlchemy supports SQLite locally and PostgreSQL in deployed environments.
- Python is suitable for later text-similarity, document-analysis, and background-processing work.

## Consequences

- The project becomes a mixed TypeScript/Python codebase.
- CI must test both ecosystems.
- Shared request/response types are not automatically compiled across the frontend and backend; the API contract must be documented and tested.
- The team should review this decision after representative-file testing. If formatting preservation is inadequate, the document engine may need lower-level Open XML handling or a commercial document-processing SDK.
