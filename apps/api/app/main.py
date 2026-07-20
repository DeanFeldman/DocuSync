from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .config import settings
from .database import get_session, init_db
from .document_service import (
    create_document_set,
    generate_versions,
    generation_download_path,
    get_document_set_or_404,
    get_generation_or_404,
    get_link_group_or_404,
    preview_edit,
    serialize_document_set,
)
from .schemas import EditRequest


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="DocumentSync API",
    version="0.1.0",
    description="Milestone 1 DOCX exact-match and controlled-edit vertical slice.",
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


@app.post("/api/document-sets/{document_set_id}/preview")
def preview_document_set_edit(
    document_set_id: str,
    request: EditRequest,
    session: Session = Depends(get_session),
) -> dict:
    group = get_link_group_or_404(session, document_set_id, request.link_group_id)
    return preview_edit(group, request.replacement_text)


@app.post("/api/document-sets/{document_set_id}/generate", status_code=201)
def generate_document_set_edit(
    document_set_id: str,
    request: EditRequest,
    session: Session = Depends(get_session),
) -> dict:
    group = get_link_group_or_404(session, document_set_id, request.link_group_id)
    job = generate_versions(session, document_set_id, group, request.replacement_text)
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
    }


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
