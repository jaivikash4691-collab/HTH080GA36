"""Pydantic schemas for cross-document analysis endpoints."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from .common import EvidenceReference


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



# ---------------------------------------------------------------------------
# Common Findings
# ---------------------------------------------------------------------------


class CommonFindingSchema(BaseModel):
    """A finding that appears in multiple papers."""

    finding_id: str
    statement: str
    supporting_papers: List[Any] = Field(default_factory=list)
    evidence: List[EvidenceReference] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class CommonFindingsResponse(BaseModel):
    """Response for POST /analysis/common-findings."""

    findings: List[CommonFindingSchema] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Contradictions
# ---------------------------------------------------------------------------


class ContradictionSchema(BaseModel):
    """A contradiction or significant disagreement between two papers."""

    contradiction_id: str
    topic: str
    paper_a: Dict[str, Any] = Field(default_factory=dict)
    paper_b: Dict[str, Any] = Field(default_factory=dict)
    claim_a: str
    claim_b: str
    evidence_a: List[EvidenceReference] = Field(default_factory=list)
    evidence_b: List[EvidenceReference] = Field(default_factory=list)
    methodological_difference: Optional[str] = None
    possible_explanation: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ContradictionsResponse(BaseModel):
    """Response for POST /analysis/contradictions."""

    contradictions: List[ContradictionSchema] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Methodology Comparison
# ---------------------------------------------------------------------------


class MethodologyComparisonAspect(BaseModel):
    """One aspect of methodology comparison across papers."""

    aspect: str = Field(
        ...,
        description="research_design | dataset | method | evaluation | metrics | assumptions",
    )
    papers: List[Any] = Field(default_factory=list)
    comparison: str
    similarities: List[str] = Field(default_factory=list)
    differences: List[str] = Field(default_factory=list)
    evidence: List[EvidenceReference] = Field(default_factory=list)


class MethodologyComparisonResponse(BaseModel):
    """Response for POST /analysis/methodology-comparison."""

    comparisons: List[MethodologyComparisonAspect] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Research Gaps
# ---------------------------------------------------------------------------


class ResearchGapSchema(BaseModel):
    """A gap in the research landscape identified across papers."""

    gap_id: str
    description: str
    supporting_papers: List[Any] = Field(default_factory=list)
    evidence: List[EvidenceReference] = Field(default_factory=list)
    why_gap_exists: str
    potential_direction: str
    expected_value: str
    limitations: List[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ResearchGapsResponse(BaseModel):
    """Response for POST /analysis/research-gaps."""

    gaps: List[ResearchGapSchema] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Improvement Analysis
# ---------------------------------------------------------------------------


class ImprovementSchema(BaseModel):
    """A concrete improvement recommendation derived from paper weaknesses."""

    problem: str
    affected_papers: List[Any] = Field(default_factory=list)
    evidence: List[EvidenceReference] = Field(default_factory=list)
    why_it_matters: str
    recommended_solution: str
    expected_improvement: str
    priority: str = Field(..., description="low | medium | high")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ImprovementAnalysisResponse(BaseModel):
    """Response for POST /analysis/improvement-analysis."""

    improvements: List[ImprovementSchema] = Field(default_factory=list)
