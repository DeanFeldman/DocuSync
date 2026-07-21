# Desktop 1.0.0 local verification record

- Date: 21 July 2026
- Platform: Windows 11
- Application version: 1.0.0

## Automated and packaged results

| Check | Result |
|---|---|
| Main FastAPI DOCX tests | 5 passed, 0 failed; one dependency deprecation warning |
| Retained Node prototype tests | 14 passed, 0 failed |
| Main React production build | Passed |
| Frozen FastAPI/Python service | Built; 44.6 MB; health/static/session smoke passed |
| Assisted NSIS installer | Built successfully |
| Packaged Phase 2 Electron workflow | Passed end to end |

The packaged workflow uploaded three DOCX files, displayed a Microsoft Word-generated layout, found three exact matches, reviewed and applied the replacement, refreshed the current Word preview for continued editing, and returned a 99,981-byte final ZIP. The renderer exposed no Node globals and produced no console or page errors.

## Installer

- File: `DocSync-Setup-1.0.0.exe`
- Size and SHA-256: recorded after the final build
- Checksum comparison: passed

## Visual evidence

- [Phase 2 Word workflow as the packaged desktop application](phase2-desktop-main.png)
- [Historical 0.3.0 plain-text proof](phase3-desktop.png)
- [Historical 0.3.0 narrow-layout proof](phase3-desktop-narrow.png)

## Evidence still required

Clean-machine installation, Start Menu and desktop-shortcut launch, native save-dialog confirmation by a person, uninstall verification, keyboard-only use, increased Windows text scaling, and independent user feedback remain manual checks. They are intentionally not reported as passed.
