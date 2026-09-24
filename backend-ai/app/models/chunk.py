"""Chunk model representing a text chunk from a research paper."""

from __future__ import annotations

from uuid import UUID, uuid4

from pydantic import BaseModel, Field


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
            UUID: lambda v: str(v)
        }


# Alias for backward compatibility
PaperChunk = Chunk