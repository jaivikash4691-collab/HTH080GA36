"""Service for splitting text into chunks for processing."""

from __future__ import annotations

import re
from typing import List, Dict, Any, Optional
from uuid import UUID

from app.models.paper import Chunk
from app.config import settings

logger = logging.getLogger(__name__)


class ChunkingService:
    """Service for splitting text into chunks for processing."""

    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 50):
        """
        Initialize the chunking service.

        Args:
            chunk_size: Target size of each chunk in tokens (approx characters)
            chunk_overlap: Overlap between chunks in tokens (approx characters)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    async def chunk_text(
        self,
        text: str,
        paper_id: UUID,
        source_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Chunk]:
        """
        Split text into overlapping chunks.

        Args:
            text: The text to chunk
            paper_id: The ID of the paper this text belongs to
            source_metadata: Optional metadata about the source

        Returns:
            List of Chunk objects
        """
        if not text.strip():
            return []

        # Clean the text
        text = self._clean_text(text)

        # Split into sentences first for better chunking
        sentences = self._split_into_sentences(text)

        # Create chunks from sentences
        chunks = self._create_chunks_from_sentences(sentences, paper_id, source_metadata)

        logger.info(f"Created {len(chunks)} chunks for paper {paper_id}")
        return chunks

    def _clean_text(self, text: str) -> str:
        """Clean text for chunking."""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters that might interfere
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]', '', text)
        return text.strip()

    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        # Simple sentence splitting - in production, use nltk or spaCy
        sentence_endings = r'[.!?]+'
        sentences = re.split(sentence_endings, text)
        # Clean up sentences
        sentences = [s.strip() for s in sentences if s.strip()]
        return sentences

    def _create_chunks_from_sentences(
        self,
        sentences: List[str],
        paper_id: UUID,
        source_metadata: Optional[Dict[str, Any]]
    ) -> List[Chunk]:
        """Create overlapping chunks from sentences."""
        chunks = []
        current_chunk = []
        current_length = 0
        sentence_index = 0

        while sentence_index < len(sentences):
            sentence = sentences[sentence_index]
            sentence_len = len(sentence)

            # If adding this sentence would exceed chunk size and we have content
            if current_length + sentence_len > self.chunk_size and current_chunk:
                # Create chunk from current sentences
                chunk_text = ' '.join(current_chunk)
                chunk = self._create_chunk(
                    chunk_text,
                    paper_id,
                    len(chunks),  # chunk_index
                    source_metadata
                )
                chunks.append(chunk)

                # Start new chunk with overlap
                overlap_sentences = []
                overlap_length = 0
                # Go backwards to find overlap
                for i in range(len(current_chunk) - 1, -1, -1):
                    sent = current_chunk[i]
                    sent_len = len(sent)
                    if overlap_length + sent_len > self.chunk_overlap:
                        break
                    overlap_sentences.insert(0, sent)
                    overlap_length += sent_len + 1  # +1 for space

                current_chunk = overlap_sentences
                current_length = overlap_length
            else:
                current_chunk.append(sentence)
                current_length += sentence_len + 1  # +1 for space

            sentence_index += 1

        # Don't forget the last chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunk = self._create_chunk(
                chunk_text,
                paper_id,
                len(chunks),  # chunk_index
                source_metadata
            )
            chunks.append(chunk)

        return chunks

    def _create_chunk(
        self,
        text: str,
        paper_id: UUID,
        chunk_index: int,
        source_metadata: Optional[Dict[str, Any]]
    ) -> Chunk:
        """Create a single Chunk object."""
        # Estimate page number (simplified - in real implementation would come from PDF)
        estimated_page = max(1, (chunk_index * self.chunk_size) // 1000 + 1)

        # Determine section (simplified - would come from PDF structure analysis)
        section = "Not reported"

        chunk = Chunk(
            paper_id=paper_id,
            content=text,
            section=section,
            page_number=estimated_page,
            chunk_index=chunk_index,
            start_char=chunk_index * self.chunk_size,  # Approximate
            end_char=(chunk_index + 1) * self.chunk_size  # Approximate
        )

        return chunk

    async def chunk_by_pages(
        self,
        pages_text: List[Dict[str, Any]],
        paper_id: UUID
    ) -> List[Chunk]:
        """
        Chunk text by pages (preserving page boundaries).

        Args:
            pages_text: List of page dictionaries with text and page_number
            paper_id: The ID of the paper

        Returns:
            List of Chunk objects
        """
        chunks = []
        global_chunk_index = 0

        for page_info in pages_text:
            page_num = page_info.get("page_number", 1)
            page_text = page_info.get("text", "")

            if not page_text.strip():
                continue

            # Chunk the page text
            page_chunks = await self.chunk_text(page_text, paper_id)

            # Update page numbers and indices
            for chunk in page_chunks:
                chunk.page_number = page_num
                chunk.chunk_index = global_chunk_index
                global_chunk_index += 1

            chunks.extend(page_chunks)

        return chunks

    async def chunk_by_sections(
        self,
        sections: List[Dict[str, Any]],
        paper_id: UUID
    ) -> List[Chunk]:
        """
        Chunk text by sections (preserving section boundaries).

        Args:
            sections: List of section dictionaries with text and section name
            paper_id: The ID of the paper

        Returns:
            List of Chunk objects
        """
        chunks = []
        global_chunk_index = 0

        for section_info in sections:
            section_name = section_info.get("section", "Not reported")
            section_text = section_info.get("text", "")

            if not section_text.strip():
                continue

            # Chunk the section text
            section_chunks = await self.chunk_text(section_text, paper_id)

            # Update section names and indices
            for chunk in section_chunks:
                chunk.section = section_name
                chunk.chunk_index = global_chunk_index
                global_chunk_index += 1

            chunks.extend(section_chunks)

        return chunks