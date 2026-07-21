from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .config import settings
from .database import get_session, init_db
from .document_service import (
    current_document_path,
    create_document_set,
    generate_versions,
    generation_download_path,
    get_document_or_404,
    get_document_set_or_404,
    get_element_matches_or_404,
    get_generation_or_404,
    get_link_group_or_404,
    preview_edit,
    render_document_with_word,
    rendered_pdf_path,
    serialize_document_set_history,
    serialize_document_set,
    serialize_document_view,
)
from .schemas import EditRequest


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="DocumentSync API",
    version="0.2.0",
    description="Phase 2 structured DOCX viewing and controlled-edit vertical slice.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/document-sets", status_code=201)
async def upload_document_set(
    name: str = Form(...),
    files: list[UploadFile] = File(...),
    session: Session = Depends(get_session),
) -> dict:
    document_set = await create_document_set(session, name, files)
    return serialize_document_set(document_set)


@app.get("/api/document-sets/{document_set_id}")
def read_document_set(
    document_set_id: str,
    session: Session = Depends(get_session),
) -> dict:
    return serialize_document_set(get_document_set_or_404(session, document_set_id))


@app.post("/api/documents/{document_id}/render")
def render_document(
    document_id: str,
    session: Session = Depends(get_session),
) -> dict:
    return render_document_with_word(session, get_document_or_404(session, document_id))


@app.get("/api/document-versions/{version_id}/pages")
def read_document_pages(
    version_id: str,
    session: Session = Depends(get_session),
) -> dict:
    return serialize_document_view(get_document_or_404(session, version_id))


@app.get("/api/document-versions/{version_id}/rendered-file")
def read_rendered_document(
    version_id: str,
    session: Session = Depends(get_session),
) -> FileResponse:
    document = get_document_or_404(session, version_id)
    path = rendered_pdf_path(document)
    if not path.exists():
        render_document_with_word(session, document)
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=f"{document.original_name.removesuffix('.docx')}-preview.pdf",
        content_disposition_type="inline",
        headers={"Cache-Control": "no-store"},
    )


@app.get("/api/documents/{document_id}/download")
def download_current_document(
    document_id: str,
    session: Session = Depends(get_session),
) -> FileResponse:
    document = get_document_or_404(session, document_id)
    return FileResponse(
        current_document_path(session, document),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=document.original_name,
        headers={"Cache-Control": "no-store"},
    )


@app.get("/api/document-elements/{element_id}/matches")
def read_element_matches(
    element_id: str,
    session: Session = Depends(get_session),
) -> dict:
    return get_element_matches_or_404(session, element_id)


@app.post("/api/document-sets/{document_set_id}/preview")
def preview_document_set_edit(
    document_set_id: str,
    request: EditRequest,
    session: Session = Depends(get_session),
) -> dict:
    group = get_link_group_or_404(session, document_set_id, request.link_group_id)
    return preview_edit(
        group,
        request.replacement_text,
        request.included_element_ids,
        request.source_element_id,
    )


@app.post("/api/document-sets/{document_set_id}/generate", status_code=201)
def generate_document_set_edit(
    document_set_id: str,
    request: EditRequest,
    session: Session = Depends(get_session),
) -> dict:
    group = get_link_group_or_404(session, document_set_id, request.link_group_id)
    job = generate_versions(
        session,
        document_set_id,
        group,
        request.replacement_text,
        request.included_element_ids,
        request.source_element_id,
    )
    return {
        "generation_id": job.id,
        "status": job.status,
        "files": [
            {
                "source_document_id": version.source_document_id,
                "name": version.download_name,
            }
            for version in sorted(job.versions, key=lambda item: item.download_name.casefold())
        ],
        "download_url": f"/api/generations/{job.id}/download",
        "document_set": serialize_document_set(
            get_document_set_or_404(session, document_set_id)
        ),
    }


@app.get("/api/document-sets/{document_set_id}/history")
def read_document_set_history(
    document_set_id: str,
    session: Session = Depends(get_session),
) -> dict:
    return serialize_document_set_history(session, document_set_id)


@app.get("/api/generations/{generation_id}/download")
def download_generation(
    generation_id: str,
    session: Session = Depends(get_session),
) -> FileResponse:
    job = get_generation_or_404(session, generation_id)
    path = generation_download_path(job)
    return FileResponse(
        path,
        media_type="application/zip",
        filename=f"DocumentSync-{generation_id}.zip",
    )
