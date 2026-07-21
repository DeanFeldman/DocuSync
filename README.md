# DocumentSync

DocumentSync is a web application for applying one confirmed edit across several related existing DOCX files while preserving each file's unique content and keeping the original uploads unchanged.

This repository now contains the **Phase 2 controlled-edit vertical slice**. It supports:

- Uploading two or more `.docx` files as a document set.
- Opening each uploaded document with a Microsoft Word-generated layout preview.
- Switching to a structured, keyboard-accessible text-selection view for controlled edits.
- Keyboard selection of recognised paragraphs, headings, and list items by stable element ID.
- Document switching, visible-text search, zoom, fit-width, and a live page indicator.
- Validating file type, size, and basic DOCX structure.
- Extracting non-empty paragraphs.
- Finding exact repeated paragraphs across different documents.
- Letting the user include or exclude each exact-match location before editing.
- Previewing every affected file and paragraph.
- Applying generated DOCX versions back to the active workspace so more edits can follow.
- Downloading the current document individually or every current document as one ZIP archive.
- Persisting document-set, element, link-group, generated-version, and confirmed-target audit metadata.
- Running automated backend workflow tests in CI.

## Technology choice

The proposal suggested React/TypeScript for the frontend and Node.js or Fastify for the backend. This starter uses:

- **Frontend:** React, TypeScript, and Vite.
- **Backend:** FastAPI and Python.
- **Document processing:** `python-docx`.
- **Database:** SQLAlchemy with SQLite for zero-setup local development and PostgreSQL compatibility through `DOCUMENTSYNC_DATABASE_URL`.

The Python backend is an intentional architecture decision because reliable DOCX parsing and generation are the highest technical risk in the project. The decision is documented in `docs/adr/0001-python-document-backend.md` and can be revisited after the first prototype review.

## Prerequisites

- Python 3.11 or newer.
- Node.js 20 or newer.
- npm.
- Microsoft Word desktop on Windows for the high-fidelity Word layout preview.

## Run locally

### 1. Start the backend

#### Windows PowerShell

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

#### macOS/Linux

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

The API documentation is available at `http://localhost:8001/docs`.

### 2. Start the frontend

Open a second terminal:

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:5173`.

The backend permits the local Vite origins on ports `5173` and `5174`, so the app also works if Vite selects `5174` because `5173` is already in use. Phase 2 uses backend port `8001` to avoid collisions with earlier prototypes on port `8000`.

### 3. Create sample DOCX files

From `apps/api` with the virtual environment active:

```bash
python scripts/create_sample_docs.py
```

This creates three sample agreements in `apps/api/sample-documents/` with one shared reporting paragraph and different building details.

## Run tests

### Backend

```bash
cd apps/api
pip install -r requirements.txt
pytest
```

### Frontend

```bash
cd apps/web
npm install
npm run build
```

## Project structure

```text
DocumentSync-starter/
├── apps/
│   ├── api/                 FastAPI backend and DOCX engine
│   └── web/                 React/Vite frontend
├── docs/
│   ├── adr/                 Architecture decision records
│   ├── api.md               HTTP interface summary
│   └── milestone-1.md       Build plan and acceptance evidence
├── .github/workflows/ci.yml
└── README.md
```

## Core HTTP endpoints

- `GET /api/health`
- `POST /api/document-sets`
- `GET /api/document-sets/{document_set_id}`
- `POST /api/documents/{document_id}/render`
- `GET /api/documents/{document_id}/download`
- `POST /api/document-sets/{document_set_id}/preview`
- `POST /api/document-sets/{document_set_id}/generate`
- `GET /api/generations/{generation_id}/download`

See `docs/api.md` for request and response details.

## Important current limitations

- The Word layout tab is exported by the installed Microsoft Word engine and includes Word pagination, tables, images, headers, and footers. It is read-only.
- Paragraphs, headings, and list items in the main document body are selectable in the separate Select text tab; tables, headers, footers, comments, tracked changes, and text boxes are not selectable yet.
- Microsoft Word automation is suitable for this local Windows prototype. A production service should use an isolated, licensed document-rendering service rather than desktop Office automation.
- Exact matching currently normalises whitespace and letter case.
- Replacement preserves the paragraph style and formatting of the first text run, but mixed formatting inside the replaced paragraph is intentionally not guaranteed yet.
- Authentication and organisation-level authorisation are not included in this first local vertical slice. They must be added using an established identity provider before deployment.
- Files are stored on the local backend filesystem in development. Production should use private object storage.

## Recommended next build order

1. Add established authentication and backend authorisation.
2. Add PostgreSQL migrations with Alembic.
3. Add an element-to-render bounding-box map so selection can happen directly over the Word layout.
4. Add simple table-cell extraction and editing.
5. Add similarity suggestions that always require user confirmation.
6. Add cloud-storage import/export.
7. Add reviewer approval and immutable audit events.


