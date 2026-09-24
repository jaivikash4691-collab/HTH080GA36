"""Service for retrieving relevant chunks based on queries."""

from __future__ import annotations

from typing import List, Dict, Any, Optional
from uuid import UUID

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.models.paper import Chunk
from app.services.embedding_service import EmbeddingService
from app.config import settings

logger = logging.getLogger(__name__)


class RetrievalService:
    """Service for retrieving relevant chunks based on queries."""

    def __init__(self, embedding_service: Optional[EmbeddingService] = None):
        """
        Initialize the retrieval service.

        Args:
            embedding_service: Embedding service to use for vector generation
        """
        self.embedding_service = embedding_service or EmbeddingService()
        self.chunks: List[Chunk] = []  # In-memory storage (would use vector DB in production)
        self.chunk_embeddings: List[List[float]] = []

    async def add_chunks(self, chunks: List[Chunk]) -> None:
        """
        Add chunks to the retrieval index.

        Args:
            chunks: List of Chunk objects to add to the index
        """
        if not chunks:
            return

        # Generate embeddings for chunks
        embedded_chunks = await self.embedding_service.generate_embeddings(chunks)

        # Store chunks and their embeddings
        start_index = len(self.chunks)
        self.chunks.extend(embedded_chunks)

        # Store embeddings
        for chunk in embedded_chunks:
            if chunk.embedding:
                self.chunk_embeddings.append(chunk.embedding)
            else:
                # Generate embedding if missing
                embedding = await self.embedding_service.generate_embedding(chunk.content)
                self.chunk_embeddings.append(embedding)

        logger.info(f"Added {len(chunks)} chunks to retrieval index")

    async def get_relevant_chunks(
        self,
        query: str,
        limit: int = 10,
        score_threshold: float = 0.3
    ) -> List[Chunk]:
        """
        Retrieve chunks relevant to a query.

        Args:
            query: The search query
            limit: Maximum number of chunks to return
            score_threshold: Minimum similarity score threshold

        Returns:
            List of Chunk objects sorted by relevance
        """
        if not self.chunks:
            logger.warning("No chunks in retrieval index")
            return []

        if not query.strip():
            logger.warning("Empty query provided")
            return []

        try:
            # Generate embedding for query
            query_embedding = await self.embedding_service.generate_embedding(query)

            if not query_embedding:
                logger.warning("Failed to generate query embedding")
                return []

            # Convert to numpy arrays for similarity computation
            query_vector = np.array([query_embedding])
            chunk_vectors = np.array(self.chunk_embeddings)

            # Compute cosine similarities
            similarities = cosine_similarity(query_vector, chunk_vectors)[0]

            # Create list of (index, score) tuples
            indexed_scores = list(enumerate(similarities))

            # Filter by threshold and sort by score (descending)
            filtered_scores = [
                (idx, score) for idx, score in indexed_scores
                if score >= score_threshold
            ]
            filtered_scores.sort(key=lambda x: x[1], reverse=True)

            # Limit results
            limited_scores = filtered_scores[:limit]

            # Retrieve corresponding chunks
            relevant_chunks = []
            for idx, score in limited_scores:
                chunk = self.chunks[idx]
                # Add similarity score to chunk metadata for debugging
                chunk_dict = chunk.model_dump()
                chunk_dict['similarity_score'] = float(score)
                relevant_chunks.append(chunk)

            logger.info(f"Retrieved {len(relevant_chunks)} relevant chunks for query")
            return relevant_chunks

        except Exception as e:
            logger.error(f"Failed to retrieve relevant chunks: {str(e)}")
            return []

    async def get_chunks_by_paper(
        self,
        paper_id: UUID,
        limit: int = 100
    ) -> List[Chunk]:
        """
        Get all chunks for a specific paper.

        Args:
            paper_id: The paper ID
            limit: Maximum number of chunks to return

        Returns:
            List of Chunk objects for the paper
        """
        paper_chunks = [
            chunk for chunk in self.chunks
            if chunk.paper_id == paper_id
        ]

        # Return limited results
        return paper_chunks[:limit]

    async def get_chunks_by_section(
        self,
        section: str,
        limit: int = 100
    ) -> List[Chunk]:
        """
        Get chunks for a specific section.

        Args:
            section: The section name
            limit: Maximum number of chunks to return

        Returns:
            List of Chunk objects for the section
        """
        section_chunks = [
            chunk for chunk in self.chunks
            if chunk.section.lower() == section.lower()
        ]

        # Return limited results
        return section_chunks[:limit]

    def clear_index(self) -> None:
        """Clear all chunks from the retrieval index."""
        self.chunks.clear()
        self.chunk_embeddings.clear()
        logger.info("Retrieval index cleared")

    def get_index_size(self) -> int:
        """Get the number of chunks in the retrieval index."""
        return len(self.chunks)