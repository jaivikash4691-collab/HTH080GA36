"""Claim model representing a factual claim extracted from text."""

from __future__ import annotations

from uuid import UUID, uuid4

from pydantic import BaseModel, Field
from datetime import datetime


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


# Alias for backward compatibility
ClaimModel = Claim