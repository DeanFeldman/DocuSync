# DocSync 1.0.0 desktop release notes

Local Windows artifact: `DocSync-Setup-1.0.0.exe`. The verified size and SHA-256 are recorded after the final build.

## Main change

The Phase 2 DOCX controlled-edit workspace is now the installed desktop application. The 0.3.0 plain-text template workflow is retained in source for reference but is no longer packaged as the primary interface.

## Included

- Electron window with automatic FastAPI backend startup and shutdown.
- Self-contained PyInstaller backend; installed users do not need Python or Node.js.
- React upload workspace for 2–20 related DOCX files.
- Microsoft Word-generated, read-only layout preview with structured-preview fallback.
- Selectable supported body elements, exact-match discovery, and per-location confirmation.
- Full before/after impact review.
- Immutable updated DOCX versions which immediately become the current documents for continued editing.
- Final ZIP action fixed to the bottom of the workspace and saved through Electron’s Windows download routine.
- Random HttpOnly desktop-session cookie, localhost-only ephemeral API, CSP, renderer sandbox, and restricted navigation/permissions/downloads.
- FastAPI workflow, desktop-session, static-serving, Node template-engine, frontend helper, and save-boundary tests.
- Windows CI for React, Python, PyInstaller, Electron, NSIS, and artifact checksum generation.

## Verified locally

- Five FastAPI tests passed.
- Fourteen retained Node tests passed.
- React production build passed.
- Frozen backend health, frontend serving, and session protection passed.
- Packaged Electron smoke completed upload, Word preview, three-target review, generation, continued editing, refreshed Word preview, and a 99,981-byte ZIP response.

## Known limitations

- Microsoft Word must be installed for Word-authored layout previews.
- Selection does not yet cover tables, headers, footers, comments, tracked changes, or text boxes.
- Mixed inline formatting in a replaced paragraph is not guaranteed.
- The installer is unsigned.
- Clean-machine installation/uninstallation, keyboard-only use, increased Windows text scaling, and independent user validation remain pending.
