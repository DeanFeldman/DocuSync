from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    api_dir: Path
    data_dir: Path
    database_url: str
    cors_origins: tuple[str, ...]
    max_file_bytes: int
    max_files_per_set: int


def _build_settings() -> Settings:
    api_dir = Path(__file__).resolve().parents[1]
    raw_data_dir = os.getenv("DOCUMENTSYNC_DATA_DIR", "./data")
    data_dir = Path(raw_data_dir)
    if not data_dir.is_absolute():
        data_dir = (api_dir / data_dir).resolve()

    default_database = f"sqlite:///{(data_dir / 'documentsync.db').as_posix()}"
    database_url = os.getenv("DOCUMENTSYNC_DATABASE_URL", default_database)
    cors_origins = tuple(
        origin.strip()
        for origin in os.getenv(
            "DOCUMENTSYNC_CORS_ORIGINS", "http://localhost:5173"
        ).split(",")
        if origin.strip()
    )

    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "originals").mkdir(parents=True, exist_ok=True)
    (data_dir / "generated").mkdir(parents=True, exist_ok=True)

    return Settings(
        api_dir=api_dir,
        data_dir=data_dir,
        database_url=database_url,
        cors_origins=cors_origins,
        max_file_bytes=int(os.getenv("DOCUMENTSYNC_MAX_FILE_BYTES", str(10 * 1024 * 1024))),
        max_files_per_set=int(os.getenv("DOCUMENTSYNC_MAX_FILES_PER_SET", "20")),
    )


settings = _build_settings()
