# Desktop security review

## Implemented controls

- Renderer Node.js integration is disabled; context isolation and Chromium sandboxing are enabled.
- The Phase 2 renderer receives no Node, filesystem, process, token, or raw IPC bridge.
- New windows, cross-origin top-level navigation, renderer permission requests, and untrusted downloads are denied.
- Downloads are accepted only from the current ephemeral local backend origin and use Electron’s native save routine.
- A restrictive Content Security Policy and defensive HTTP headers are returned by FastAPI while still permitting the same-origin Word PDF frame.
- The backend binds only to `127.0.0.1` on an operating-system-selected port.
- Electron creates a random token per launch and stores it in an HttpOnly, SameSite=Strict cookie scoped to the ephemeral origin.
- Protected API requests compare the cookie in constant time. Health remains unauthenticated so Electron can perform its startup gate.
- Upload count, names, extensions, MIME types, sizes, DOCX ZIP structure, edit targets, replacement lengths, and generation state are validated by the backend.
- Originals are immutable; generated versions, PDFs, the SQLite database, and ZIPs stay under the application’s user-data directory.
- Word conversion receives resolved local paths through a fixed PowerShell script packaged with the backend; renderer content cannot supply a script path.
- No credentials or persistent application secrets are embedded in the installer.

## Residual risks

- A process already controlling the same Windows account may inspect application memory, cookies, local files, or process state.
- Microsoft Word automation may display a dialogue, time out, or fail on damaged/unsupported files. The frontend falls back to the structured preview.
- The supported-edit model does not cover every Word structure, and mixed inline formatting may not survive replacement.
- The release is unsigned and has no automatic security-update channel.
- Local documents remain unencrypted at rest under the current Windows account.
- Electron, Chromium, Python, FastAPI, PyInstaller, and document dependencies require ongoing security updates.

## Release checks

1. Run the Node and Python tests, React production build, frozen-backend smoke, and packaged Electron workflow.
2. Run `npm audit` and review Python dependency advisories.
3. Confirm no `.env`, credentials, personal test documents, developer logs, or absolute developer paths appear in packaged resources.
4. Confirm renderer isolation, navigation and permission denial, same-origin downloads, CSP, localhost binding, and the HttpOnly session cookie.
5. Generate and record the installer SHA-256 checksum.
6. Code-sign the installer before broader distribution.
