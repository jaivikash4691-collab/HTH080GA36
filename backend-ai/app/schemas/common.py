"""Common Pydantic models used across all API contracts."""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Global API Response Envelope
# ---------------------------------------------------------------------------


class ErrorDetail(BaseModel):
    """Structured error details returned in failure responses."""

    code: str = Field(..., description="Machine-readable error code, e.g. PAPER_NOT_FOUND")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional error context")


class APIResponse(BaseModel):
    """Standard API response envelope for all new endpoints.

    Success:  success=True,  data=<payload>, message=None
    Failure:  success=False, data=None,      message=<human text>, error=<ErrorDetail>
    """

    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None
    error: Optional[ErrorDetail] = None
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    @classmethod
    def ok(cls, data: Any, message: Optional[str] = None) -> "APIResponse":
        """Create a successful response."""
        return cls(success=True, data=data, message=message)

    @classmethod
    def fail(
        cls,
        message: str,
        code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ) -> "APIResponse":
        """Create an error response."""
        return cls(
            success=False,
            data=None,
            message=message,
            error=ErrorDetail(code=code, details=details or {}),
        )


# ---------------------------------------------------------------------------
# Reusable Sub-models
# ---------------------------------------------------------------------------


class EvidenceReference(BaseModel):
    """Traceable reference back to a source chunk in a paper."""

    paper_id: UUID
    chunk_id: Optional[UUID] = None
    page_number: Optional[int] = None
    section: Optional[str] = None
    quote: Optional[str] = None
    relevance_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class ClaimSchema(BaseModel):
    """A factual claim extracted from analysis output."""

    claim_id: str
    text: str
    claim_type: str = Field(
        ...,
        description="finding | methodology | limitation | interpretation | recommendation",
    )
    evidence: List[EvidenceReference] = Field(default_factory=list)
    confidence: float = Field(..., ge=0.0, le=1.0)
    verified: bool = False


class PaperReference(BaseModel):
    """Lightweight reference to a paper (used inside other response models)."""

    paper_id: UUID
    title: str
    authors: List[str] = Field(default_factory=list)
    year: Optional[Any] = None
    domain: Optional[str] = None
