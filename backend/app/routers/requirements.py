"""Regulatory requirements endpoints."""

import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_writer
from app.db import get_db
from app.models.document import Document, DocumentVersion
from app.models.extraction_job import ExtractionJob
from app.models.requirement import RegulatoryRequirement
from app.models.user import User
from app.schemas.extraction_job import (
    CreateExtractionJobsResponse,
    ExtractionJobRead,
    ProcessJobResponse,
)
from app.schemas.requirement import (
    ExtractRequirementsRequest,
    RegulatoryRequirementRead,
    RequirementsListResponse,
)
from app.services.requirement_extraction import RequirementExtractionService
from app.utils.ulid_utils import generate_ulid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/requirements", tags=["requirements"])


@router.get("", response_model=RequirementsListResponse)
def list_all_requirements(
    domain: str | None = Query(None, description="Filter by domain (e.g., AML/CFT, KYC)"),
    risk_level: str | None = Query(None, description="Filter by risk level (LOW, MEDIUM, HIGH)"),
    language: str | None = Query(None, description="Filter by language (EN, FR)"),
    status: str | None = Query(None, description="Filter by status (ACTIVE, SUPERSEDED)"),
    limit: int = Query(50, ge=1, le=200, description="Max results per page"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RequirementsListResponse:
    """
    Get all regulatory requirements with optional filtering.

    **Query Parameters:**
    - `domain` (optional): Filter by domain (e.g., AML/CFT, KYC, DATA_PROTECTION)
    - `risk_level` (optional): Filter by risk level (LOW, MEDIUM, HIGH)
    - `language` (optional): Filter by language (EN, FR)
    - `status` (optional): Filter by status (ACTIVE, SUPERSEDED)
    - `limit`: Max results to return (default 50, max 200)
    - `offset`: Number of results to skip for pagination (default 0)

    **Example URLs:**
    - `/api/requirements`
    - `/api/requirements?risk_level=HIGH&limit=100`
    - `/api/requirements?domain=AML/CFT&language=FR`
    - `/api/requirements?status=ACTIVE&limit=50`
    """
    query = db.query(RegulatoryRequirement)

    if domain:
        query = query.filter(RegulatoryRequirement.domain == domain)
    if risk_level:
        query = query.filter(RegulatoryRequirement.risk_level == risk_level)
    if language:
        query = query.filter(RegulatoryRequirement.language == language)
    if status:
        query = query.filter(RegulatoryRequirement.status == status)

    total = query.count()
    items = (
        query.order_by(RegulatoryRequirement.created_at, RegulatoryRequirement.requirement_id)
        .offset(offset)
        .limit(limit)
        .all()
    )

    return RequirementsListResponse(
        total=total,
        items=[RegulatoryRequirementRead.model_validate(req) for req in items],
        limit=limit,
        offset=offset,
        document_ids_queried=[],
    )


@router.get("/by-documents", response_model=RequirementsListResponse)
def list_requirements_by_documents(
    document_ids: list[str] = Query(..., description="List of source document IDs to filter by"),
    domain: str | None = Query(None, description="Filter by domain (e.g., AML/CFT, KYC)"),
    risk_level: str | None = Query(None, description="Filter by risk level (LOW, MEDIUM, HIGH)"),
    language: str | None = Query(None, description="Filter by language (EN, FR)"),
    status: str | None = Query(None, description="Filter by status (ACTIVE, SUPERSEDED)"),
    limit: int = Query(50, ge=1, le=200, description="Max results per page"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RequirementsListResponse:
    """
    Get regulatory requirements linked to a list of source document IDs.

    **Query Parameters:**
    - `document_ids` (required, list): List of source document IDs to filter by
      Example: `?document_ids=EXT-EU-AML-001&document_ids=EXT-EBA-KYC-002`
    - `domain` (optional): Filter by domain (e.g., AML/CFT, KYC, DATA_PROTECTION)
    - `risk_level` (optional): Filter by risk level (LOW, MEDIUM, HIGH)
    - `language` (optional): Filter by language (EN, FR)
    - `status` (optional): Filter by status (ACTIVE, SUPERSEDED)
    - `limit`: Max results to return (default 50, max 200)
    - `offset`: Number of results to skip for pagination (default 0)

    **Example URLs:**
    - `/api/requirements/by-documents?document_ids=EXT-EU-AML-001&document_ids=EXT-EBA-KYC-002`
    - `/api/requirements/by-documents?document_ids=EXT-EU-AML-001&risk_level=HIGH&limit=100`
    - `/api/requirements/by-documents?document_ids=EXT-ACPR-LCBFT-003&language=FR`
    """
    if not document_ids or len(document_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one document_id is required")

    query = db.query(RegulatoryRequirement).filter(
        RegulatoryRequirement.source_document_id.in_(document_ids)
    )

    if domain:
        query = query.filter(RegulatoryRequirement.domain == domain)
    if risk_level:
        query = query.filter(RegulatoryRequirement.risk_level == risk_level)
    if language:
        query = query.filter(RegulatoryRequirement.language == language)
    if status:
        query = query.filter(RegulatoryRequirement.status == status)

    total = query.count()
    items = (
        query.order_by(RegulatoryRequirement.created_at, RegulatoryRequirement.requirement_id)
        .offset(offset)
        .limit(limit)
        .all()
    )

    return RequirementsListResponse(
        total=total,
        items=[RegulatoryRequirementRead.model_validate(req) for req in items],
        limit=limit,
        offset=offset,
        document_ids_queried=document_ids,
    )


@router.get("/{requirement_id}", response_model=RegulatoryRequirementRead)
def get_requirement(
    requirement_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RegulatoryRequirementRead:
    """Get a single regulatory requirement by ID."""
    req = db.get(RegulatoryRequirement, requirement_id)
    if req is None:
        raise HTTPException(status_code=404, detail="Requirement not found")

    return RegulatoryRequirementRead.model_validate(req)


@router.post("/extract", response_model=CreateExtractionJobsResponse, status_code=201)
def extract_requirements(
    payload: ExtractRequirementsRequest,
    current_user: User = Depends(require_writer),
    db: Session = Depends(get_db),
) -> CreateExtractionJobsResponse:
    """
    Create extraction jobs for all chunks of a document (async workflow).

    This endpoint takes a document_id and creates one extraction job per chunk.
    Jobs start in PENDING status. Use POST /api/jobs/{job_id}/process to process
    each job and extract requirements from that chunk.

    **Request Body:**
    - `document_id` (required): ID of document to extract requirements from

    **Response:** CreateExtractionJobsResponse with list of created job IDs

    **Notes:**
    - Jobs are created but NOT processed immediately
    - Idempotent: if jobs already exist for the document's active version, no new job is
      created; the response lists the jobs still to process (PENDING, or FAILED with
      nothing extracted) with `total_jobs_created = 0`
    - Caller must poll POST /api/jobs/{job_id}/process to process each job
    - Each job extracts requirements from one document chunk
    """
    try:
        # Validate document exists
        doc = db.query(Document).filter(Document.document_id == payload.document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        # Get latest ACTIVE version
        active_version = (
            db.query(DocumentVersion)
            .filter(
                DocumentVersion.document_id == payload.document_id,
                DocumentVersion.status == "ACTIVE",
            )
            .order_by(DocumentVersion.version_timestamp.desc())
            .first()
        )

        if not active_version:
            raise HTTPException(status_code=404, detail="No active version found for document")

        # Jobs already exist for this version: hand back the ones still to process instead
        # of creating a second series (every chunk would be extracted twice).
        existing_jobs = (
            db.query(ExtractionJob)
            .filter(
                ExtractionJob.document_id == payload.document_id,
                ExtractionJob.document_version_id == active_version.version_id,
            )
            .order_by(ExtractionJob.chunk_no.asc())
            .all()
        )
        if existing_jobs:
            remaining = [
                job
                for job in existing_jobs
                if job.status == "PENDING"
                or (job.status == "FAILED" and job.extracted_requirement_ids is None)
            ]
            return CreateExtractionJobsResponse(
                document_id=payload.document_id,
                document_version_id=active_version.version_id,
                total_jobs_created=0,
                jobs=[ExtractionJobRead.model_validate(job) for job in remaining],
            )

        # Load chunks to determine how many jobs to create
        from app.models.document import DocumentChunk
        chunks = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.version_id == active_version.version_id)
            .order_by(DocumentChunk.chunk_no.asc())
            .all()
        )

        if not chunks:
            raise HTTPException(status_code=400, detail="Document has no chunks")

        # Create one job per chunk
        created_jobs = []
        for chunk in chunks:
            job = ExtractionJob(
                document_id=payload.document_id,
                document_version_id=active_version.version_id,
                chunk_no=chunk.chunk_no,
                status="PENDING",
            )
            db.add(job)
            created_jobs.append(job)

        db.commit()

        # Refresh to get job_ids
        for job in created_jobs:
            db.refresh(job)

        logger.info(f"✅ Created {len(created_jobs)} extraction jobs for document {payload.document_id}")

        return CreateExtractionJobsResponse(
            document_id=payload.document_id,
            document_version_id=active_version.version_id,
            total_jobs_created=len(created_jobs),
            jobs=[ExtractionJobRead.model_validate(job) for job in created_jobs],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create extraction jobs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create extraction jobs: {str(e)}")


@router.post("/jobs/{job_id}/process", response_model=ProcessJobResponse, status_code=200)
def process_extraction_job(
    job_id: UUID,
    current_user: User = Depends(require_writer),
    db: Session = Depends(get_db),
) -> ProcessJobResponse:
    """
    Process a single extraction job: extract requirements from a chunk and persist them.

    This endpoint:
    1. Loads the specified job
    2. Extracts requirements from the chunk via LLM
    3. Persists requirements to RegulatoryRequirement table
    4. Updates job status to COMPLETED (with requirement_ids) or FAILED (with error)

    **Path Parameters:**
    - `job_id` (required, UUID): The ID of the extraction job to process

    **Response:** ProcessJobResponse with job status and extracted requirement IDs

    **Notes:**
    - Job must exist and be in PENDING status
    - Requires OpenRouter API key in OPENROUTER_API_KEY env var
    - On success, job status → COMPLETED with extracted_requirement_ids
    - On failure, job status → FAILED with error_message
    """
    try:
        # Load job with row lock to prevent concurrent processing
        job = db.query(ExtractionJob).filter(ExtractionJob.job_id == job_id).with_for_update().first()
        if not job:
            raise HTTPException(status_code=404, detail="Extraction job not found")

        # Allow processing if PENDING, or if FAILED with no extracted requirements (never successfully extracted)
        if job.status == "PENDING":
            pass  # OK to process
        elif job.status == "FAILED" and job.extracted_requirement_ids is None:
            pass  # OK to retry — never extracted anything
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot process job: status={job.status}, has_requirements={job.extracted_requirement_ids is not None}. "
                       "Only PENDING jobs or FAILED jobs with no extracted requirements can be processed.",
            )

        # Load document chunk
        from app.models.document import DocumentChunk
        chunk = (
            db.query(DocumentChunk)
            .filter(
                DocumentChunk.version_id == job.document_version_id,
                DocumentChunk.chunk_no == job.chunk_no,
            )
            .first()
        )

        if not chunk:
            raise HTTPException(status_code=404, detail="Document chunk not found")

        # Extract requirements from this chunk (NO lock yet - LLM calls can run in parallel)
        logger.info(f"📞 Processing job {job_id}: extracting from chunk {job.chunk_no}...")
        chunk_no, requirements, error_msg = RequirementExtractionService._extract_from_chunk(chunk)

        if error_msg:
            # Mark job as FAILED (clear extracted_requirement_ids to allow retry)
            job.status = "FAILED"
            job.error_message = error_msg
            job.extracted_requirement_ids = None  # Allow retry since no requirements were extracted
            db.commit()
            logger.error(f"❌ Job {job_id} failed: {error_msg}")

            return ProcessJobResponse(
                job_id=job_id,
                status="FAILED",
                extracted_requirement_ids=[],
                error_message=error_msg,
            )

        # Lock document for persistence (only during INSERT, not during LLM call)
        # Serialize INSERT per document to prevent index contention
        logger.info("   Acquiring document lock for persistence...")
        doc = (
            db.query(Document)
            .with_for_update()  # Exclusive lock: serializes by document
            .filter(Document.document_id == job.document_id)
            .first()
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        # Persist requirements to database
        created_req_ids = []
        for idx, req_input in enumerate(requirements):
            req_id = generate_ulid()
            requirement = RegulatoryRequirement(
                requirement_id=req_id,
                source_document_id=job.document_id,
                title=req_input.title,
                title_lang_fr=req_input.title_lang_fr,
                domain=doc.domain,
                language=doc.language,
                requirement_text=req_input.requirement_text,
                requirement_text_lang_fr=req_input.requirement_text_lang_fr,
                risk_level=req_input.risk_level,
                source_reference=f"{chunk.chunk_no}",
                evidence=req_input.evidence,
                status="ACTIVE",
            )
            db.add(requirement)
            created_req_ids.append(req_id)

        # One commit for the requirements and the job status. Committing the requirements
        # first released the job's row lock while it was still PENDING: a concurrent call
        # waiting on that lock then extracted the same chunk a second time.
        job.status = "COMPLETED"
        job.extracted_requirement_ids = json.dumps(created_req_ids)
        db.commit()

        logger.info(f"✅ Job {job_id} completed: extracted {len(created_req_ids)} requirements")

        return ProcessJobResponse(
            job_id=job_id,
            status="COMPLETED",
            extracted_requirement_ids=created_req_ids,
            chunks_processed=1,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process extraction job {job_id}: {str(e)}", exc_info=True)
        # Try to mark job as FAILED
        try:
            db.rollback()  # the failed transaction must be closed before writing again
            job = db.query(ExtractionJob).filter(ExtractionJob.job_id == job_id).first()
            if job:
                job.status = "FAILED"
                job.error_message = str(e)
                db.commit()
        except Exception as inner_e:
            logger.error(f"Failed to update job status: {str(inner_e)}")

        raise HTTPException(status_code=500, detail=f"Failed to process extraction job: {str(e)}")
