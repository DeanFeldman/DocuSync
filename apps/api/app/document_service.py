from __future__ import annotations

import hashlib
import re
import shutil
import zipfile
from collections import defaultdict
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from docx import Document
from docx.document import Document as DocxDocument
from docx.text.paragraph import Paragraph
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .config import settings
from .models import (
    DocumentElement,
    DocumentRecord,
    DocumentSet,
    GeneratedVersion,
    GenerationJob,
    LinkGroup,
    LinkMember,
)


SAFE_NAME_PATTERN = re.compile(r"[^A-Za-z0-9._ -]+")
WHITESPACE_PATTERN = re.compile(r"\s+")


def new_id() -> str:
    return str(uuid4())


def normalise_text(text: str) -> str:
    return WHITESPACE_PATTERN.sub(" ", text).strip().casefold()


def safe_download_name(name: str) -> str:
    cleaned = SAFE_NAME_PATTERN.sub("_", Path(name).name).strip(" .")
    return cleaned or "document.docx"


def _validate_docx_payload(filename: str, payload: bytes) -> None:
    if not filename.lower().endswith(".docx"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"{filename}: only DOCX files are supported.",
        )
    if len(payload) > settings.max_file_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"{filename}: file exceeds the configured size limit.",
        )
    if not zipfile.is_zipfile(BytesIO(payload)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{filename}: the file is not a valid DOCX archive.",
        )

    with zipfile.ZipFile(BytesIO(payload)) as archive:
        entries = archive.infolist()
        names = {entry.filename for entry in entries}
        if "[Content_Types].xml" not in names or "word/document.xml" not in names:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{filename}: required DOCX parts are missing.",
            )
        if len(entries) > 1_000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{filename}: the DOCX archive contains too many parts.",
            )
        if any(entry.flag_bits & 0x1 for entry in entries):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{filename}: password-protected DOCX files are not supported.",
            )
        total_uncompressed = sum(entry.file_size for entry in entries)
        if total_uncompressed > 100 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{filename}: the expanded DOCX archive is too large.",
            )


def _extract_paragraphs(payload: bytes) -> list[tuple[int, str, str | None]]:
    try:
        document = Document(BytesIO(payload))
    except Exception as exc:  # python-docx raises several package/XML errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A DOCX file could not be opened. It may be corrupt or unsupported.",
        ) from exc

    elements: list[tuple[int, str, str | None]] = []
    for paragraph_index, paragraph in enumerate(document.paragraphs):
        text = paragraph.text.strip()
        if not text:
            continue
        style_name = paragraph.style.name if paragraph.style is not None else None
        elements.append((paragraph_index, text, style_name))
    return elements


async def create_document_set(
    session: Session,
    name: str,
    files: list[UploadFile],
) -> DocumentSet:
    cleaned_name = name.strip()
    if not cleaned_name:
        raise HTTPException(status_code=422, detail="Document-set name is required.")
    if len(files) < 2:
        raise HTTPException(status_code=422, detail="Upload at least two DOCX files.")
    if len(files) > settings.max_files_per_set:
        raise HTTPException(
            status_code=422,
            detail=f"A document set may contain at most {settings.max_files_per_set} files.",
        )

    document_set = DocumentSet(id=new_id(), name=cleaned_name)
    session.add(document_set)
    original_dir = settings.data_dir / "originals" / document_set.id
    original_dir.mkdir(parents=True, exist_ok=False)

    seen_names: set[str] = set()
    try:
        for upload in files:
            original_name = safe_download_name(upload.filename or "document.docx")
            name_key = original_name.casefold()
            if name_key in seen_names:
                raise HTTPException(
                    status_code=422,
                    detail=f"Duplicate file name in document set: {original_name}.",
                )
            seen_names.add(name_key)
            payload = await upload.read()
            _validate_docx_payload(original_name, payload)
            extracted = _extract_paragraphs(payload)

            document_id = new_id()
            stored_name = f"{document_set.id}/{document_id}.docx"
            target = settings.data_dir / "originals" / stored_name
            target.write_bytes(payload)

            record = DocumentRecord(
                id=document_id,
                document_set=document_set,
                original_name=original_name,
                stored_name=stored_name,
                checksum_sha256=hashlib.sha256(payload).hexdigest(),
            )
            session.add(record)

            for paragraph_index, text, style_name in extracted:
                session.add(
                    DocumentElement(
                        id=new_id(),
                        document=record,
                        paragraph_index=paragraph_index,
                        text=text,
                        normalized_text=normalise_text(text),
                        style_name=style_name,
                    )
                )

        session.flush()
        _create_exact_link_groups(session, document_set.id)
        session.commit()
    except Exception:
        session.rollback()
        shutil.rmtree(original_dir, ignore_errors=True)
        raise

    return get_document_set_or_404(session, document_set.id)


def _create_exact_link_groups(session: Session, document_set_id: str) -> None:
    elements = session.scalars(
        select(DocumentElement)
        .join(DocumentRecord)
        .where(DocumentRecord.document_set_id == document_set_id)
        .options(selectinload(DocumentElement.document))
    ).all()

    by_text: dict[str, list[DocumentElement]] = defaultdict(list)
    for element in elements:
        if element.normalized_text:
            by_text[element.normalized_text].append(element)

    for normalized_text, matches in by_text.items():
        distinct_documents = {match.document_id for match in matches}
        if len(distinct_documents) < 2:
            continue
        group = LinkGroup(
            id=new_id(),
            document_set_id=document_set_id,
            representative_text=matches[0].text,
            normalized_text=normalized_text,
            match_type="exact",
        )
        session.add(group)
        session.flush()
        for element in matches:
            session.add(LinkMember(id=new_id(), link_group=group, element=element))


def get_document_set_or_404(session: Session, document_set_id: str) -> DocumentSet:
    document_set = session.scalar(
        select(DocumentSet)
        .where(DocumentSet.id == document_set_id)
        .options(
            selectinload(DocumentSet.documents).selectinload(DocumentRecord.elements),
            selectinload(DocumentSet.link_groups)
            .selectinload(LinkGroup.members)
            .selectinload(LinkMember.element)
            .selectinload(DocumentElement.document),
        )
    )
    if document_set is None:
        raise HTTPException(status_code=404, detail="Document set not found.")
    return document_set


def serialize_document_set(document_set: DocumentSet) -> dict:
    documents = sorted(document_set.documents, key=lambda item: item.original_name.casefold())
    groups = sorted(
        document_set.link_groups,
        key=lambda item: (-len(item.members), item.representative_text.casefold()),
    )
    return {
        "id": document_set.id,
        "name": document_set.name,
        "created_at": document_set.created_at.isoformat(),
        "documents": [
            {
                "id": document.id,
                "name": document.original_name,
                "checksum_sha256": document.checksum_sha256,
                "element_count": len(document.elements),
            }
            for document in documents
        ],
        "link_groups": [serialize_link_group(group) for group in groups],
    }


def serialize_link_group(group: LinkGroup) -> dict:
    members = sorted(
        group.members,
        key=lambda member: (
            member.element.document.original_name.casefold(),
            member.element.paragraph_index,
        ),
    )
    return {
        "id": group.id,
        "match_type": group.match_type,
        "representative_text": group.representative_text,
        "member_count": len(members),
        "document_count": len({member.element.document_id for member in members}),
        "members": [
            {
                "element_id": member.element.id,
                "document_id": member.element.document_id,
                "document_name": member.element.document.original_name,
                "paragraph_index": member.element.paragraph_index,
                "text": member.element.text,
                "style_name": member.element.style_name,
            }
            for member in members
        ],
    }


def get_link_group_or_404(
    session: Session,
    document_set_id: str,
    link_group_id: str,
) -> LinkGroup:
    group = session.scalar(
        select(LinkGroup)
        .where(
            LinkGroup.id == link_group_id,
            LinkGroup.document_set_id == document_set_id,
        )
        .options(
            selectinload(LinkGroup.members)
            .selectinload(LinkMember.element)
            .selectinload(DocumentElement.document)
        )
    )
    if group is None:
        raise HTTPException(status_code=404, detail="Link group not found in this document set.")
    return group


def preview_edit(group: LinkGroup, replacement_text: str) -> dict:
    by_document: dict[str, dict] = {}
    for member in group.members:
        element = member.element
        item = by_document.setdefault(
            element.document_id,
            {
                "document_id": element.document_id,
                "document_name": element.document.original_name,
                "changes": [],
            },
        )
        item["changes"].append(
            {
                "paragraph_index": element.paragraph_index,
                "before": element.text,
                "after": replacement_text,
            }
        )

    documents = sorted(by_document.values(), key=lambda item: item["document_name"].casefold())
    for document in documents:
        document["changes"].sort(key=lambda item: item["paragraph_index"])

    return {
        "link_group_id": group.id,
        "replacement_text": replacement_text,
        "affected_document_count": len(documents),
        "affected_location_count": sum(len(document["changes"]) for document in documents),
        "documents": documents,
    }


def _replace_paragraph_text(paragraph: Paragraph, replacement_text: str) -> None:
    # Keep paragraph-level styling and reuse the first run's formatting as the MVP policy.
    if paragraph.runs:
        paragraph.runs[0].text = replacement_text
        for run in paragraph.runs[1:]:
            run.text = ""
    else:
        paragraph.add_run(replacement_text)


def _load_source_document(record: DocumentRecord) -> DocxDocument:
    source_path = settings.data_dir / "originals" / record.stored_name
    if not source_path.exists():
        raise HTTPException(status_code=500, detail="An original document is missing from storage.")
    return Document(source_path)


def generate_versions(
    session: Session,
    document_set_id: str,
    group: LinkGroup,
    replacement_text: str,
) -> GenerationJob:
    generation_id = new_id()
    generation_dir = settings.data_dir / "generated" / document_set_id / generation_id
    generation_dir.mkdir(parents=True, exist_ok=False)

    members_by_document: dict[str, list[DocumentElement]] = defaultdict(list)
    for member in group.members:
        members_by_document[member.element.document_id].append(member.element)

    generated_files: list[tuple[DocumentRecord, str, Path]] = []
    try:
        for document_id, elements in members_by_document.items():
            record = elements[0].document
            docx = _load_source_document(record)
            for element in sorted(elements, key=lambda item: item.paragraph_index):
                if element.paragraph_index >= len(docx.paragraphs):
                    raise HTTPException(
                        status_code=500,
                        detail=f"Paragraph location is no longer valid for {record.original_name}.",
                    )
                _replace_paragraph_text(docx.paragraphs[element.paragraph_index], replacement_text)

            source_name = Path(record.original_name)
            output_name = safe_download_name(f"{source_name.stem}-updated.docx")
            output_path = generation_dir / output_name
            docx.save(output_path)
            generated_files.append((record, output_name, output_path))

        zip_name = f"documentsync-{generation_id}.zip"
        zip_path = generation_dir / zip_name
        with zipfile.ZipFile(zip_path, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
            for _, output_name, output_path in generated_files:
                archive.write(output_path, arcname=output_name)

        job = GenerationJob(
            id=generation_id,
            document_set_id=document_set_id,
            link_group_id=group.id,
            replacement_text=replacement_text,
            zip_storage_name=f"{document_set_id}/{generation_id}/{zip_name}",
            status="completed",
        )
        session.add(job)
        for record, output_name, output_path in generated_files:
            session.add(
                GeneratedVersion(
                    id=new_id(),
                    generation=job,
                    source_document_id=record.id,
                    download_name=output_name,
                    storage_name=str(output_path.relative_to(settings.data_dir / "generated")),
                )
            )
        session.commit()
        session.refresh(job)
        return session.scalar(
            select(GenerationJob)
            .where(GenerationJob.id == generation_id)
            .options(selectinload(GenerationJob.versions))
        )
    except Exception:
        session.rollback()
        shutil.rmtree(generation_dir, ignore_errors=True)
        raise


def get_generation_or_404(session: Session, generation_id: str) -> GenerationJob:
    job = session.scalar(
        select(GenerationJob)
        .where(GenerationJob.id == generation_id)
        .options(selectinload(GenerationJob.versions))
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Generation not found.")
    return job


def generation_download_path(job: GenerationJob) -> Path:
    path = settings.data_dir / "generated" / job.zip_storage_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Generated ZIP file is missing.")
    return path
