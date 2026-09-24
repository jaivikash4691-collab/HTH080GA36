"""Report model representing a generated research synthesis report."""

from __future__ import annotations

from uuid import UUID, uuid4

from pydantic import BaseModel, Field
from datetime import datetime


class Report(BaseModel):
    """Generated research synthesis report."""

    report_id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    title: str = ""
    executive_summary: str = ""
    overall_summary: str = ""
    paper_by_paper_summary: list[dict] = Field(default_factory=list)
    key_findings: list[dict] = Field(default_factory=list)
    common_findings: list[dict] = Field(default_factory=list)
    contradictions: list[dict] = Field(default_factory=list)
    methodology_comparison: dict = Field(default_factory=dict)
    advantages: list[dict] = Field(default_factory=list)
    disadvantages_limitations: list[dict] = Field(default_factory=list)
    improve_effectiveness: list[dict] = Field(default_factory=list)
    reduce_disadvantages: list[dict] = Field(default_factory=list)
    suitable_applications: list[dict] = Field(default_factory=list)
    research_gaps: list[dict] = Field(default_factory=list)
    future_research_directions: list[dict] = Field(default_factory=list)
    overall_summary_section_16: str = ""
    evidence_citations: list[dict] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        """Pydantic configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


# Alias for backward compatibility
SynthesisReport = Report