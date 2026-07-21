# Desktop document API

Electron starts the bundled FastAPI service on an operating-system-selected port bound to `127.0.0.1`. The React production build is served from the same origin, so the installed application does not use a fixed port or cross-origin requests.

## Desktop session

At every launch Electron creates a cryptographically random token and stores it in an HttpOnly, SameSite=Strict `docsync_session` cookie for the ephemeral backend origin. Every `/api/*` endpoint except health requires that cookie when desktop protection is enabled. The value is not exposed to renderer JavaScript.

## Health and document-set endpoints

| Method and path | Purpose |
|---|---|
| `GET /api/health` | Backend startup health gate. |
| `POST /api/document-sets` | Upload 2–20 DOCX files and create the related set. |
| `GET /api/document-sets/{document_set_id}` | Read the current document set and link groups. |
| `GET /api/document-sets/{document_set_id}/history` | Read immutable generation history. |

Uploads use `multipart/form-data` with a document-set `name` and repeated `files` fields. The backend validates the extension, MIME type, size, count, ZIP/DOCX structure, and document content.

## Preview and controlled-edit endpoints

| Method and path | Purpose |
|---|---|
| `POST /api/documents/{document_id}/render` | Render the current DOCX version through Microsoft Word and return view metadata. |
| `GET /api/document-versions/{version_id}/rendered-file` | Stream the cached Word-generated PDF for the same-origin preview frame. |
| `GET /api/document-versions/{version_id}/pages` | Return structured supported elements and estimated page groups. |
| `GET /api/document-elements/{element_id}/matches` | Discover exact linked elements in the document set. |
| `POST /api/document-sets/{document_set_id}/preview` | Validate target selection and return the full before/after impact. |
| `POST /api/document-sets/{document_set_id}/generate` | Create immutable updated DOCX versions and return the refreshed set. |

Preview and generation use the same JSON request:

```json
{
  "link_group_id": "<group UUID>",
  "source_element_id": "<element UUID>",
  "included_element_ids": ["<element UUID>", "<element UUID>"],
  "replacement_text": "The confirmed replacement paragraph."
}
```

## Downloads

| Method and path | Purpose |
|---|---|
| `GET /api/documents/{document_id}/download` | Download the current version of one DOCX. |
| `GET /api/generations/{generation_id}/download` | Download the complete generated set as a ZIP. |

The final download remains available after generation while the refreshed document versions stay active for further edits. Electron allows downloads only from the current ephemeral backend origin and applies a native Save dialog configuration.

See `docs/api.md` for the full Phase 2 response models and error behavior.
