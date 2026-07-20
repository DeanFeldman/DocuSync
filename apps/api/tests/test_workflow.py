from __future__ import annotations

import hashlib
import importlib
import io
import os
import sys
import zipfile
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1]
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from docx import Document
from fastapi.testclient import TestClient


def make_docx(building: str, address: str, shared: str) -> bytes:
    stream = io.BytesIO()
    document = Document()
    document.add_heading(f"{building} Agreement", level=1)
    document.add_paragraph(f"Property: {building}")
    document.add_paragraph(f"Address: {address}")
    document.add_paragraph(shared)
    document.add_paragraph(f"Unique contact for {building}.")
    document.save(stream)
    return stream.getvalue()


def load_test_app(tmp_path: Path):
    os.environ["DOCUMENTSYNC_DATA_DIR"] = str(tmp_path / "data")
    os.environ["DOCUMENTSYNC_DATABASE_URL"] = f"sqlite:///{tmp_path / 'test.db'}"

    for module_name in list(sys.modules):
        if module_name == "app" or module_name.startswith("app."):
            del sys.modules[module_name]

    main = importlib.import_module("app.main")
    return main.app


def test_exact_match_preview_generation_and_original_immutability(tmp_path: Path) -> None:
    shared = "The building manager must submit the report every month."
    replacement = (
        "The building manager must submit the report by the fifth working day of every month."
    )
    originals = {
        "Building-A-Agreement.docx": make_docx("Building A", "1 Alpha Road", shared),
        "Building-B-Agreement.docx": make_docx("Building B", "2 Beta Avenue", shared),
        "Building-C-Agreement.docx": make_docx("Building C", "3 Gamma Street", shared),
    }
    original_hashes = {name: hashlib.sha256(payload).hexdigest() for name, payload in originals.items()}

    app = load_test_app(tmp_path)
    with TestClient(app) as client:
        response = client.post(
            "/api/document-sets",
            data={"name": "Building agreements"},
            files=[
                (
                    "files",
                    (name, io.BytesIO(payload), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                )
                for name, payload in originals.items()
            ],
        )
        assert response.status_code == 201, response.text
        payload = response.json()
        assert len(payload["documents"]) == 3

        matching_group = next(
            group for group in payload["link_groups"] if group["representative_text"] == shared
        )
        assert matching_group["document_count"] == 3

        preview = client.post(
            f"/api/document-sets/{payload['id']}/preview",
            json={
                "link_group_id": matching_group["id"],
                "replacement_text": replacement,
            },
        )
        assert preview.status_code == 200
        assert preview.json()["affected_document_count"] == 3
        assert preview.json()["affected_location_count"] == 3

        generated = client.post(
            f"/api/document-sets/{payload['id']}/generate",
            json={
                "link_group_id": matching_group["id"],
                "replacement_text": replacement,
            },
        )
        assert generated.status_code == 201, generated.text
        download = client.get(generated.json()["download_url"])
        assert download.status_code == 200

    with zipfile.ZipFile(io.BytesIO(download.content)) as archive:
        assert len(archive.namelist()) == 3
        for member_name in archive.namelist():
            updated = Document(io.BytesIO(archive.read(member_name)))
            all_text = "\n".join(paragraph.text for paragraph in updated.paragraphs)
            assert replacement in all_text
            building_letter = member_name.split("-")[1]
            assert f"Building {building_letter}" in all_text

    originals_dir = tmp_path / "data" / "originals" / payload["id"]
    stored_files = list(originals_dir.glob("*.docx"))
    assert len(stored_files) == 3
    stored_hashes = {hashlib.sha256(path.read_bytes()).hexdigest() for path in stored_files}
    assert stored_hashes == set(original_hashes.values())
