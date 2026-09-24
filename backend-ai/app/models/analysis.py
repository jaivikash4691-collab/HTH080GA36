"""Analysis model representing the results of paper analysis."""

from __future__ import annotations

from uuid import UUID, uuid4

from pydantic import BaseModel, Field
from datetime import datetime


class Analysis(BaseModel):
    """Analysis results for a research paper."""

    analysis_id: UUID = Field(default_factory=uuid4)
    paper_id: UUID
    objective: str = "Not reported"
    research_problem: str = "Not reported"
    key_concepts: list[str] = Field(default_factory=list)
    methodology: dict = Field(default_factory=dict)
    key_findings: list[dict] = Field(default_factory=list)
    advantages: list[dict] = Field(default_factory=list)
    disadvantages: list[dict] = Field(default_factory=list)
    limitations: list[dict] = Field(default_factory=list)
    conclusion: str = "Not reported"
    experimental_setup: str = "Not reported"
    performance_results: str = "Not reported"
    domain: str = "Not reported"
    analyzed_at: datetime = Field(default_factory=datetime.now)

    class Config:
        """Pydantic configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


# Alias for backward compatibility
PaperAnalysis = Analysis