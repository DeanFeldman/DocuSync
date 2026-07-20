# Initial architecture

```mermaid
flowchart LR
    U[Document editor] --> W[React web client]
    W -->|multipart and JSON over HTTP| A[FastAPI backend]
    A --> V[Validation and authorisation boundary]
    V --> P[DOCX parser and edit engine]
    V --> D[(Relational database)]
    V --> S[(Private file storage)]
    P --> S
    A --> W
```

## Trust boundary

The browser never receives database credentials or storage credentials. All document access, matching, preview, generation, and download decisions pass through the backend.

## Local-development storage

- Original files: `apps/api/data/originals/{document-set-id}/`
- Generated files: `apps/api/data/generated/{document-set-id}/{generation-id}/`
- Local database: `apps/api/data/documentsync.db`

The paths are excluded from Git. Production deployment should replace local storage with private object storage and use short-lived or backend-mediated downloads.

## Relational model

```mermaid
erDiagram
    DOCUMENT_SET ||--o{ DOCUMENT : contains
    DOCUMENT ||--o{ DOCUMENT_ELEMENT : contains
    DOCUMENT_SET ||--o{ LINK_GROUP : proposes
    LINK_GROUP ||--o{ LINK_MEMBER : contains
    DOCUMENT_ELEMENT ||--o{ LINK_MEMBER : joins
    DOCUMENT_SET ||--o{ GENERATION_JOB : produces
    GENERATION_JOB ||--o{ GENERATED_VERSION : contains
```

## Controlled edit rule

A generated edit may only target `DocumentElement` rows that belong to the selected `LinkGroup`. Similarity or exact matching alone does not perform an edit; the user selects the group and confirms generation after previewing the locations.
