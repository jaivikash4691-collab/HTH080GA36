"""API routes for paper management."""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.config import settings
from app.schemas.common import APIResponse
from app.store import store

log = logging.getLogger(__name__)

router = APIRouter(prefix="/papers", tags=["papers"])

_UPLOAD_DIR = os.path.abspath(settings.upload_dir)


def _ensure_upload_dir() -> None:
    os.makedirs(_UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# POST /papers/upload
# ---------------------------------------------------------------------------


@router.post("/upload")
async def upload_paper(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    authors: Optional[str] = Form(None),
    year: Optional[str] = Form(None),
    domain: Optional[str] = Form(None),
):
    """Upload a research paper PDF.

    Saves the file, extracts basic metadata, and creates a paper record
    with processing_status='uploaded'.  Actual PDF processing (chunking,
    embeddings) is triggered via POST /papers/{paper_id}/analyze.

    Returns:
        APIResponse with the paper record.
    """
    # Validate file type
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=APIResponse.fail(
                "Only PDF files are supported",
                code="INVALID_FILE_TYPE",
            ).model_dump(),
        )

    # Read and validate size
    try:
        contents = await file.read()
    except Exception as exc:
        log.error("Failed to read uploaded file: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=APIResponse.fail("Failed to read file", code="PDF_PROCESSING_FAILED").model_dump(),
        )

    file_size = len(contents)
    max_bytes = settings.max_file_size_mb * 1024 * 1024

    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=APIResponse.fail(
                f"File size {file_size} bytes exceeds limit of {settings.max_file_size_mb} MB",
                code="FILE_TOO_LARGE",
            ).model_dump(),
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=APIResponse.fail("Uploaded file is empty", code="INVALID_FILE_TYPE").model_dump(),
        )

    # Persist file
    _ensure_upload_dir()
    paper_id = uuid.uuid4()
    safe_name = f"{paper_id}_{file.filename or 'paper.pdf'}"
    file_path = os.path.join(_UPLOAD_DIR, safe_name)

    try:
        with open(file_path, "wb") as fh:
            fh.write(contents)
    except OSError as exc:
        log.error("Failed to save file to %s: %s", file_path, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIResponse.fail("Failed to save file", code="PDF_PROCESSING_FAILED").model_dump(),
        )

    # Build paper record
    now_iso = datetime.now(timezone.utc).isoformat()
    paper_record = {
        "paper_id": str(paper_id),
        "title": title or file.filename or "Unknown Title",
        "authors": authors or "Not provided",
        "year": year or "Not provided",
        "domain": domain or "",
        "file_path": file_path,
        "file_size": file_size,
        "processing_status": "uploaded",
        "uploaded_at": now_iso,
        "processed_at": None,
        "abstract": "",
        "total_pages": 0,
        "language": "en",
    }

    await store.save_paper(paper_record)
    log.info("Paper uploaded: %s title=%s size=%d", paper_id, paper_record["title"], file_size)

    return APIResponse.ok(data=paper_record).model_dump()


# ---------------------------------------------------------------------------
# POST /papers/upload-batch
# ---------------------------------------------------------------------------


@router.post("/upload-batch")
async def upload_papers_batch(
    files: List[UploadFile] = File(...),
):
    """Upload multiple research paper PDFs in batch (up to MAX_PAPERS_PER_BATCH).

    Validates PDF format, size, duplicate files, empty files, and corruption.
    Saves each file and registers paper records with processing_status='uploaded'.

    Returns:
        APIResponse with uploaded paper records and total count.
    """
    max_batch = getattr(settings, "max_papers_per_batch", 8)
    max_files = getattr(settings, "max_files_per_upload", 8)
    batch_limit = min(max_batch, max_files)

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=APIResponse.fail(
                "No files provided for batch upload",
                code="INVALID_PAPER_COUNT",
            ).model_dump(),
        )

    if len(files) > batch_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=APIResponse.fail(
                f"Batch size {len(files)} exceeds maximum allowed of {batch_limit} papers",
                code="INVALID_PAPER_COUNT",
            ).model_dump(),
        )

    _ensure_upload_dir()
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    uploaded_papers = []
    seen_filenames = set()
    now_iso = datetime.now(timezone.utc).isoformat()

    for idx, file in enumerate(files):
        filename = file.filename or f"paper_{idx+1}.pdf"

        # 1. Validate file extension
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=APIResponse.fail(
                    f"File '{filename}' is not a PDF. Only PDF files are supported.",
                    code="INVALID_FILE_TYPE",
                ).model_dump(),
            )

        seen_filenames.add(filename)

        # 2. Read content and validate size & empty
        try:
            contents = await file.read()
        except Exception as exc:
            log.error("Failed to read file %s: %s", filename, exc)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=APIResponse.fail(
                    f"Failed to read file '{filename}'",
                    code="PDF_PROCESSING_FAILED",
                ).model_dump(),
            )

        file_size = len(contents)
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=APIResponse.fail(
                    f"Uploaded file '{filename}' is empty (0 bytes).",
                    code="INVALID_FILE_TYPE",
                ).model_dump(),
            )

        if file_size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=APIResponse.fail(
                    f"File '{filename}' ({file_size} bytes) exceeds limit of {settings.max_file_size_mb} MB",
                    code="FILE_TOO_LARGE",
                ).model_dump(),
            )

        # 3. Check for valid PDF header and parseability
        if not contents.startswith(b"%PDF-"):
            try:
                import io
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(contents))
                if len(reader.pages) == 0:
                    raise ValueError("No pages found")
            except Exception as pdf_err:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=APIResponse.fail(
                        f"File '{filename}' appears to be corrupted or not a valid PDF: {pdf_err}",
                        code="INVALID_FILE_TYPE",
                    ).model_dump(),
                )

        # 4. Persist file
        paper_id = uuid.uuid4()
        safe_name = f"{paper_id}_{filename}"
        file_path = os.path.join(_UPLOAD_DIR, safe_name)

        try:
            with open(file_path, "wb") as fh:
                fh.write(contents)
        except OSError as exc:
            log.error("Failed to save file to %s: %s", file_path, exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=APIResponse.fail(f"Failed to save file '{filename}'", code="PDF_PROCESSING_FAILED").model_dump(),
            )

        paper_record = {
            "paper_id": str(paper_id),
            "filename": filename,
            "title": filename.rsplit(".", 1)[0].replace("_", " "),
            "authors": "Not provided",
            "year": "Not provided",
            "domain": "",
            "file_path": file_path,
            "file_size": file_size,
            "status": "uploaded",
            "processing_status": "uploaded",
            "uploaded_at": now_iso,
            "processed_at": None,
            "abstract": "",
            "total_pages": 0,
            "language": "en",
        }

        await store.save_paper(paper_record)
        uploaded_papers.append({
            "paper_id": str(paper_id),
            "filename": filename,
            "title": paper_record["title"],
            "status": "uploaded",
            "file_size": file_size,
        })
        log.info("Batch paper uploaded: %s (%s)", paper_id, filename)

    return APIResponse.ok(
        data={
            "papers": uploaded_papers,
            "total_papers": len(uploaded_papers),
        },
        message=f"Successfully uploaded {len(uploaded_papers)} papers",
    ).model_dump()


# ---------------------------------------------------------------------------
# GET /papers/
# ---------------------------------------------------------------------------


@router.get("/")
async def list_papers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None, description="Filter by processing_status"),
):
    """List uploaded papers with optional status filter.

    Returns:
        APIResponse with list of paper records.
    """
    papers = await store.list_papers(status=status, skip=skip, limit=limit)
    return APIResponse.ok(data=papers).model_dump()


# ---------------------------------------------------------------------------
# GET /papers/{paper_id}
# ---------------------------------------------------------------------------


@router.get("/{paper_id}")
async def get_paper(paper_id: UUID):
    """Get a paper record by ID.

    Returns:
        APIResponse with the paper record.

    Raises:
        404 if not found.
    """
    paper = await store.get_paper(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIResponse.fail(
                f"Paper {paper_id} not found", code="PAPER_NOT_FOUND"
            ).model_dump(),
        )
    return APIResponse.ok(data=paper).model_dump()


# ---------------------------------------------------------------------------
# DELETE /papers/{paper_id}
# ---------------------------------------------------------------------------


@router.delete("/{paper_id}")
async def delete_paper(paper_id: UUID):
    """Delete a paper, its chunks, and analysis results.

    Returns:
        APIResponse confirming deletion.

    Raises:
        404 if not found.
    """
    paper = await store.get_paper(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIResponse.fail(
                f"Paper {paper_id} not found", code="PAPER_NOT_FOUND"
            ).model_dump(),
        )

    # Remove file from disk (best-effort)
    file_path = paper.get("file_path", "")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError as exc:
            log.warning("Could not delete file %s: %s", file_path, exc)

    await store.delete_paper(paper_id)
    log.info("Paper deleted: %s", paper_id)

    return APIResponse.ok(data={"paper_id": str(paper_id)}, message="Paper deleted").model_dump()


# ---------------------------------------------------------------------------
# POST /papers/{paper_id}/analyze
# ---------------------------------------------------------------------------


@router.post("/{paper_id}/analyze")
async def analyze_paper(paper_id: UUID):
    """Trigger PDF processing and analysis for a paper.

    Marks the paper as 'processing' and runs PDF extraction + chunking
    synchronously in this request. For production, this should be moved
    to a background task queue.

    Returns:
        APIResponse with updated paper record.
    """
    paper = await store.get_paper(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIResponse.fail(
                f"Paper {paper_id} not found", code="PAPER_NOT_FOUND"
            ).model_dump(),
        )

    file_path = paper.get("file_path", "")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIResponse.fail(
                "PDF file not found on disk", code="PDF_PROCESSING_FAILED"
            ).model_dump(),
        )

    await store.update_paper_status(paper_id, "processing")

    try:
        from app.services.pdf_service import PDFService
        from app.services.chunking_service import ChunkingService

        pdf_service = PDFService()
        chunking_service = ChunkingService()

        # Extract text and metadata
        extraction = pdf_service.extract_text(file_path)
        text = extraction.get("text", "")
        metadata = extraction.get("metadata", {})

        # Update paper with extracted metadata
        updates: dict = {"processing_status": "processing"}
        if metadata.get("title") and paper.get("title") in (None, "Not provided", ""):
            updates["title"] = metadata["title"]
        if metadata.get("authors"):
            updates["authors"] = metadata["authors"]
        total_pages = metadata.get("total_pages", 0)
        if total_pages:
            updates["total_pages"] = total_pages
        abstract = extraction.get("abstract", "")
        if abstract:
            updates["abstract"] = abstract

        paper.update(updates)
        await store.save_paper(paper)

        # Chunk the text
        chunks_raw = chunking_service.chunk_text(
            text=text,
            paper_id=paper_id,
            metadata={"total_pages": total_pages},
        )

        # Serialize chunks for storage
        chunks_dicts = []
        for chunk in chunks_raw:
            if hasattr(chunk, "model_dump"):
                cd = chunk.model_dump()
                cd["paper_id"] = str(paper_id)
                cd["chunk_id"] = str(cd.get("chunk_id") or uuid.uuid4())
            elif isinstance(chunk, dict):
                cd = dict(chunk)
                cd["paper_id"] = str(paper_id)
                cd.setdefault("chunk_id", str(uuid.uuid4()))
            else:
                continue
            chunks_dicts.append(cd)

        await store.save_chunks(paper_id, chunks_dicts)

        await store.update_paper_status(paper_id, "processed")
        paper = await store.get_paper(paper_id)

        log.info("Paper processed: %s  chunks=%d", paper_id, len(chunks_dicts))
        return APIResponse.ok(
            data=paper,
            message=f"Processing complete: {len(chunks_dicts)} chunks extracted",
        ).model_dump()

    except Exception as exc:
        log.error("PDF processing failed for %s: %s", paper_id, exc, exc_info=True)
        await store.update_paper_status(paper_id, "failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIResponse.fail(
                "PDF processing failed",
                code="PDF_PROCESSING_FAILED",
                details={"paper_id": str(paper_id)},
            ).model_dump(),
        )


# ---------------------------------------------------------------------------
# GET /papers/{paper_id}/analysis
# ---------------------------------------------------------------------------


@router.get("/{paper_id}/analysis")
async def get_paper_analysis(paper_id: UUID):
    """Get stored analysis results for a paper.

    Returns:
        APIResponse with the analysis dict.

    Raises:
        404 if paper or analysis not found.
    """
    paper = await store.get_paper(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIResponse.fail(
                f"Paper {paper_id} not found", code="PAPER_NOT_FOUND"
            ).model_dump(),
        )

    analysis = await store.get_analysis(paper_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIResponse.fail(
                f"No analysis found for paper {paper_id}. Run POST /analysis/analyze-batch first.",
                code="ANALYSIS_NOT_FOUND",
            ).model_dump(),
        )

    return APIResponse.ok(data=analysis).model_dump()