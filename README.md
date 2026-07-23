# DocSync

[![Desktop CI](https://github.com/DeanFeldman/DocuSync/actions/workflows/phase3-desktop.yml/badge.svg)](https://github.com/DeanFeldman/DocuSync/actions/workflows/phase3-desktop.yml)
[![Release](https://github.com/DeanFeldman/DocuSync/actions/workflows/release.yml/badge.svg)](https://github.com/DeanFeldman/DocuSync/actions/workflows/release.yml)

DocSync is a Windows desktop application for ap plying one confirmed edit across related Microsoft Word documents while preserving the original uploads.

The application lets users upload a set of related `.docx` files, inspect each document, select repeated content, choose exactly which matches should change, preview the effect, and generate updated document versions.

## Download the Windows application
The latest Windows installer is available from the GitHub **Releases** page.

Each release contains:

- `DocSync-Setup-<version>.exe` — installer for that specific version.
- `DocSync-Setup-latest.exe` — the newest available installer.
- `SHA256SUMS.txt` — checksums for verifying the downloaded files.

For most users, download:

```text
DocSync-Setup-latest.exe
``` 

## Main features

- Upload between 2 and 20 related `.docx` files as a document set.
- Reopen saved document sets from the local workspace library.
- Open and scroll through each uploaded document.
- Use a Microsoft Word-generated layout preview when Word is installed.
- Fall back to a structured selectable preview when Word rendering is unavailable.
- Search visible document text.
- Select supported paragraphs, headings, and list items.
- Find exact repeated content across multiple documents.
- Include or exclude each matching location before applying an edit.
- Preview every affected document and paragraph.
- Generate new versions without modifying the original uploads.
- Continue editing the newly generated workspace versions.
- Download one current document or the complete document set as a ZIP archive.
- Persist document sets, elements, link groups, generated versions, and edit metadata locally.
- Build an installable Windows application with Electron Builder and NSIS.
- Automatically publish tagged versions through GitHub Actions.

## Technology

- **Desktop shell:** Electron
- **Installer:** Electron Builder and NSIS
- **Frontend:** React, TypeScript, and Vite
- **Backend:** FastAPI and Python
- **Document processing:** `python-docx`
- **Database:** SQLAlchemy with SQLite
- **Backend packaging:** PyInstaller
- **Automation:** GitHub Actions

The packaged Windows application includes the Electron runtime and the frozen Python backend. Installed users do not need Node.js, npm, Python, or developer tools.

## Requirements for development

- Windows 10 or Windows 11
- Node.js 22 or newer
- Python 3.11 or newer
- npm
- Microsoft Word desktop for the high-fidelity Word layout preview

Microsoft Word is not required for the structured fallback preview.

## Run locally

Run the following commands from the repository root in Windows PowerShell:

```powershell
cd "C:\path\to\DocuSync"

npm install
python -m pip install -r apps/api/requirements.txt
npm test
npm start
```

`npm start` builds the React frontend, starts the local FastAPI service, and opens DocSync in an Electron window.

### PowerShell execution-policy error

If PowerShell blocks `npm.ps1`, use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd test
npm.cmd start
```

Alternatively, allow scripts only for the current PowerShell session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## Run the frontend and backend separately

### Backend

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

The FastAPI documentation is available at:

```text
http://localhost:8001/docs
```

### Frontend

Open another terminal:

```powershell
cd apps/web
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Run tests

Run all tests from the repository root:

```powershell
npm test
```

Run the backend tests directly:

```powershell
cd apps/api
python -m pip install -r requirements.txt
python -m pytest
```

Build-check the frontend:

```powershell
npm run build:web
```

## Build the Windows installer

Install the build requirements:

```powershell
python -m pip install -r apps/api/requirements-build.txt
npm install
```

Build the installer:

```powershell
npm run dist:win
```

The installer is written to:

```text
release/v1/DocSync-Setup-<version>.exe
```

A successfully packaged application may also appear under:

```text
release/v1/win-unpacked/
```

Do not commit the `release/` directory to Git. Installer files belong on the GitHub Releases page.

## Automatic GitHub releases

The release workflow runs whenever a tag beginning with `v` is pushed.

Example:

```powershell
git switch main
git pull origin main

git tag -a v1.1.0 -m "DocSync v1.1.0"
git push origin v1.1.0
```

GitHub Actions will then:

1. Check out the tagged source code.
2. Install Node and Python dependencies.
3. Set the package version from the Git tag.
4. Run the automated tests.
5. Build the Windows installer.
6. Generate a SHA-256 checksum.
7. Create a permanent GitHub Release.
8. Upload the installer and checksum file.

The workflow file is located at:

```text
.github/workflows/release.yml
```

Use semantic version tags:

```text
v1.0.0  Initial stable release
v1.1.0  New backwards-compatible features
v1.1.1  Bug fixes
v2.0.0  Breaking changes
```

Do not reuse or move a published version tag. Create a new version tag for every release.

## Project structure

```text
DocuSync/
├── .github/
│   └── workflows/
│       ├── phase3-desktop.yml     Test and installer build workflow
│       └── release.yml            Tag-triggered GitHub Release workflow
├── apps/
│   ├── api/                       FastAPI backend and DOCX engine
│   ├── desktop/                   Electron application lifecycle
│   ├── web/                       React and TypeScript frontend
│   ├── desktop-ui/                Retained architecture prototype
│   └── template-api/              Retained template-engine prototype
├── build/
│   ├── icon.ico                   Windows installer and application icon
│   └── icon.png                   Development-window icon
├── docs/
│   └── adr/                       Architecture decision records
├── package.json
├── package-lock.json
└── README.md
```

## Core API endpoints

```text
GET  /api/health
GET  /api/document-sets
POST /api/document-sets
GET  /api/document-sets/{document_set_id}
POST /api/documents/{document_id}/render
GET  /api/document-versions/{version_id}/pages
GET  /api/document-versions/{version_id}/rendered-file
GET  /api/documents/{document_id}/download
GET  /api/document-elements/{element_id}/matches
POST /api/document-sets/{document_set_id}/preview
POST /api/document-sets/{document_set_id}/generate
GET  /api/document-sets/{document_set_id}/history
GET  /api/generations/{generation_id}/download
```

## Current limitations

- The Microsoft Word layout preview is read-only.
- Microsoft Word must be installed for high-fidelity layout rendering.
- Direct text selection currently happens in the structured preview rather than over the Word layout.
- Selectable content is currently focused on paragraphs, headings, and list items.
- Tables, headers, footers, comments, tracked changes, text boxes, and other advanced Word elements are not fully editable yet.
- Exact matching currently normalises whitespace and letter case.
- Replacements preserve the paragraph style and first text-run formatting, but complex mixed formatting is not guaranteed.
- The current release is designed as a local desktop application and does not include organisation authentication or cloud storage.
- The Windows installer is not yet commercially code-signed and may trigger a Microsoft SmartScreen warning.

## Recommended next build order

1. Add a read-only history screen.
2. Add undo and version restoration.
3. Add a richer before-and-after diff.
4. Allow documents to be added to or removed from existing sets.
5. Add global search across a document set.
6. Add table-cell extraction and editing.
7. Add fuzzy-match suggestions that require confirmation.
8. Add direct element selection over the Word layout.
9. Add authentication, PostgreSQL migrations, and cloud storage when moving beyond local use.
10. delete document sets and be able to add/remove docs to a particular set

## Safety model

DocSync is designed around explicit confirmation:

- Original uploads are preserved.
- Matches are shown before changes are generated.
- Users choose which matching locations are included.
- Generated documents are stored as new versions.
- Downloads are produced only after the user confirms the edit.

## Licence

The project is currently marked as `UNLICENSED`. No permission is granted to copy, modify, or distribute the source code unless a licence is added later.
