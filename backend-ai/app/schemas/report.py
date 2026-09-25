"""Pydantic schemas for /reports/* endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Generate Report
# ---------------------------------------------------------------------------


class GenerateReportOptions(BaseModel):
    """Options controlling what sections are included in the final report."""

    include_individual_analysis: bool = True
    include_cross_document_analysis: bool = True
    include_evidence: bool = True
    include_verification: bool = True
    include_recommendations: bool = True


class GenerateReportRequest(BaseModel):
    """Request body for POST /reports/generate."""

    paper_ids: List[UUID] = Field(..., min_length=1, max_length=8)
    session_id: Optional[UUID] = None
    options: GenerateReportOptions = Field(default_factory=GenerateReportOptions)


class GenerateReportResponse(BaseModel):
    """Immediate response from POST /reports/generate (async generation)."""

    report_id: UUID
    session_id: Optional[UUID] = None
    status: str = Field(..., description="queued | processing | completed | partial | failed")
    title: str = "Research Synthesis Report"
    created_at: str  # ISO-8601
    papers_analyzed: int


# ---------------------------------------------------------------------------
# Full Report Data Model (stored/returned from GET /reports/{id})
# ---------------------------------------------------------------------------


class VerificationStatus(BaseModel):
    """Verification metadata embedded in the final report."""

    status: str = Field(..., description="not_run | passed | partial | failed")
    verified_claims: int = 0
    unverified_claims: int = 0
    citation_accuracy: Optional[float] = None


class FinalReport(BaseModel):
    """Complete research synthesis report with all sections."""

    report_id: UUID
    title: str
    executive_summary: str
    documents_analyzed: List[Any] = Field(default_factory=list)
    individual_analyses: List[Any] = Field(default_factory=list)
    cross_document_synthesis: Dict[str, Any] = Field(
        default_factory=lambda: {
            "common_findings": [],
            "agreements": [],
            "differences": [],
            "contradictions": [],
            "complementary_findings": [],
        }
    )
    methodology_comparison: List[Any] = Field(default_factory=list)
    strength_analysis: List[Any] = Field(default_factory=list)
    weakness_analysis: List[Any] = Field(default_factory=list)
    research_gaps: List[Any] = Field(default_factory=list)
    improvement_analysis: List[Any] = Field(default_factory=list)
    recommendations: List[Any] = Field(default_factory=list)
    overall_summary: str
    evidence_traceability: List[Any] = Field(default_factory=list)
    verification: VerificationStatus = Field(
        default_factory=lambda: VerificationStatus(status="not_run")
    )
    created_at: Optional[str] = None  # ISO-8601
    session_id: Optional[UUID] = None
    status: str = Field(default="completed", description="completed | partial | failed")


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------


class VerificationResponse(BaseModel):
    """Response from POST /reports/{report_id}/verify."""

    report_id: UUID
    verification_status: str = Field(..., description="passed | partial | failed")
    claims_checked: int = 0
    claims_verified: int = 0
    claims_unverified: int = 0
    unsupported_claims: List[Any] = Field(default_factory=list)
    citation_issues: List[Any] = Field(default_factory=list)
    contradiction_issues: List[Any] = Field(default_factory=list)
    overall_score: Optional[float] = None
