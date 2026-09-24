"""Service for generating text embeddings."""

from __future__ import annotations

from typing import List, Dict, Any, Optional
from uuid import UUID

import numpy as np
from sentence_transformers import SentenceTransformer

from app.models.paper import Chunk
from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating text embeddings."""

    def __init__(self, model_name: Optional[str] = None):
        """
        Initialize the embedding service.

        Args:
            model_name: Name of the sentence transformer model to use
        """
        self.model_name = model_name or settings.embedding_model
        self.model = None
        self._load_model()

    def _load_model(self):
        """Load the sentence transformer model."""
        try:
            logger.info(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"Embedding model {self.model_name} loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model {self.model_name}: {str(e)}")
            # Fallback to a basic model
            try:
                logger.info("Falling back to all-MiniLM-L6-v2 model")
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
                self.model_name = 'all-MiniLM-L6-v2'
                logger.info("Fallback model loaded successfully")
            except Exception as fallback_error:
                logger.error(f"Failed to load fallback model: {str(fallback_error)}")
                raise RuntimeError(f"Could not load any embedding model: {str(e)}")

    async def generate_embeddings(
        self,
        chunks: List[Chunk],
        batch_size: Optional[int] = None
    ) -> List[Chunk]:
        """
        Generate embeddings for a list of chunks.

        Args:
            chunks: List of Chunk objects to embed
            batch_size: Batch size for processing (uses settings if not provided)

        Returns:
            List of Chunk objects with embeddings populated
        """
        if not chunks:
            return []

        batch_size = batch_size or settings.embedding_batch_size

        # Extract text from chunks
        texts = [chunk.content for chunk in chunks]

        # Generate embeddings in batches
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            try:
                batch_embeddings = self.model.encode(
                    batch_texts,
                    convert_to_numpy=True,
                    show_progress_bar=False
                )
                all_embeddings.extend(batch_embeddings)
                logger.debug(f"Generated embeddings for batch {i//batch_size + 1}")
            except Exception as e:
                logger.error(f"Failed to generate embeddings for batch {i//batch_size + 1}: {str(e)}")
                # Add zero vectors for failed batches
                embedding_dim = self.model.get_sentence_embedding_dimension()
                zero_embeddings = np.zeros((len(batch_texts), embedding_dim))
                all_embeddings.extend(zero_embeddings)

        # Assign embeddings to chunks
        for i, chunk in enumerate(chunks):
            if i < len(all_embeddings):
                chunk.embedding = all_embeddings[i].tolist()
            else:
                # Fallback: zero vector
                embedding_dim = self.model.get_sentence_embedding_dimension()
                chunk.embedding = [0.0] * embedding_dim

        logger.info(f"Generated embeddings for {len(chunks)} chunks")
        return chunks

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text string.

        Args:
            text: The text to embed

        Returns:
            List of floats representing the embedding
        """
        if not text.strip():
            # Return zero vector for empty text
            embedding_dim = self.model.get_sentence_embedding_dimension()
            return [0.0] * embedding_dim

        try:
            embedding = self.model.encode(
                [text],
                convert_to_numpy=True,
                show_progress_bar=False
            )[0]
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Failed to generate embedding for text: {str(e)}")
            # Return zero vector as fallback
            embedding_dim = self.model.get_sentence_embedding_dimension()
            return [0.0] * embedding_dim

    def get_embedding_dimension(self) -> int:
        """Get the dimension of the embeddings."""
        if self.model:
            return self.model.get_sentence_embedding_dimension()
        return 384  # Default for all-MiniLM-L6-v2

    async def compute_similarity(
        self,
        text1: str,
        text2: str
    ) -> float:
        """
        Compute cosine similarity between two texts.

        Args:
            text1: First text
            text2: Second text

        Returns:
            Cosine similarity score between 0 and 1
        """
        try:
            emb1 = await self.generate_embedding(text1)
            emb2 = await self.generate_embedding(text2)

            # Convert to numpy arrays
            vec1 = np.array(emb1)
            vec2 = np.array(emb2)

            # Compute cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)

            if norm1 == 0 or norm2 == 0:
                return 0.0

            similarity = dot_product / (norm1 * norm2)
            # Ensure result is between 0 and 1
            return max(0.0, min(1.0, (similarity + 1) / 2))
        except Exception as e:
            logger.error(f"Failed to compute similarity: {str(e)}")
            return 0.0