"""Service for reranking retrieved chunks based on relevance."""

from __future__ import annotations

import logging
from typing import List, Dict, Any, Optional
from uuid import UUID

import numpy as np
from sentence_transformers import CrossEncoder

from app.models.paper import Chunk
from app.config import settings

logger = logging.getLogger(__name__)


class RerankingService:
    """Service for reranking retrieved chunks based on relevance."""

    def __init__(self, model_name: Optional[str] = None):
        """
        Initialize the reranking service.

        Args:
            model_name: Name of the cross-encoder model to use for reranking
        """
        self.model_name = model_name or settings.reranker_model
        self.model = None
        self._load_model()

    def _load_model(self):
        """Load the cross-encoder model."""
        try:
            logger.info(f"Loading reranking model: {self.model_name}")
            self.model = CrossEncoder(self.model_name)
            logger.info(f"Reranking model {self.model_name} loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load reranking model {self.model_name}: {str(e)}")
            # Fallback to a basic cross-encoder
            try:
                logger.info("Falling back to cross-encoder/ms-marco-MiniLM-L-6-v2 model")
                self.model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
                self.model_name = 'cross-encoder/ms-marco-MiniLM-L-6-v2'
                logger.info("Fallback reranking model loaded successfully")
            except Exception as fallback_error:
                logger.error(f"Failed to load fallback reranking model: {str(fallback_error)}")
                # If we can't load a cross-encoder, we'll use a simpler approach
                self.model = None
                logger.warning("No reranking model available, will use original scores")

    async def rerank_chunks(
        self,
        query: str,
        chunks: List[Chunk],
        top_k: Optional[int] = None
    ) -> List[Chunk]:
        """
        Rerank chunks based on relevance to a query using a cross-encoder.

        Args:
            query: The search query
            chunks: List of Chunk objects to rerank
            top_k: Number of top chunks to return (uses settings if not provided)

        Returns:
            List of Chunk objects sorted by relevance (highest first)
        """
        if not chunks:
            return []

        if not query.strip():
            logger.warning("Empty query provided for reranking")
            return chunks

        top_k = top_k or settings.reranker_top_k

        # If we don't have a model, return original order
        if self.model is None:
            logger.warning("No reranking model available, returning original order")
            return chunks[:top_k]

        try:
            # Prepare query-chunk pairs for the cross-encoder
            pairs = []
            valid_chunks = []

            for chunk in chunks:
                if chunk.content and chunk.content.strip():
                    pairs.append([query, chunk.content])
                    valid_chunks.append(chunk)
                else:
                    logger.warning(f"Skipping empty chunk in reranking")

            if not pairs:
                logger.warning("No valid chunks to rerank")
                return []

            # Get relevance scores from cross-encoder
            logger.info(f"Reranking {len(pairs)} chunk-query pairs")
            scores = self.model.predict(pairs)

            # Create list of (chunk, score) tuples
            chunk_scores = list(zip(valid_chunks, scores))

            # Sort by score (descending)
            chunk_scores.sort(key=lambda x: x[1], reverse=True)

            # Take top k
            top_chunks = [chunk for chunk, score in chunk_scores[:top_k]]

            logger.info(f"Reranked and selected top {len(top_chunks)} chunks")
            return top_chunks

        except Exception as e:
            logger.error(f"Failed to rerank chunks: {str(e)}")
            # Fallback to original order
            return chunks[:top_k]

    async def rerank_with_scores(
        self,
        query: str,
        chunks: List[Chunk]
    ) -> List[Dict[str, Any]]:
        """
        Rerank chunks and return them with their scores.

        Args:
            query: The search query
            chunks: List of Chunk objects to rerank

        Returns:
            List of dictionaries containing chunks and their reranking scores
        """
        if not chunks:
            return []

        if not query.strip():
            logger.warning("Empty query provided for reranking")
            return [{"chunk": chunk, "score": 0.0} for chunk in chunks]

        # If we don't have a model, return original order with zero scores
        if self.model is None:
            logger.warning("No reranking model available, returning original order")
            return [{"chunk": chunk, "score": 0.0} for chunk in chunks]

        try:
            # Prepare query-chunk pairs for the cross-encoder
            pairs = []
            valid_chunks = []

            for chunk in chunks:
                if chunk.content and chunk.content.strip():
                    pairs.append([query, chunk.content])
                    valid_chunks.append(chunk)
                else:
                    logger.warning(f"Skipping empty chunk in reranking")

            if not pairs:
                logger.warning("No valid chunks to rerank")
                return []

            # Get relevance scores from cross-encoder
            logger.info(f"Reranking {len(pairs)} chunk-query pairs")
            scores = self.model.predict(pairs)

            # Create list of dictionaries with chunks and scores
            results = []
            for chunk, score in zip(valid_chunks, scores):
                results.append({
                    "chunk": chunk,
                    "score": float(score)
                })

            # Sort by score (descending)
            results.sort(key=lambda x: x["score"], reverse=True)

            logger.info(f"Reranked {len(results)} chunks with scores")
            return results

        except Exception as e:
            logger.error(f"Failed to rerank chunks with scores: {str(e)}")
            # Fallback to original order
            return [{"chunk": chunk, "score": 0.0} for chunk in chunks]

    def is_available(self) -> bool:
        """Check if the reranking model is available."""
        return self.model is not None