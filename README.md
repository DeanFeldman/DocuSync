# DocumentSync

DocumentSync v1 is an installable Windows application for applying one confirmed edit across related DOCX files while keeping the original uploads unchanged. The controlled DOCX workspace is the main Electron application. The earlier plain-text template proof remains in source as an architecture reference, but it is not part of the installed product.

## Phase 3 desktop quick start

Development requires Node.js 22 or newer and Python 3.11 or newer. The packaged Windows application includes both the Electron runtime and a frozen Python document service.

```powershell
npm install
python -m pip install -r apps/api/requirements.txt
npm test
npm start
```

`npm start` builds the React interface, opens DocSync in its own Electron window, and automatically starts the FastAPI document service on an ephemeral `127.0.0.1` port. Microsoft Word desktop is required for the high-fidelity Word-layout preview; the selectable structured preview remains available as a fallback.

Build the assisted NSIS installer:

```powershell
python -m pip install -r apps/api/requirements-build.txt
npm run dist:win
```

Installer output is written to `release/v1/`. Installed users do not need Node.js, npm, Python, or developer tools. See `docs/phase-3.md` for status and acceptance evidence, `docs/phase-3-api.md` for the desktop API, and `docs/phase-3-testing.md` for the clean-install checklist.

## Phase 2 DOCX workspace

The installed desktop application contains the **Phase 2 controlled-edit vertical slice**. It supports:

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

## Desktop technology choice

The application uses:

- **Desktop shell and installer:** Electron, Electron Builder, and NSIS.
- **Frontend:** React, TypeScript, and Vite, served by the local backend inside Electron.
- **Backend:** FastAPI and Python, bundled as a Windows executable with PyInstaller.
- **Document processing:** `python-docx`.
- **Database:** SQLAlchemy with SQLite for zero-setup local development and PostgreSQL compatibility through `DOCUMENTSYNC_DATABASE_URL`.

The Python backend is intentional because DOCX parsing and generation are the core product capability. The decisions are documented in `docs/adr/0001-python-document-backend.md` and `docs/adr/0002-electron-desktop-shell.md`.

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
│   ├── desktop/             Electron lifecycle, security, downloads, and packaging entry
│   ├── api/                 Main FastAPI backend, DOCX engine, and PyInstaller entry
│   ├── web/                 Main React/Vite controlled-edit interface
│   ├── desktop-ui/          Retained plain-text architecture prototype, not shipped
│   └── template-api/        Retained template-engine prototype, not shipped
├── docs/
│   ├── adr/                 Architecture decision records
│   ├── api.md               HTTP interface summary
│   └── milestone-1.md       Build plan and acceptance evidence
├── .github/workflows/phase3-desktop.yml
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
- The packaged desktop app includes Python and the FastAPI service, but it does not include Microsoft Word. Word must be installed for high-fidelity layout rendering.
- Paragraphs, headings, and list items in the main document body are selectable in the separate Select text tab; tables, headers, footers, comments, tracked changes, and text boxes are not selectable yet.
- This local Windows release uses the installed Microsoft Word application for layout rendering. Any future shared or server edition should use an isolated, licensed document-rendering service rather than desktop Office automation.
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
8. Add a backlog of Document Sets to come back to 

extras
- logo
- Saved document-set library
- History screen and undo
- Real before/after diff
- Add/remove documents from existing sets
- Tag-triggered GitHub Release workflow
- Table-cell support
- Direct selection from the Word layout
- Fuzzy match suggestions
- Global workspace search
- Authentication and cloud storage only when moving beyond local use
