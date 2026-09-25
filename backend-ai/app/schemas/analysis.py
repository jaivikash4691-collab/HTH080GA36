"""Pydantic schemas for the /analysis/* endpoints."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from .common import EvidenceReference, ClaimSchema


# ---------------------------------------------------------------------------
# Batch Analysis
# ---------------------------------------------------------------------------


class BatchAnalysisOptions(BaseModel):
    """Options controlling the batch analysis run."""

    parallel: bool = True
    include_evidence: bool = True
    include_claims: bool = True
    verify_claims: bool = True


class BatchAnalysisRequest(BaseModel):
    """Request body for POST /analysis/analyze-batch."""

    paper_ids: List[UUID] = Field(..., min_length=1, max_length=8)
    options: BatchAnalysisOptions = Field(default_factory=BatchAnalysisOptions)

    @field_validator("paper_ids")
    @classmethod
    def no_duplicates(cls, v: List[UUID]) -> List[UUID]:
        """Reject or deduplicate duplicate paper IDs."""
        seen: set[UUID] = set()
        deduped: List[UUID] = []
        for pid in v:
            if pid not in seen:
                seen.add(pid)
                deduped.append(pid)
        return deduped


class AnalysisError(BaseModel):
    """Error entry for a single paper inside a batch response."""

    paper_id: Optional[UUID] = None
    code: str
    message: str


class PaperAnalysisSchema(BaseModel):
    """Full analysis of a single research paper — canonical contract."""

    paper_id: UUID
    title: str
    objective: str = "not_available"
    research_question: Optional[str] = None
    domain: Optional[str] = None
    methodology: str = "not_available"
    dataset: Optional[str] = None
    experiments: List[Any] = Field(default_factory=list)
    findings: List[Any] = Field(default_factory=list)
    quantitative_results: List[Any] = Field(default_factory=list)
    strengths: List[Any] = Field(default_factory=list)
    weaknesses: List[Any] = Field(default_factory=list)
    limitations: List[Any] = Field(default_factory=list)
    claims: List[ClaimSchema] = Field(default_factory=list)
    evidence: List[EvidenceReference] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    analysis_status: str = Field(
        default="completed",
        description="completed | partial | failed",
    )


class BatchAnalysisResponse(BaseModel):
    """Response payload for POST /analysis/analyze-batch."""

    session_id: UUID
    status: str = Field(
        ..., description="queued | processing | completed | partial | failed"
    )
    papers_requested: int
    papers_completed: int
    papers_failed: int
    analyses: List[PaperAnalysisSchema] = Field(default_factory=list)
    errors: List[AnalysisError] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Cross-document request (shared by all cross-doc endpoints)
# ---------------------------------------------------------------------------


class CrossDocRequest(BaseModel):
    """Common request body for cross-document analysis endpoints."""

    paper_ids: List[UUID] = Field(..., min_length=1, max_length=8)
    session_id: Optional[UUID] = None

    @field_validator("paper_ids")
    @classmethod
    def no_duplicates(cls, v: List[UUID]) -> List[UUID]:
        return list(dict.fromkeys(v))
