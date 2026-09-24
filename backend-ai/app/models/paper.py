"""Paper model representing a research paper."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ProcessingStatus(str, Enum):
    """Processing status of a paper."""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


class Paper(BaseModel):
    """Research paper model."""

    paper_id: UUID = Field(default_factory=uuid4)
    title: str
    authors: str = ""
    year: str = ""
    domain: str = ""
    file_path: str = ""
    file_size: int = 0
    processing_status: ProcessingStatus = ProcessingStatus.UPLOADED
    uploaded_at: datetime = Field(default_factory=datetime.now)
    processed_at: datetime | None = None

    # Metadata
    abstract: str = ""
    total_pages: int = 0
    language: str = "en"

    class Config:
        """Pydantic configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class Chunk(BaseModel):
    """Text chunk extracted from a paper."""

    chunk_id: UUID = Field(default_factory=uuid4)
    paper_id: UUID
    content: str
    section: str = ""
    page_number: int | None = None
    chunk_index: int = 0
    start_char: int = 0
    end_char: int = 0

    # Embedding vector (would be stored separately in vector DB)
    embedding: list[float] | None = None

    class Config:
        """Pydantic configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class Analysis(BaseModel):
    """Analysis results for a paper."""

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


class Claim(BaseModel):
    """Factual claim extracted from text."""

    claim_id: UUID = Field(default_factory=uuid4)
    claim_text: str
    claim_type: str  # FINDING / COMPARISON / ADVANTAGE / DISADVANTAGE / LIMITATION / GAP / RECOMMENDATION / CONCLUSION
    involves_papers: list[str] = Field(default_factory=list)
    specificity: str = "MEDIUM"  # HIGH or MEDIUM or LOW
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        """Pydantic configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }