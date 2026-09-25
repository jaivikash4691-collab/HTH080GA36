"""Async OpenRouter client and evidence-focused prompt helpers with SSL and proxy resilience."""

from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import re
import ssl
import warnings
from collections.abc import AsyncGenerator, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any

import certifi
import httpx
import urllib3

# Suppress only InsecureRequest warnings
# Do NOT suppress all warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

log = logging.getLogger(__name__)
logger = log

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/"
DEFAULT_MODEL = "qwen/qwen3-32b:free"
DEFAULT_CONTEXT_TOKENS = 6000


def _get_settings() -> Any:

    """Safely obtain the settings instance without failing at import time."""
    try:
        from app.config import settings
        return settings
    except Exception:
        return None


def _environment_int(name: str, default: int) -> int:

    """Read a positive integer setting without making import-time failures likely."""
    value = os.getenv(name)
    if value is None:
        return default
    try:
        parsed = int(value)
    except ValueError:
        logger.warning("Ignoring invalid %s value; using %s", name, default)
        return default
    return parsed if parsed > 0 else default


def _environment_float(name: str, default: float) -> float:
    """Read a float setting, falling back to the documented default."""
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        logger.warning("Ignoring invalid %s value; using %s", name, default)
        return default


@dataclass(slots=True)
class LLMConfig:
    """Runtime configuration for the LLM provider.

    The provider settings are read from environment variables or app.config when an
    instance is created. Optional ``LLM_*`` overrides make operational tuning
    possible without changing application code.
    """

    provider: str = field(
        default_factory=lambda: getattr(
            _get_settings(), "llm_provider", os.getenv("LLM_PROVIDER", "openrouter")
        )
    )
    model: str = field(
        default_factory=lambda: getattr(
            _get_settings(), "llm_model", os.getenv("LLM_MODEL", DEFAULT_MODEL)
        )
    )
    api_key: str = field(
        default_factory=lambda: (
            (getattr(_get_settings(), "nvidia_nim_api_key", "") or os.getenv("NVIDIA_NIM_API_KEY", ""))
            if (getattr(_get_settings(), "llm_provider", "").lower() in ("nvidia_nim", "nvidia") or os.getenv("LLM_PROVIDER", "").lower() in ("nvidia_nim", "nvidia"))
            else (
                (getattr(_get_settings(), "openai_api_key", "") or os.getenv("OPENAI_API_KEY", ""))
                if (getattr(_get_settings(), "llm_provider", "").lower() == "openai" or os.getenv("LLM_PROVIDER", "").lower() == "openai")
                else (
                    (getattr(_get_settings(), "anthropic_api_key", "") or os.getenv("ANTHROPIC_API_KEY", ""))
                    if (getattr(_get_settings(), "llm_provider", "").lower() == "anthropic" or os.getenv("LLM_PROVIDER", "").lower() == "anthropic")
                    else (getattr(_get_settings(), "openrouter_api_key", "") or os.getenv("OPENROUTER_API_KEY", ""))
                )
            )
        )
    )
    llm_base_url: str = field(
        default_factory=lambda: getattr(
            _get_settings(), "llm_base_url", os.getenv("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
        )
    )
    llm_timeout: int = field(
        default_factory=lambda: getattr(
            _get_settings(), "llm_timeout", _environment_int("LLM_TIMEOUT", 120)
        )
    )
    llm_max_retries: int = field(
        default_factory=lambda: getattr(
            _get_settings(), "llm_max_retries", _environment_int("LLM_MAX_RETRIES", 3)
        )
    )
    ssl_verify: bool = field(
        default_factory=lambda: getattr(
            _get_settings(), "ssl_verify", True
        )
    )
    ssl_cert_file: str = field(
        default_factory=lambda: getattr(
            _get_settings(), "ssl_cert_file", ""
        )
    )
    llm_temperature: float = field(
        default_factory=lambda: getattr(
            _get_settings(), "llm_temperature", _environment_float("LLM_TEMPERATURE", 0.1)
        )
    )
    temperature: float = field(
        default_factory=lambda: getattr(
            _get_settings(), "llm_temperature", _environment_float("LLM_TEMPERATURE", 0.1)
        )
    )
    max_tokens: int = field(
        default_factory=lambda: getattr(
            _get_settings(), "llm_max_tokens", _environment_int("LLM_MAX_TOKENS", 4096)
        )
    )
    llm_max_tokens: int = field(
        default_factory=lambda: getattr(
            _get_settings(), "llm_max_tokens", _environment_int("LLM_MAX_TOKENS", 4096)
        )
    )
    no_proxy: str = field(
        default_factory=lambda: getattr(
            _get_settings(), "no_proxy", "localhost,127.0.0.1,openrouter.ai,api.deepseek.com"
        )
    )
    http_proxy: str = field(
        default_factory=lambda: getattr(
            _get_settings(), "http_proxy", ""
        )
    )
    https_proxy: str = field(
        default_factory=lambda: getattr(
            _get_settings(), "https_proxy", ""
        )
    )

    @classmethod
    def from_env(cls) -> "LLMConfig":
        """Create configuration from the current process environment."""
        return cls()



class LLMServiceError(RuntimeError):
    """An LLM request failure, including enough data for callers to react."""

    def __init__(
        self,
        message: str,
        *,
        attempts: int = 0,
        max_retries: int = 0,
        retryable: bool = False,
        status_code: int | None = None,
    ) -> None:
        super().__init__(message)
        self.attempts = attempts
        self.max_retries = max_retries
        self.retryable = retryable
        self.status_code = status_code

    @property
    def retries_used(self) -> int:
        """Number of retries performed after the initial request."""
        return max(0, self.attempts - 1)


class _OpenRouterRequestError(Exception):
    """Internal HTTP error that retains status and retryability."""

    def __init__(self, message: str, status_code: int, retryable: bool) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.retryable = retryable


class LLMService:
    """Async LLM client supporting multiple providers (openrouter, nvidia_nim, etc.)."""

    def __init__(
        self,
        config: LLMConfig | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.config = config or LLMConfig.from_env()
        provider = self.config.provider.lower()

        # Provider-specific setup
        if provider == "openrouter":
            self._setup_openrouter()
        elif provider == "nvidia_nim":
            self._setup_nvidia_nim()
        else:
            raise LLMServiceError(
                f"Unsupported LLM provider: '{provider}'. Supported: openrouter, nvidia_nim."
            )

    def _setup_openrouter(self) -> None:
        """Configure for OpenRouter provider (existing behavior)."""
        # Apply proxy settings
        no_proxy = os.getenv(
            "NO_PROXY", "localhost,127.0.0.1,openrouter.ai,api.deepseek.com"
        )
        if no_proxy:
            os.environ["NO_PROXY"] = no_proxy
            os.environ["no_proxy"] = no_proxy
        if not os.getenv("HTTP_PROXY"):
            os.environ.pop("HTTP_PROXY", None)
            os.environ.pop("http_proxy", None)
        if not os.getenv("HTTPS_PROXY"):
            os.environ.pop("HTTPS_PROXY", None)
            os.environ.pop("https_proxy", None)

        ssl_cert_file = os.getenv("SSL_CERT_FILE", "")
        ssl_verify_env = os.getenv("SSL_VERIFY", "true").lower() in ("true", "1", "yes")

        cert_target = (
            ssl_cert_file
            if (ssl_cert_file and os.path.exists(ssl_cert_file))
            else certifi.where()
        )
        self._verify = cert_target if ssl_verify_env else False
        self._owns_client = True
        self._client = httpx.AsyncClient(
            base_url=OPENROUTER_BASE_URL,
            timeout=httpx.Timeout(self.config.timeout),
            verify=self._verify,
            headers={
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json",
            },
        )

    def _setup_nvidia_nim(self) -> None:
        """Configure for NVIDIA NIM provider using NvidiaNimClient."""
        from .llm_factory import NvidiaNimClient

        # Build API key from config/environment
        api_key = (
            self.config.api_key
            or os.getenv("NVIDIA_NIM_API_KEY", "")
        )

        self._client = NvidiaNimClient(
            api_key=api_key,
            model=self.config.model,
            config=self.config,
        )
        self._owns_client = False
        self._verify = self.config.ssl_verify
        self._nvidia_nim_provider = True

    def _ensure_client(self) -> httpx.AsyncClient | NvidiaNimClient:
        """Return the internal HTTP client, creating if needed."""
        if not hasattr(self, "_client") or self._client is None:
            provider = self.config.provider.lower()
            if provider == "nvidia_nim":
                self._setup_nvidia_nim()
            else:
                self._setup_openrouter()
        return self._client

    async def __aenter__(self) -> "LLMService":
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        """Close the internally-created HTTP client."""
        if self._owns_client:
            await self._client.aclose()

    def _ensure_api_key(self) -> None:
        if not self.config.api_key.strip():
            provider = self.config.provider.lower()
            key_name = "NVIDIA_NIM_API_KEY" if provider in ("nvidia_nim", "nvidia") else "OPENROUTER_API_KEY"
            raise LLMServiceError(
                f"{key_name} is not configured.",
                attempts=0,
                max_retries=self.config.max_retries,
            )

    def _payload(
        self,
        messages: Sequence[Mapping[str, Any]],
        temperature: float | None,
        max_tokens: int | None,
        response_format: Mapping[str, Any] | None,
        *,
        stream: bool = False,
    ) -> dict[str, Any]:
        if not messages:
            raise LLMServiceError("At least one chat message is required.")

        payload: dict[str, Any] = {
            "model": self.config.model,
            "messages": [dict(message) for message in messages],
            "temperature": self.config.temperature if temperature is None else temperature,
            "max_tokens": self.config.max_tokens if max_tokens is None else max_tokens,
        }
        if response_format is not None:
            payload["response_format"] = dict(response_format)
        if stream:
            payload["stream"] = True
        return payload

    @staticmethod
    def _response_detail(response: httpx.Response) -> str:
        try:
            payload = response.json()
        except (json.JSONDecodeError, ValueError):
            return response.text[:500]

        if isinstance(payload, Mapping):
            error = payload.get("error", payload)
            if isinstance(error, Mapping):
                return str(error.get("message", error))[:500]
        return str(payload)[:500]

    @staticmethod
    def _text_from_content(content: Any) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return "".join(
                part.get("text", "")
                for part in content
                if isinstance(part, Mapping) and isinstance(part.get("text", ""), str)
            )
        return ""

    @staticmethod
    def _log_usage(payload: Mapping[str, Any]) -> None:
        usage = payload.get("usage")
        if not isinstance(usage, Mapping):
            logger.info("OpenRouter response did not include token usage.")
            return
        logger.info(
            "OpenRouter token usage: prompt=%s completion=%s total=%s",
            usage.get("prompt_tokens", "unknown"),
            usage.get("completion_tokens", "unknown"),
            usage.get("total_tokens", "unknown"),
        )

    async def _sleep_before_retry(self, retry_number: int) -> None:
        delay = 0.5 * (2 ** (retry_number - 1))
        await asyncio.sleep(delay)

    async def _post_with_ssl_fallback(self, url: str, payload: dict) -> httpx.Response:
        """Execute POST request with automatic SSL verification fallback."""
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }
        attempts = []
        if self._verify:
            attempts.append({"verify": self._verify, "label": "certifi"})
            attempts.append({"verify": False, "label": "no-verify (fallback)"})
        else:
            attempts.append({"verify": False, "label": "no-verify (configured)"})

        last_error = None
        for attempt_cfg in attempts:
            try:
                client = httpx.AsyncClient(
                    base_url=OPENROUTER_BASE_URL,
                    timeout=httpx.Timeout(self.config.timeout),
                    verify=attempt_cfg["verify"],
                    headers=headers,
                )
                async with client:
                    response = await client.post(url, json=payload)
                    if attempt_cfg["label"] == "no-verify (fallback)":
                        log.warning(
                            "SSL verification failed with certifi. "
                            "Retrying with verification disabled. "
                            "WARNING: This is insecure. "
                            "Fix your SSL certificates for production."
                        )
                    return response
            except (httpx.ConnectError, ssl.SSLError) as exc:
                last_error = exc
                log.warning("OpenRouter SSL attempt '%s' failed: %s", attempt_cfg["label"], exc)
                continue
            except Exception as exc:
                if "SSL" in str(exc) or "certificate" in str(exc).lower():
                    last_error = exc
                    log.warning("OpenRouter SSL attempt '%s' failed: %s", attempt_cfg["label"], exc)
                    continue
                raise

        raise LLMServiceError(
            f"All SSL attempts failed for OpenRouter request. Last error: {last_error}\n"
            "Possible causes:\n"
            "1. Corporate proxy/VPN intercepting requests\n"
            "2. Zscaler or antivirus SSL inspection\n"
            "3. Fiddler running on port 8080/8082\n"
            "Fix: Disable proxy, or switch LLM_PROVIDER=ollama"
        )

    async def complete(
        self,
        messages: Sequence[Mapping[str, Any]],
        temperature: float | None = None,
        max_tokens: int | None = None,
        response_format: Mapping[str, Any] | None = None,
        allow_fallback: bool = True,
    ) -> str:
        """Return one completion, retrying rate limits/503s and falling back across available models."""
        self._ensure_api_key()
        provider = self.config.provider.lower()

        # Build payload using the configured model
        payload = self._payload(messages, temperature, max_tokens, response_format)

        if provider == "nvidia_nim":
            # Delegate to NvidiaNimClient
            return await self._client.complete(payload, allow_fallback=allow_fallback)

        # OpenRouter provider (existing behavior)
        total_attempts = self.config.max_retries + 1
        primary_model = self.config.model
        last_error: Optional[Exception] = None

        for attempt in range(1, total_attempts + 1):
            try:
                response = await self._post_with_ssl_fallback("chat/completions", payload)
                if response.status_code >= 400:
                    detail = self._response_detail(response)
                    retryable = response.status_code in {429, 503}
                    if response.status_code == 404:
                        logger.warning(
                            "Primary model '%s' unavailable (HTTP 404: %s).",
                            primary_model,
                            detail[:120],
                        )
                        last_error = _OpenRouterRequestError(
                            f"OpenRouter model '{primary_model}' unavailable: {detail}", 404, False
                        )
                        break  # Break retry loop to proceed to fallback chain

                    raise _OpenRouterRequestError(
                        f"OpenRouter API returned HTTP {response.status_code}: {detail}",
                        response.status_code,
                        retryable,
                    )

                try:
                    response_payload = response.json()
                except (json.JSONDecodeError, ValueError) as exc:
                    raise LLMServiceError(
                        "OpenRouter returned a non-JSON completion response.",
                        attempts=attempt,
                        max_retries=self.config.max_retries,
                    ) from exc

                if not isinstance(response_payload, Mapping):
                    raise LLMServiceError(
                        "OpenRouter returned an invalid completion payload.",
                        attempts=attempt,
                        max_retries=self.config.max_retries,
                    )
                self._log_usage(response_payload)

                choices = response_payload.get("choices")
                if not isinstance(choices, list) or not choices:
                    raise LLMServiceError(
                        "OpenRouter returned a completion with no choices.",
                        attempts=attempt,
                        max_retries=self.config.max_retries,
                    )
                first_choice = choices[0]
                message = first_choice.get("message") if isinstance(first_choice, Mapping) else None
                content = message.get("content") if isinstance(message, Mapping) else None
                if content is None and isinstance(message, Mapping):
                    content = message.get("reasoning", "")
                text = self._text_from_content(content)
                if not text.strip():
                    raise LLMServiceError(
                        "OpenRouter returned an empty completion.",
                        attempts=attempt,
                        max_retries=self.config.max_retries,
                    )
                return text

            except _OpenRouterRequestError as exc:
                last_error = exc
                logger.warning(
                    "OpenRouter request attempt %s/%s failed (status=%s, retryable=%s): %s",
                    attempt,
                    total_attempts,
                    exc.status_code,
                    exc.retryable,
                    exc,
                )
                if not exc.retryable or attempt == total_attempts:
                    break
                await self._sleep_before_retry(attempt)

            except httpx.TimeoutException as exc:
                last_error = exc
                logger.warning(
                    "OpenRouter request timed out on attempt %s/%s for model '%s'.", attempt, total_attempts, primary_model
                )
                if attempt == total_attempts:
                    break
                await self._sleep_before_retry(attempt)

            except httpx.HTTPError as exc:
                last_error = exc
                logger.exception("OpenRouter HTTP client error on attempt %s/%s for model '%s'.", attempt, total_attempts, primary_model)
                break

        # If primary failed, iterate through fallback models
        if allow_fallback:
            try:
                from app.config import get_fallback_models
                fallback_models = get_fallback_models()
            except Exception:
                fallback_models = []

            for fb_model in fallback_models:
                if fb_model == primary_model:
                    continue
                try:
                    logger.info(
                        "Attempting fallback model '%s' (primary model '%s' failed)...",
                        fb_model,
                        primary_model,
                    )
                    fb_payload = self._payload(messages, temperature, max_tokens, response_format)
                    fb_payload["model"] = fb_model
                    response = await self._post_with_ssl_fallback("chat/completions", fb_payload)
                    if response.status_code == 200:
                        res_json = response.json()
                        choices = res_json.get("choices", [])
                        if choices:
                            first_msg = choices[0].get("message", {})
                            content = first_msg.get("content") or first_msg.get("reasoning") or ""
                            text = self._text_from_content(content)
                            if text.strip():
                                logger.info("Fallback model '%s' succeeded!", fb_model)
                                return text
                    else:
                        logger.warning("Fallback model '%s' returned HTTP %s", fb_model, response.status_code)
                except Exception as fb_exc:
                    logger.warning("Fallback model '%s' failed: %s", fb_model, fb_exc)
                    continue

        status_code = getattr(last_error, "status_code", None)
        raise LLMServiceError(
            f"OpenRouter request failed for model '{primary_model}' and all fallback models failed. Last error: {last_error}",
            attempts=total_attempts,
            max_retries=self.config.max_retries,
            retryable=getattr(last_error, "retryable", False),
            status_code=status_code,
        )


    async def complete_with_schema(
        self,
        messages: Sequence[Mapping[str, Any]],
        schema: dict[str, Any],
    ) -> dict[str, Any]:
        """Request JSON, validate it, then make one corrective retry if needed."""
        if not isinstance(schema, dict):
            raise LLMServiceError("The response schema must be a dictionary.")

        response_format = {"type": "json_object"}
        response = await self.complete(messages, response_format=response_format)
        try:
            return self._parse_and_validate_json(response, schema)
        except (json.JSONDecodeError, SchemaValidationError) as exc:
            validation_error = str(exc)
            logger.warning("LLM JSON response was invalid; requesting one correction: %s", validation_error)

        correction_prompt = (
            "Your previous response was not valid for the required JSON schema. "
            "Return only a corrected JSON object, with no Markdown or explanation. "
            f"Validation error: {validation_error}. JSON schema: {json.dumps(schema, separators=(',', ':'))}"
        )
        correction_messages = [dict(message) for message in messages]
        correction_messages.extend(
            [
                {"role": "assistant", "content": response},
                {"role": "user", "content": correction_prompt},
            ]
        )
        corrected_response = await self.complete(
            correction_messages,
            response_format=response_format,
        )
        try:
            return self._parse_and_validate_json(corrected_response, schema)
        except (json.JSONDecodeError, SchemaValidationError) as exc:
            logger.error("LLM JSON correction failed validation: %s", exc)
            raise LLMServiceError(
                f"LLM returned invalid JSON after one correction attempt: {exc}",
                attempts=2,
                max_retries=1,
            ) from exc

    @staticmethod
    def _parse_and_validate_json(response: str, schema: Mapping[str, Any]) -> dict[str, Any]:
        parsed = json.loads(response)
        if not isinstance(parsed, dict):
            raise SchemaValidationError("The response must be a JSON object.")
        _validate_json_schema(parsed, schema)
        return parsed

    async def stream_complete(
        self,
        messages: Sequence[Mapping[str, Any]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncGenerator[str, None]:
        """Yield text deltas from an LLM server-sent-events response."""
        self._ensure_api_key()
        provider = self.config.provider.lower()

        payload = self._payload(messages, temperature, max_tokens, None, stream=True)

        if provider == "nvidia_nim":
            # Delegate to NvidiaNimClient
            async for text in self._client.stream(payload):
                yield text
            return

        # OpenRouter provider (existing behavior)
        emitted_content = False
        total_attempts = self.config.max_retries + 1
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

        verify_attempts = [self._verify, False] if self._verify else [False]

        for attempt in range(1, total_attempts + 1):
            last_stream_err = None
            for verify_val in verify_attempts:
                try:
                    async with httpx.AsyncClient(
                        base_url=OPENROUTER_BASE_URL,
                        timeout=httpx.Timeout(self.config.timeout),
                        verify=verify_val,
                        headers=headers,
                    ) as client:
                        async with client.stream("POST", "chat/completions", json=payload) as response:
                            if response.status_code >= 400:
                                await response.aread()
                                detail = self._response_detail(response)
                                retryable = response.status_code in {429, 503}
                                raise _OpenRouterRequestError(
                                    f"OpenRouter stream returned HTTP {response.status_code}: {detail}",
                                    response.status_code,
                                    retryable,
                                )

                            async for line in response.aiter_lines():
                                if not line or not line.startswith("data:"):
                                    continue
                                data = line[5:].strip()
                                if data == "[DONE]":
                                    if emitted_content:
                                        return
                                    raise LLMServiceError(
                                        "OpenRouter returned an empty stream.",
                                        attempts=attempt,
                                        max_retries=self.config.max_retries,
                                    )
                                try:
                                    event = json.loads(data)
                                except json.JSONDecodeError:
                                    logger.warning("Ignoring malformed OpenRouter stream event.")
                                    continue
                                choices = event.get("choices") if isinstance(event, Mapping) else None
                                if not isinstance(choices, list) or not choices:
                                    continue
                                first_choice = choices[0]
                                delta = first_choice.get("delta") if isinstance(first_choice, Mapping) else None
                                content = delta.get("content") if isinstance(delta, Mapping) else None
                                text = self._text_from_content(content)
                                if text:
                                    emitted_content = True
                                    yield text
                            if emitted_content:
                                return
                            raise LLMServiceError(
                                "OpenRouter returned an empty stream.",
                                attempts=attempt,
                                max_retries=self.config.max_retries,
                            )

                except (httpx.ConnectError, ssl.SSLError) as exc:
                    last_stream_err = exc
                    log.warning("Stream SSL verify=%s failed: %s", verify_val, exc)
                    continue
                except _OpenRouterRequestError as exc:
                    logger.warning(
                        "OpenRouter stream attempt %s/%s failed (status=%s): %s",
                        attempt,
                        total_attempts,
                        exc.status_code,
                        exc,
                    )
                    if emitted_content or not exc.retryable or attempt == total_attempts:
                        raise LLMServiceError(
                            f"OpenRouter stream failed after {attempt} attempt(s): {exc}",
                            attempts=attempt,
                            max_retries=self.config.max_retries,
                            retryable=exc.retryable,
                            status_code=exc.status_code,
                        ) from exc
                    await self._sleep_before_retry(attempt)
                    break

                except httpx.TimeoutException as exc:
                    logger.warning("OpenRouter stream timed out on attempt %s/%s.", attempt, total_attempts)
                    if emitted_content or attempt == total_attempts:
                        raise LLMServiceError(
                            f"OpenRouter stream timed out after {attempt} attempt(s).",
                            attempts=attempt,
                            max_retries=self.config.max_retries,
                            retryable=True,
                        ) from exc
                    await self._sleep_before_retry(attempt)
                    break

                except httpx.HTTPError as exc:
                    logger.exception("OpenRouter streaming client error.")
                    raise LLMServiceError(
                        f"OpenRouter streaming client error: {exc}",
                        attempts=attempt,
                        max_retries=self.config.max_retries,
                    ) from exc


class PromptBuilder:
    """Evidence-bound system prompts for the synthesis pipeline."""

    @staticmethod
    def system_prompt_for_paper_analysis() -> str:
        return """You are an evidence-bound research-paper analysis assistant.
Analyze ONLY the evidence supplied in the user-provided paper excerpts. Do not use
outside knowledge or unstated assumptions. NEVER invent or infer statistics,
citations, quotations, authors, or page numbers. Output ONLY valid JSON matching
the requested schema; do not include Markdown or explanatory prose outside that
JSON. Use the exact string \"Not reported\" for requested information absent from
the evidence. Label every finding as either PAPER_REPORTED (explicitly stated in
the evidence) or AI_INFERRED (a clearly marked, cautious inference). Label every
improvement as either EVIDENCE_SUPPORTED (supported by provided evidence) or
PROPOSED_FUTURE (a recommendation not yet evidenced). Do not silently average,
merge, or reconcile contradictory results: preserve each claim and identify the
contradiction. When the evidence cannot support a requested conclusion, state
\"Insufficient evidence\"."""

    @staticmethod
    def system_prompt_for_cross_analysis() -> str:
        return """You are an evidence-bound cross-paper comparison assistant.
Compare ONLY facts present in the supplied chunks. Identify common findings across
papers only when the provided evidence supports the comparison. Detect and report
contradictions carefully, preserving each paper's claim and context. A contextual
difference (for example a different population, intervention, measure, setting,
or time period) is NOT a contradiction unless the claims conflict under comparable
conditions. Cite every substantive claim with its paper_id, section, and page as
provided in the evidence. Do not invent citations, page numbers, missing details,
or conclusions."""

    @staticmethod
    def system_prompt_for_qa() -> str:
        return """You are an evidence-bound question-answering assistant.
Answer ONLY from the retrieved evidence supplied in this conversation. Cite every
piece of evidence used, including the available paper identifier, section, and
page. Do not supplement the answer with outside knowledge or assumptions. If the
retrieved evidence does not support the answer, reply exactly: \"Insufficient
evidence in the uploaded documents\"."""

    @staticmethod
    def system_prompt_for_verification() -> str:
        return """You are a claim verifier. Compare the stated claim only against
the retrieved evidence. Return a structured result whose verdict is exactly one
of SUPPORTED, PARTIALLY_SUPPORTED, UNSUPPORTED, or CONTRADICTED. Include a
confidence score from 0.0 to 1.0 and quote the exact passage that supports or
contradicts the claim. Do not use outside knowledge. If no passage is relevant,
use UNSUPPORTED and explain that the retrieved evidence is insufficient."""


class TokenManager:
    """Small, deterministic helpers for fitting evidence into an LLM context."""

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Estimate tokens using the conservative character-count divided by four rule."""
        if not text:
            return 0
        return math.ceil(len(text) / 4)

    @classmethod
    def split_for_context(
        cls,
        chunks: list[str],
        max_tokens: int = DEFAULT_CONTEXT_TOKENS,
    ) -> list[list[str]]:
        """Batch chunks so every resulting batch fits the configured token budget."""
        if max_tokens <= 0:
            raise ValueError("max_tokens must be greater than zero")

        batches: list[list[str]] = []
        current_batch: list[str] = []
        current_tokens = 0
        for chunk in chunks:
            for piece in cls._split_oversized_chunk(chunk, max_tokens):
                piece_tokens = cls.estimate_tokens(piece)
                if current_batch and current_tokens + piece_tokens > max_tokens:
                    batches.append(current_batch)
                    current_batch = []
                    current_tokens = 0
                current_batch.append(piece)
                current_tokens += piece_tokens
        if current_batch:
            batches.append(current_batch)
        return batches

    @classmethod
    def _split_oversized_chunk(cls, chunk: str, max_tokens: int) -> list[str]:
        if cls.estimate_tokens(chunk) <= max_tokens:
            return [chunk]

        max_characters = max_tokens * 4
        pieces: list[str] = []
        remaining = chunk
        while len(remaining) > max_characters:
            split_at = remaining.rfind(" ", 0, max_characters + 1)
            if split_at <= 0:
                split_at = max_characters
            pieces.append(remaining[:split_at].strip())
            remaining = remaining[split_at:].lstrip()
        if remaining:
            pieces.append(remaining)
        return pieces

    @staticmethod
    def build_context_string(chunks: list[dict[str, Any]]) -> str:
        """Render retrieved chunks in a stable, citation-friendly evidence format."""
        evidence_blocks: list[str] = ["--- EVIDENCE ---"]
        for chunk in chunks:
            title = chunk.get("title", chunk.get("paper_title", "Not reported"))
            section = chunk.get("section", "Not reported")
            page = chunk.get("page", "Not reported")
            content = chunk.get("content", chunk.get("text", "Not reported"))
            evidence_blocks.extend(
                [
                    f"[Paper: {title} | Section: {section} | Page: {page}]",
                    str(content),
                    "----------------",
                ]
            )
        return "\n".join(evidence_blocks)


class SchemaValidationError(ValueError):
    """Raised when a JSON response does not conform to its required schema."""


def _validate_json_schema(
    value: Any,
    schema: Mapping[str, Any],
    *,
    root_schema: Mapping[str, Any] | None = None,
    path: str = "$",
) -> None:
    """Validate the practical JSON Schema subset used by LLM response schemas."""
    root_schema = root_schema or schema
    reference = schema.get("$ref")
    if isinstance(reference, str):
        target = _resolve_local_reference(reference, root_schema)
        _validate_json_schema(value, target, root_schema=root_schema, path=path)
        return

    if "const" in schema and value != schema["const"]:
        raise SchemaValidationError(f"{path} must equal {schema['const']!r}.")
    if "enum" in schema and value not in schema["enum"]:
        raise SchemaValidationError(f"{path} must be one of {schema['enum']!r}.")

    for keyword, matcher in (("allOf", all), ("anyOf", any), ("oneOf", None)):
        alternatives = schema.get(keyword)
        if not isinstance(alternatives, list):
            continue
        valid_count = 0
        for alternative in alternatives:
            try:
                _validate_json_schema(value, alternative, root_schema=root_schema, path=path)
                valid_count += 1
            except SchemaValidationError:
                pass
        is_valid = valid_count == len(alternatives) if matcher is all else valid_count > 0
        if keyword == "oneOf":
            is_valid = valid_count == 1
        if not is_valid:
            raise SchemaValidationError(f"{path} does not satisfy schema keyword {keyword}.")

    if "not" in schema:
        try:
            _validate_json_schema(value, schema["not"], root_schema=root_schema, path=path)
        except SchemaValidationError:
            pass
        else:
            raise SchemaValidationError(f"{path} must not satisfy the 'not' schema.")

    expected_type = schema.get("type")
    if expected_type is not None:
        types = expected_type if isinstance(expected_type, list) else [expected_type]
        if not any(_matches_json_type(value, expected) for expected in types):
            raise SchemaValidationError(f"{path} must have type {expected_type!r}.")

    if isinstance(value, Mapping):
        _validate_object(value, schema, root_schema, path)
    elif isinstance(value, list):
        _validate_array(value, schema, root_schema, path)
    elif isinstance(value, str):
        _validate_string(value, schema, path)
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        _validate_number(value, schema, path)


def _resolve_local_reference(reference: str, root_schema: Mapping[str, Any]) -> Mapping[str, Any]:
    if not reference.startswith("#/"):
        raise SchemaValidationError(f"Only local JSON Schema references are supported: {reference}")
    target: Any = root_schema
    for part in reference[2:].split("/"):
        part = part.replace("~1", "/").replace("~0", "~")
        if not isinstance(target, Mapping) or part not in target:
            raise SchemaValidationError(f"Unable to resolve JSON Schema reference: {reference}")
        target = target[part]
    if not isinstance(target, Mapping):
        raise SchemaValidationError(f"JSON Schema reference is not an object: {reference}")
    return target


def _matches_json_type(value: Any, expected: Any) -> bool:
    return {
        "object": isinstance(value, Mapping),
        "array": isinstance(value, list),
        "string": isinstance(value, str),
        "number": isinstance(value, (int, float)) and not isinstance(value, bool),
        "integer": isinstance(value, int) and not isinstance(value, bool),
        "boolean": isinstance(value, bool),
        "null": value is None,
    }.get(expected, False)


def _validate_object(
    value: Mapping[str, Any],
    schema: Mapping[str, Any],
    root_schema: Mapping[str, Any],
    path: str,
) -> None:
    required = schema.get("required", [])
    if isinstance(required, list):
        for key in required:
            if key not in value:
                raise SchemaValidationError(f"{path} is missing required property {key!r}.")

    properties = schema.get("properties", {})
    properties = properties if isinstance(properties, Mapping) else {}
    pattern_properties = schema.get("patternProperties", {})
    pattern_properties = pattern_properties if isinstance(pattern_properties, Mapping) else {}
    additional = schema.get("additionalProperties", True)

    for key, item in value.items():
        item_path = f"{path}.{key}"
        property_schema = properties.get(key)
        if isinstance(property_schema, Mapping):
            _validate_json_schema(item, property_schema, root_schema=root_schema, path=item_path)
            continue

        matches = [
            candidate
            for pattern, candidate in pattern_properties.items()
            if isinstance(pattern, str) and isinstance(candidate, Mapping) and re.search(pattern, key)
        ]
        if matches:
            for candidate in matches:
                _validate_json_schema(item, candidate, root_schema=root_schema, path=item_path)
        elif additional is False:
            raise SchemaValidationError(f"{path} does not allow additional property {key!r}.")
        elif isinstance(additional, Mapping):
            _validate_json_schema(item, additional, root_schema=root_schema, path=item_path)


def _validate_array(
    value: list[Any],
    schema: Mapping[str, Any],
    root_schema: Mapping[str, Any],
    path: str,
) -> None:
    if "minItems" in schema and len(value) < schema["minItems"]:
        raise SchemaValidationError(f"{path} must contain at least {schema['minItems']} item(s).")
    if "maxItems" in schema and len(value) > schema["maxItems"]:
        raise SchemaValidationError(f"{path} must contain no more than {schema['maxItems']} item(s).")
    if schema.get("uniqueItems") and len({json.dumps(item, sort_keys=True) for item in value}) != len(value):
        raise SchemaValidationError(f"{path} must contain unique items.")

    items = schema.get("items")
    if isinstance(items, Mapping):
        for index, item in enumerate(value):
            _validate_json_schema(item, items, root_schema=root_schema, path=f"{path}[{index}]")
    elif isinstance(items, list):
        for index, item_schema in enumerate(items):
            if index >= len(value):
                break
            if isinstance(item_schema, Mapping):
                _validate_json_schema(
                    value[index], item_schema, root_schema=root_schema, path=f"{path}[{index}]"
                )


def _validate_string(value: str, schema: Mapping[str, Any], path: str) -> None:
    if "minLength" in schema and len(value) < schema["minLength"]:
        raise SchemaValidationError(f"{path} is shorter than {schema['minLength']} characters.")
    if "maxLength" in schema and len(value) > schema["maxLength"]:
        raise SchemaValidationError(f"{path} is longer than {schema['maxLength']} characters.")
    pattern = schema.get("pattern")
    if isinstance(pattern, str) and not re.search(pattern, value):
        raise SchemaValidationError(f"{path} does not match required pattern {pattern!r}.")


def _validate_number(value: int | float, schema: Mapping[str, Any], path: str) -> None:
    for keyword, predicate in (
        ("minimum", lambda number, bound: number < bound),
        ("maximum", lambda number, bound: number > bound),
        ("exclusiveMinimum", lambda number, bound: number <= bound),
        ("exclusiveMaximum", lambda number, bound: number >= bound),
    ):
        bound = schema.get(keyword)
        if isinstance(bound, (int, float)) and predicate(value, bound):
            raise SchemaValidationError(f"{path} violates {keyword} of {bound}.")
