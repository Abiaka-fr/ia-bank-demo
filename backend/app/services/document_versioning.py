"""New document versions — shared by `POST /api/documents/{id}/update` and mapping approval."""

import hashlib
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk, DocumentVersion
from app.schemas.document import DocumentChunkInput
from app.schemas.mapping import SuggestedModification


def create_document_version(
    db: Session,
    doc: Document,
    chunks: list[DocumentChunkInput],
    created_by: str,
    change_reason: str,
    file_path: str | None = None,
) -> tuple[DocumentVersion, list[DocumentChunk]]:
    """Add a new ACTIVE version (previous ones become SUPERSEDED) and point the document at it.

    The caller commits.
    """
    chunk_content = "\n\n".join(c.content for c in chunks)
    sha256_hash = hashlib.sha256(chunk_content.encode("utf-8")).hexdigest()

    try:
        major = int(str(doc.current_version or "0.0").split(".")[0])
    except ValueError:
        major = 1
    new_version_no = f"{major + 1}.0"
    # Same id convention as ingestion ("2.0" → "02"); the frontend rebuilds version ids this way.
    version_num_padded = str(major + 1).zfill(2)
    new_version_id = f"VER-{doc.document_id}-{version_num_padded}"

    for old_ver in (
        db.query(DocumentVersion)
        .filter(DocumentVersion.document_id == doc.document_id, DocumentVersion.status == "ACTIVE")
        .all()
    ):
        old_ver.status = "SUPERSEDED"

    new_version = DocumentVersion(
        version_id=new_version_id,
        document_id=doc.document_id,
        version_no=new_version_no,
        version_timestamp=datetime.utcnow(),
        status="ACTIVE",
        file_path=file_path,
        sha256=sha256_hash,
        created_by=created_by,
        change_reason=change_reason,
    )
    db.add(new_version)
    db.flush()

    new_chunks = []
    for chunk in chunks:
        new_chunk = DocumentChunk(
            chunk_id=f"CHK-{doc.document_id}-{version_num_padded}-{str(chunk.chunk_no).zfill(3)}",
            document_id=doc.document_id,
            version_id=new_version_id,
            chunk_no=chunk.chunk_no,
            section_title=chunk.section_title,
            content=chunk.content,
            language=chunk.language,
            domain=chunk.domain,
        )
        db.add(new_chunk)
        new_chunks.append(new_chunk)

    doc.current_version = new_version_no
    if file_path:
        doc.current_file_path = file_path

    return new_version, new_chunks


def apply_modifications(
    contents: dict[int, str], modifications: list[SuggestedModification]
) -> dict[int, str]:
    """Replace each modification's `original_text` by its `new_text` in the right chunk.

    Offsets come from the version that was analysed. If the text moved since (e.g. another
    finding on the same procedure was accepted first), fall back to the first occurrence.
    Raises ValueError when the original text is no longer in the chunk.
    """
    result = dict(contents)
    # Right to left within a chunk so the offsets still to apply stay valid.
    ordered = sorted(
        modifications,
        key=lambda m: (m.location.chunk_no, m.location.start_offset),
        reverse=True,
    )
    for mod in ordered:
        chunk_no = mod.location.chunk_no
        text = result.get(chunk_no)
        if text is None:
            raise ValueError(f"Chunk {chunk_no} not found in the current procedure version")
        start, end = mod.location.start_offset, mod.location.end_offset
        if text[start:end] != mod.original_text:
            # ponytail: first occurrence only; ambiguous if the same sentence appears twice.
            start = text.find(mod.original_text)
            if start == -1:
                raise ValueError(
                    f"Original text no longer found in chunk {chunk_no}: {mod.original_text[:80]!r}"
                )
            end = start + len(mod.original_text)
        result[chunk_no] = text[:start] + mod.new_text + text[end:]
    return result
