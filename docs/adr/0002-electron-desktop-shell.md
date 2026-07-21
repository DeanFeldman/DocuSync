# ADR 0002: Electron shell with the bundled Phase 2 document service

- Status: Accepted, revised after Phase 2 was selected as the main product workflow
- Date: 2026-07-21

## Context

DocSync needs an installable Windows application that opens in its own window, starts its backend automatically, preserves the existing React/FastAPI separation, generates Word-authored previews, and downloads updated DOCX files without developer commands. Replacing the proven Phase 2 Python document engine with the Phase 3 plain-text Node proof would remove the product’s central capability.

## Decision

Use Electron for the Windows shell, the Phase 2 React/Vite application as the renderer, and the Phase 2 FastAPI/Python service as the local backend.

- Vite produces static frontend assets which FastAPI serves from the same ephemeral origin as the API.
- PyInstaller freezes Python, FastAPI, SQLAlchemy, SQLite, `python-docx`, and Uvicorn into a self-contained Windows service.
- Electron starts that service on `127.0.0.1`, waits for `/api/health`, sets an HttpOnly per-launch session cookie, and opens the React application.
- The renderer has `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`; it needs no preload bridge.
- Electron restricts navigation, windows, permissions, and downloads to the current backend origin.
- Electron Builder produces an assisted NSIS installer containing the shell, React build, frozen backend, and fixed Word-rendering script.

## Alternatives considered

- **Ship the plain-text Node template proof:** simpler and smaller, but it omits the DOCX workflow the product is intended to provide.
- **Rewrite DOCX processing in Node:** creates duplicate risk and discards the tested Python implementation without a user benefit.
- **Require system Python:** smaller installer, but fails the no-developer-runtime installation requirement.
- **Bundle an embeddable Python distribution manually:** workable, but more fragile than a reproducible PyInstaller application bundle.
- **Tauri or native .NET UI:** potentially smaller or more Windows-native, but requires a shell rewrite before the document workflow is validated.
- **Browser plus manually started FastAPI:** useful during development, but fails the desktop and automatic-backend requirements.

## Consequences

- The Phase 2 DOCX workspace is the application users see after installation.
- Installed users need neither Node.js nor Python; Microsoft Word is still required for the high-fidelity layout preview.
- The installer is larger because it contains Electron and a 44.6 MB frozen Python service.
- Frontend and backend remain independently testable, and the browser development workflow still works through Vite’s `/api` proxy.
- PyInstaller exclusions and hidden imports must be reviewed when backend dependencies change.
- The retained plain-text prototype is no longer part of packaged resources.

## References

- Electron security checklist: <https://www.electronjs.org/docs/latest/tutorial/security>
- Electron context isolation: <https://www.electronjs.org/docs/latest/tutorial/context-isolation>
- Electron process sandboxing: <https://www.electronjs.org/docs/latest/tutorial/sandbox>
- Electron downloads: <https://www.electronjs.org/docs/latest/api/download-item>
- Electron Builder NSIS target: <https://www.electron.build/nsis/>
- PyInstaller project: <https://pypi.org/project/pyinstaller/>
