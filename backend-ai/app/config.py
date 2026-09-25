"""Application configuration management using Pydantic Settings."""

from __future__ import annotations

from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---------------------------------------------------------
    # Core LLM Configuration
    # ---------------------------------------------------------
    llm_provider: str = Field(default="nvidia_nim", description="LLM provider to use")
    llm_model: str = Field(default="moonshotai/kimi-k3", description="Default LLM model to use")
    nvidia_nim_api_key: str = Field(default="", description="NVIDIA NIM API key")
    nvidia_nim_base_url: str = Field(default="https://integrate.api.nvidia.com/v1", description="Base URL for NVIDIA NIM API")
    openrouter_api_key: str = Field(default="", description="OpenRouter API key")
    openai_api_key: str = Field(default="", description="OpenAI API key")
    anthropic_api_key: str = Field(default="", description="Anthropic API key")
    llm_temperature: float = Field(default=0.1, description="LLM temperature", ge=0.0, le=2.0)
    llm_max_tokens: int = Field(default=4096, description="Maximum tokens for LLM response", ge=1)
    llm_timeout: int = Field(default=120, description="LLM request timeout in seconds", gt=0)
    llm_max_retries: int = Field(default=3, description="Maximum LLM retry attempts", ge=0)
    llm_base_url: str = Field(default="https://integrate.api.nvidia.com/v1", description="Base URL for NVIDIA NIM API (overridden for openrouter)")

    # ---------------------------------------------------------
    # Multi-Model Architecture
    # ---------------------------------------------------------
    llm_analysis_model: str = Field(
        default="",
        description="Model for individual paper analysis (LLM_ANALYSIS_MODEL). Falls back to llm_model.",
    )
    llm_reasoning_model: str = Field(
        default="",
        description="Model for cross-doc reasoning: contradictions, gaps, common findings (LLM_REASONING_MODEL). Falls back to llm_model.",
    )
    llm_synthesis_model: str = Field(
        default="",
        description="Model for final report synthesis (LLM_SYNTHESIS_MODEL). Falls back to llm_model.",
    )
    llm_fallback_model_1: Optional[str] = Field(
        default=None,
        description="Primary fallback model when selected model fails or is unavailable.",
    )
    llm_fallback_model_2: Optional[str] = Field(
        default=None,
        description="Secondary fallback model when primary fallback also fails.",
    )
    multi_model_enabled: bool = Field(
        default=True,
        description="Enable multi-model specialization pipeline.",
    )
    use_reasoning_model: bool = Field(
        default=True,
        description="Use dedicated reasoning model for cross-document analysis.",
    )
    use_analysis_model: bool = Field(
        default=True,
        description="Use dedicated analysis model for individual paper extraction.",
    )
    use_synthesis_model: bool = Field(
        default=True,
        description="Use dedicated synthesis model for final report generation.",
    )

    # ---------------------------------------------------------
    # Concurrency & Batching
    # ---------------------------------------------------------
    parallel_analysis: bool = Field(default=True, description="Enable parallel paper analysis")
    max_parallel_papers: int = Field(default=5, description="Maximum number of papers to process in parallel (1-8)", ge=1, le=8)
    max_parallel_llm_requests: int = Field(default=3, description="Max concurrent LLM requests", ge=1)
    max_papers_per_batch: int = Field(default=8, description="Maximum papers accepted in one synthesis batch (1-8)", ge=1, le=8)

    # ---------------------------------------------------------
    # Report & Evidence Generation
    # ---------------------------------------------------------
    report_generation_enabled: bool = Field(default=True, description="Enable synthesis report generation")
    report_verification_enabled: bool = Field(default=True, description="Enable post-generation report verification")
    include_evidence: bool = Field(default=True, description="Include extracted evidence chunks in outputs")
    include_citations: bool = Field(default=True, description="Include paper citations in outputs")
    include_source_traceability: bool = Field(default=True, description="Include section and page provenance")
    require_evidence_for_claims: bool = Field(default=True, description="Require backing evidence for all extracted claims")
    allow_unverified_claims: bool = Field(default=False, description="Allow unverified claims in final report")
    allow_partial_reports: bool = Field(default=True, description="Allow generating partial reports if some papers fail")

    # ---------------------------------------------------------
    # Verification & Confidence
    # ---------------------------------------------------------
    citation_verification_enabled: bool = Field(default=True, description="Enable citation verification")
    contradiction_detection_enabled: bool = Field(default=True, description="Enable contradiction and divergence detection")
    min_evidence_score: float = Field(default=0.70, description="Minimum evidence score threshold (0.0 to 1.0)", ge=0.0, le=1.0)
    verification_enabled: bool = Field(default=True, description="Enable claim verification step")
    min_claim_confidence: float = Field(default=0.7, description="Minimum confidence for claims to be considered valid", ge=0.0, le=1.0)

    # ---------------------------------------------------------
    # Timeouts (in seconds)
    # ---------------------------------------------------------
    pdf_processing_timeout: int = Field(default=120, description="PDF text/OCR extraction timeout", gt=0)
    embedding_timeout: int = Field(default=120, description="Embedding generation timeout", gt=0)
    analysis_timeout: int = Field(default=120, description="Paper analysis timeout", gt=0)
    synthesis_timeout: int = Field(default=180, description="Report synthesis timeout", gt=0)
    verification_timeout: int = Field(default=120, description="Claim verification timeout", gt=0)

    # ---------------------------------------------------------
    # Embedding Config
    # ---------------------------------------------------------
    embedding_model: str = Field(default="BAAI/bge-small-en-v1.5", description="Embedding model name")
    embedding_dimension: int = Field(default=384, description="Embedding vector dimension", ge=1)
    embedding_batch_size: int = Field(default=32, description="Batch size for embedding generation", ge=1)

    # ---------------------------------------------------------
    # Reranker Config
    # ---------------------------------------------------------
    reranker_model: str = Field(default="BAAI/bge-reranker-base", description="Reranker model name")
    reranker_top_k: int = Field(default=5, description="Number of results to return from reranker", ge=1)

    # ---------------------------------------------------------
    # Database Config
    # ---------------------------------------------------------
    supabase_url: str = Field(default="", description="Supabase project URL")
    supabase_key: str = Field(default="", description="Supabase anon/public key")
    supabase_db_url: str = Field(default="", description="Supabase database URL (for direct access)")

    # ---------------------------------------------------------
    # File Storage Config
    # ---------------------------------------------------------
    max_file_size_mb: int = Field(default=50, description="Maximum file size in MB for uploads", ge=1)
    max_files_per_upload: int = Field(default=10, description="Maximum number of files per upload", ge=1)
    upload_dir: str = Field(default="./uploads", description="Directory for uploaded files")
    temp_dir: str = Field(default="./temp", description="Directory for temporary files")

    # ---------------------------------------------------------
    # SSL Settings & Proxy Bypass
    # ---------------------------------------------------------
    ssl_verify: bool = Field(default=True, description="Enable SSL verification")
    ssl_cert_file: str = Field(default="", description="Path to custom CA bundle (empty to use certifi)")
    no_proxy: str = Field(default="localhost,127.0.0.1,openrouter.ai,api.deepseek.com", description="Bypass proxy for these hosts")
    http_proxy: str = Field(default="", description="HTTP Proxy URL")
    https_proxy: str = Field(default="", description="HTTPS Proxy URL")

    # ---------------------------------------------------------
    # Feature Flags
    # ---------------------------------------------------------
    ocr_enabled: bool = Field(default=True, description="Enable OCR for scanned PDFs")
    hybrid_search_enabled: bool = Field(default=True, description="Enable hybrid search (vector + keyword)")
    reranking_enabled: bool = Field(default=True, description="Enable result reranking")
    claim_verification_enabled: bool = Field(default=True, description="Enable claim verification")

    @field_validator("llm_provider")
    @classmethod
    def validate_llm_provider(cls, v: str) -> str:
        """Validate LLM provider."""
        allowed_providers = ["nvidia_nim", "nvidia", "openrouter", "openai", "anthropic", "ollama", "deepseek"]
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
    "openrouter-free": "openrouter/free",
    "nemotron-super": "nvidia/nemotron-3-super-120b-a12b:free",
    "nemotron-ultra": "nvidia/nemotron-3-ultra-550b-a55b:free",
    "liquid-lfm": "liquid/lfm-2.5-2.6b:free",
    "dots-preview": "dots-studio/dots-3-note-preview:free",
    "gemma4-31b": "google/gemma-4-31b-it:free",
    "qwen3.8-27b": "qwen/qwen3.8-27b:free",
    "deepseek-r1": "deepseek/deepseek-r1:free",
    "gemma3-27b": "google/gemma-3-27b-it:free",
    "llama4-scout": "meta-llama/llama-4-scout:free",
    "qwen3-32b": "qwen/qwen3-32b:free",
}

RECOMMENDED_MODEL = FREE_MODELS["openrouter-free"]


def get_analysis_model() -> str:
    """Return the model to use for individual paper analysis.

    Returns:
        Model identifier string, preferring LLM_ANALYSIS_MODEL then LLM_MODEL.
    """
    if settings.multi_model_enabled and settings.use_analysis_model and settings.llm_analysis_model.strip():
        return settings.llm_analysis_model.strip()
    return settings.llm_model


def get_reasoning_model() -> str:
    """Return the model to use for cross-document reasoning tasks.

    Returns:
        Model identifier string, preferring LLM_REASONING_MODEL then LLM_MODEL.
    """
    if settings.multi_model_enabled and settings.use_reasoning_model and settings.llm_reasoning_model.strip():
        return settings.llm_reasoning_model.strip()
    return settings.llm_model


def get_synthesis_model() -> str:
    """Return the model to use for final report synthesis.

    Returns:
        Model identifier string, preferring LLM_SYNTHESIS_MODEL then LLM_MODEL.
    """
    if settings.multi_model_enabled and settings.use_synthesis_model and settings.llm_synthesis_model.strip():
        return settings.llm_synthesis_model.strip()
    return settings.llm_model


def get_fallback_models() -> List[str]:
    """Get models in preference order for fallback.

    Returns:
        List of model identifiers in order of preference.
    """
    fallbacks: List[str] = []

    # 1. User-configured fallback models from .env
    if settings.llm_fallback_model_1 and settings.llm_fallback_model_1.strip():
        m1 = settings.llm_fallback_model_1.strip()
        if m1 not in fallbacks:
            fallbacks.append(m1)
    if settings.llm_fallback_model_2 and settings.llm_fallback_model_2.strip():
        m2 = settings.llm_fallback_model_2.strip()
        if m2 not in fallbacks:
            fallbacks.append(m2)

    # 2. Provider-specific default fallbacks
    if settings.llm_provider.lower() in ("nvidia_nim", "nvidia"):
        nvidia_fallbacks = [
            "moonshotai/kimi-k2.6",
            "moonshotai/kimi-k3",
            "mistralai/mistral-large-2-instruct",
        ]
        for nf in nvidia_fallbacks:
            if nf not in fallbacks:
                fallbacks.append(nf)
        return fallbacks

    default_fallbacks = [
        FREE_MODELS["openrouter-free"],
        FREE_MODELS["nemotron-super"],
        FREE_MODELS["nemotron-ultra"],
        FREE_MODELS["liquid-lfm"],
        FREE_MODELS["dots-preview"],
        FREE_MODELS["gemma4-31b"],
        FREE_MODELS["qwen3.8-27b"],
        FREE_MODELS["qwen3-32b"],
    ]
    for df in default_fallbacks:
        if df not in fallbacks:
            fallbacks.append(df)
    return fallbacks



# Example usage (for testing purposes)
if __name__ == "__main__":
    print("Configuration loaded successfully")
    print(f"LLM Provider: {settings.llm_provider}")
    print(f"LLM Model: {settings.llm_model}")