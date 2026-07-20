# DocumentSync

DocumentSync is a web application for applying one confirmed edit across several related existing DOCX files while preserving each file's unique content and keeping the original uploads unchanged.

This repository is a **Milestone 1 vertical slice** based on the proposal. It already supports:

- Uploading two or more `.docx` files as a document set.
- Validating file type, size, and basic DOCX structure.
- Extracting non-empty paragraphs.
- Finding exact repeated paragraphs across different documents.
- Letting the user choose a repeated paragraph and enter replacement text.
- Previewing every affected file and paragraph.
- Generating new DOCX versions without modifying the originals.
- Downloading all generated files as one ZIP archive.
- Persisting document-set, element, link-group, and generation metadata in a relational database.
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

## Run locally

### 1. Start the backend

#### Windows PowerShell

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

#### macOS/Linux

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

The API documentation is available at `http://localhost:8000/docs`.

### 2. Start the frontend

Open a second terminal:

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:5173`.

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
- `POST /api/document-sets/{document_set_id}/preview`
- `POST /api/document-sets/{document_set_id}/generate`
- `GET /api/generations/{generation_id}/download`

See `docs/api.md` for request and response details.

## Important current limitations

- Paragraphs in the main document body are supported; tables, headers, footers, comments, tracked changes, text boxes, and PowerPoint are not yet supported.
- Exact matching currently normalises whitespace and letter case.
- Replacement preserves the paragraph style and formatting of the first text run, but mixed formatting inside the replaced paragraph is intentionally not guaranteed yet.
- Authentication and organisation-level authorisation are not included in this first local vertical slice. They must be added using an established identity provider before deployment.
- Files are stored on the local backend filesystem in development. Production should use private object storage.

## Recommended next build order

1. Add established authentication and backend authorisation.
2. Add PostgreSQL migrations with Alembic.
3. Add table-cell and heading support.
4. Add a true side-by-side rendered preview.
5. Add similarity suggestions that always require user confirmation.
6. Add cloud-storage import/export.
7. Add reviewer approval and immutable audit events.

## Student

Dean Feldman — 2803899
