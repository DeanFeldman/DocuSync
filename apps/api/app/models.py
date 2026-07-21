from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DocumentSet(Base):
    __tablename__ = "document_sets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    documents: Mapped[list[DocumentRecord]] = relationship(
        back_populates="document_set", cascade="all, delete-orphan"
    )
    link_groups: Mapped[list[LinkGroup]] = relationship(
        back_populates="document_set", cascade="all, delete-orphan"
    )
    generations: Mapped[list[GenerationJob]] = relationship(
        back_populates="document_set", cascade="all, delete-orphan"
    )


class DocumentRecord(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_set_id: Mapped[str] = mapped_column(
        ForeignKey("document_sets.id", ondelete="CASCADE"), index=True
    )
    original_name: Mapped[str] = mapped_column(String(255))
    stored_name: Mapped[str] = mapped_column(String(255), unique=True)
    checksum_sha256: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    document_set: Mapped[DocumentSet] = relationship(back_populates="documents")
    elements: Mapped[list[DocumentElement]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class DocumentElement(Base):
    __tablename__ = "document_elements"
    __table_args__ = (
        UniqueConstraint("document_id", "paragraph_index", name="uq_document_paragraph"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_id: Mapped[str] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    paragraph_index: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    normalized_text: Mapped[str] = mapped_column(Text, index=True)
    style_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    document: Mapped[DocumentRecord] = relationship(back_populates="elements")
    link_memberships: Mapped[list[LinkMember]] = relationship(
        back_populates="element", cascade="all, delete-orphan"
    )


class LinkGroup(Base):
    __tablename__ = "link_groups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_set_id: Mapped[str] = mapped_column(
        ForeignKey("document_sets.id", ondelete="CASCADE"), index=True
    )
    representative_text: Mapped[str] = mapped_column(Text)
    normalized_text: Mapped[str] = mapped_column(Text)
    match_type: Mapped[str] = mapped_column(String(40), default="exact")

    document_set: Mapped[DocumentSet] = relationship(back_populates="link_groups")
    members: Mapped[list[LinkMember]] = relationship(
        back_populates="link_group", cascade="all, delete-orphan"
    )


class LinkMember(Base):
    __tablename__ = "link_members"
    __table_args__ = (
        UniqueConstraint("link_group_id", "element_id", name="uq_link_group_element"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    link_group_id: Mapped[str] = mapped_column(
        ForeignKey("link_groups.id", ondelete="CASCADE"), index=True
    )
    element_id: Mapped[str] = mapped_column(
        ForeignKey("document_elements.id", ondelete="CASCADE"), index=True
    )

    link_group: Mapped[LinkGroup] = relationship(back_populates="members")
    element: Mapped[DocumentElement] = relationship(back_populates="link_memberships")


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_set_id: Mapped[str] = mapped_column(
        ForeignKey("document_sets.id", ondelete="CASCADE"), index=True
    )
    link_group_id: Mapped[str] = mapped_column(String(36), index=True)
    replacement_text: Mapped[str] = mapped_column(Text)
    zip_storage_name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), default="completed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    document_set: Mapped[DocumentSet] = relationship(back_populates="generations")
    versions: Mapped[list[GeneratedVersion]] = relationship(
        back_populates="generation", cascade="all, delete-orphan"
    )
    targets: Mapped[list[GenerationTarget]] = relationship(
        back_populates="generation", cascade="all, delete-orphan"
    )


class GeneratedVersion(Base):
    __tablename__ = "generated_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    generation_id: Mapped[str] = mapped_column(
        ForeignKey("generation_jobs.id", ondelete="CASCADE"), index=True
    )
    source_document_id: Mapped[str] = mapped_column(String(36), index=True)
    download_name: Mapped[str] = mapped_column(String(255))
    storage_name: Mapped[str] = mapped_column(String(255), unique=True)

    generation: Mapped[GenerationJob] = relationship(back_populates="versions")


class GenerationTarget(Base):
    """Immutable audit detail for every confirmed element in a generation."""

    __tablename__ = "generation_targets"
    __table_args__ = (
        UniqueConstraint("generation_id", "element_id", name="uq_generation_element"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    generation_id: Mapped[str] = mapped_column(
        ForeignKey("generation_jobs.id", ondelete="CASCADE"), index=True
    )
    element_id: Mapped[str] = mapped_column(String(36), index=True)
    document_id: Mapped[str] = mapped_column(String(36), index=True)
    document_name: Mapped[str] = mapped_column(String(255))
    paragraph_index: Mapped[int] = mapped_column(Integer)
    before_text: Mapped[str] = mapped_column(Text)
    after_text: Mapped[str] = mapped_column(Text)

    generation: Mapped[GenerationJob] = relationship(back_populates="targets")
