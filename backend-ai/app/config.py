"""Application configuration management using Pydantic Settings."""

from __future__ import annotations

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    # LLM Config
    llm_provider: str = Field(default="openrouter", description="LLM provider to use")
    llm_model: str = Field(default="qwen/qwen3-32b:free", description="LLM model to use")
    openrouter_api_key: str = Field(default="", description="OpenRouter API key")
    llm_temperature: float = Field(default=0.1, description="LLM temperature", ge=0.0, le=2.0)
    llm_max_tokens: int = Field(default=4096, description="Maximum tokens for LLM response", ge=1)
    llm_timeout: int = Field(default=120, description="LLM request timeout in seconds", ge=1)
    llm_max_retries: int = Field(default=3, description="Maximum LLM retry attempts", ge=0)
    llm_base_url: str = Field(default="https://openrouter.ai/api/v1", description="Base URL for LLM API")

    # Embedding Config
    embedding_model: str = Field(default="BAAI/bge-small-en-v1.5", description="Embedding model name")
    embedding_dimension: int = Field(default=384, description="Embedding vector dimension", ge=1)
    embedding_batch_size: int = Field(default=32, description="Batch size for embedding generation", ge=1)

    # Reranker Config
    reranker_model: str = Field(default="BAAI/bge-reranker-base", description="Reranker model name")
    reranker_top_k: int = Field(default=5, description="Number of results to return from reranker", ge=1)

    # Database Config
    supabase_url: str = Field(default="", description="Supabase project URL")
    supabase_key: str = Field(default="", description="Supabase anon/public key")
    supabase_db_url: str = Field(default="", description="Supabase database URL (for direct access)")

    # File Config
    max_file_size_mb: int = Field(default=50, description="Maximum file size in MB for uploads", ge=1)
    max_files_per_upload: int = Field(default=10, description="Maximum number of files per upload", ge=1)
    upload_dir: str = Field(default="./uploads", description="Directory for uploaded files")
    temp_dir: str = Field(default="./temp", description="Directory for temporary files")

    # Pipeline Config
    max_parallel_papers: int = Field(default=3, description="Maximum number of papers to process in parallel", ge=1)
    verification_enabled: bool = Field(default=True, description="Enable claim verification step")
    min_claim_confidence: float = Field(default=0.7, description="Minimum confidence for claims to be considered valid", ge=0.0, le=1.0)

    # Feature Flags
    ocr_enabled: bool = Field(default=True, description="Enable OCR for scanned PDFs")
    hybrid_search_enabled: bool = Field(default=True, description="Enable hybrid search (vector + keyword)")
    reranking_enabled: bool = Field(default=True, description="Enable result reranking")
    claim_verification_enabled: bool = Field(default=True, description="Enable claim verification")

    @field_validator("llm_provider")
    @classmethod
    def validate_llm_provider(cls, v: str) -> str:
        """Validate LLM provider."""
        allowed_providers = ["openrouter", "openai", "anthropic"]
        if v.lower() not in allowed_providers:
            raise ValueError(f"LLM provider must be one of {allowed_providers}")
        return v.lower()

    @field_validator("llm_model")
    @classmethod
    def validate_llm_model(cls, v: str) -> str:
        """Validate LLM model is not empty."""
        if not v or not v.strip():
            raise ValueError("LLM model cannot be empty")
        return v.strip()


# Global settings instance
settings = Settings()


# Model Registry for OpenRouter free models
FREE_MODELS = {
    "qwen3-32b": "qwen/qwen3-32b:free",
    "qwen3-235b": "qwen/qwen3-235b-a22b:free",
    "qwen3-8b": "qwen/qwen3-8b:free",
    "deepseek-r1": "deepseek/deepseek-r1:free",
    "gemma3-27b": "google/gemma-3-27b-it:free",
    "llama4-scout": "meta-llama/llama-4-scout:free",
}

RECOMMENDED_MODEL = FREE_MODELS["qwen3-32b"]


def get_fallback_models() -> list[str]:
    """
    Get models in preference order for fallback.

    Returns:
        List of model identifiers in order of preference
    """
    return [
        FREE_MODELS["qwen3-32b"],
        FREE_MODELS["deepseek-r1"],
        FREE_MODELS["gemma3-27b"],
        FREE_MODELS["llama4-scout"],
        FREE_MODELS["qwen3-235b"],
        FREE_MODELS["qwen3-8b"],
    ]


# Example usage (for testing purposes)
if __name__ == "__main__":
    # This would be used for testing the config
    print("Configuration loaded successfully")
    print(f"LLM Provider: {settings.llm_provider}")
    print(f"LLM Model: {settings.llm_model}")