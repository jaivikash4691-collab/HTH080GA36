"""LLM factory for creating provider-specific LLM clients with SSL and proxy resilience."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import socket
import ssl
import warnings
from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional

import certifi
import httpx
import urllib3

try:
    from ..config import Settings, settings
    from ..utils.llm_parser import LLMOutputParser, LLMParseError
    from .llm_service import LLMServiceError
except (ImportError, ValueError):
    import sys
    from pathlib import Path
    _pkg_root = str(Path(__file__).resolve().parent.parent.parent)
    if _pkg_root not in sys.path:
        sys.path.insert(0, _pkg_root)
    from app.config import Settings, settings
    from app.utils.llm_parser import LLMOutputParser, LLMParseError
    from app.services.llm_service import LLMServiceError

# Suppress only InsecureRequest warnings
# Do NOT suppress all warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

log = logging.getLogger(__name__)
logger = log


# ---------------------------------------------------------------------------
# Proxy Detection & Bypass Utilities
# ---------------------------------------------------------------------------

def detect_proxy_conflict() -> dict:
    """
    Detect explicitly configured HTTP/HTTPS proxy settings.

    Do not treat arbitrary applications listening on common ports such as
    8080 or 8082 as proxy conflicts.
    """
    cfg = settings

    configured_proxies = []

    if cfg.http_proxy:
        configured_proxies.append("HTTP_PROXY")

    if cfg.https_proxy:
        configured_proxies.append("HTTPS_PROXY")

    return {
        "conflict_detected": bool(configured_proxies),
        "conflicting_ports": [],
        "recommendation": (
            f"Configured proxy detected: {', '.join(configured_proxies)}"
            if configured_proxies
            else "No HTTP/HTTPS proxy configured"
        ),
    }


def apply_proxy_settings(config: Optional[Settings] = None) -> None:
    """Apply proxy bypass settings from configuration into process environment."""
    cfg = config or settings
    if cfg.no_proxy:
        os.environ["NO_PROXY"] = cfg.no_proxy
        os.environ["no_proxy"] = cfg.no_proxy
    if not cfg.http_proxy:
        os.environ.pop("HTTP_PROXY", None)
        os.environ.pop("http_proxy", None)
    if not cfg.https_proxy:
        os.environ.pop("HTTPS_PROXY", None)
        os.environ.pop("https_proxy", None)


# ---------------------------------------------------------------------------
# Model Registry
# ---------------------------------------------------------------------------

FREE_MODELS: Dict[str, str] = {
    "openrouter-free": "openrouter/free",
    "nemotron-super": "nvidia/nemotron-3-super-120b-a12b:free",
    "nemotron-ultra": "nvidia/nemotron-3-ultra-550b-a55b:free",
    "liquid-lfm": "liquid/lfm-2.5-2.6b:free",
    "dots-preview": "dots-studio/dots-3-note-preview:free",
    "gemma4-31b": "google/gemma-4-31b-it:free",
    "qwen3.8-27b": "qwen/qwen3.8-27b:free",
    "qwen3-32b": "qwen/qwen3-32b:free",
    "kimi-k3": "moonshotai/kimi-k3",
    "kimi-k2.6": "moonshotai/kimi-k2.6",
}

RECOMMENDED_MODEL: str = FREE_MODELS["kimi-k3"]


def get_fallback_models() -> List[str]:
    """Return fallback models in descending order of preference from settings.

    Returns:
        List of full model identifiers to try, in preference order.
    """
    try:
        from ..config import get_fallback_models as cfg_get_fallback_models
        return cfg_get_fallback_models()
    except (ImportError, ValueError):
        try:
            from app.config import get_fallback_models as cfg_get_fallback_models
            return cfg_get_fallback_models()
        except Exception:
            # Provider-specific fallbacks - no OpenRouter fallbacks
            return [
                "moonshotai/kimi-k2.6",
                "moonshotai/kimi-k3",
                "mistralai/mistral-large-2-instruct",
            ]



# ---------------------------------------------------------------------------
# Abstract Base LLM Client with SSL Resilience
# ---------------------------------------------------------------------------

class BaseLLMClient(ABC):
    """Abstract base class for all LLM provider clients."""

    def __init__(
        self,
        api_key: str,
        model: str,
        config: Optional[Settings] = None,
        **kwargs: Any,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.config = config or settings
        self.headers: Dict[str, str] = {}
        self.kwargs = kwargs

    async def safe_post(
        self,
        url: str,
        payload: dict,
        headers: Optional[Dict[str, str]] = None,
    ) -> dict:
        """
        POST with SSL retry fallback.
        Try 1: verify=certifi.where() (or custom cert file)
        Try 2: verify=False (with warning)
        Try 3: raise LLMServiceError
        """
        apply_proxy_settings(self.config)

        cert_target = (
            self.config.ssl_cert_file
            if (self.config.ssl_cert_file and os.path.exists(self.config.ssl_cert_file))
            else certifi.where()
        )

        attempts = []
        if getattr(self.config, "ssl_verify", True):
            attempts.append({"verify": cert_target, "label": "certifi"})
            attempts.append({"verify": False, "label": "no-verify (fallback)"})
        else:
            attempts.append({"verify": False, "label": "no-verify (configured)"})

        last_error = None
        req_headers = headers if headers is not None else self.headers

        for attempt in attempts:
            try:
                client = httpx.AsyncClient(
                    timeout=httpx.Timeout(self.config.llm_timeout),
                    verify=attempt["verify"],
                )
                async with client:
                    response = await client.post(
                        url,
                        headers=req_headers,
                        json=payload,
                    )
                    response.raise_for_status()
                    if attempt["label"] == "no-verify (fallback)":
                        log.warning(
                            "SSL verification failed with certifi. "
                            "Retrying with verification disabled. "
                            "WARNING: This is insecure. "
                            "Fix your SSL certificates for production."
                        )
                    return response.json()
            except (httpx.ConnectError, ssl.SSLError) as e:
                last_error = e
                log.warning("SSL attempt '%s' failed: %s", attempt["label"], e)
                continue
            except httpx.HTTPStatusError:
                # HTTP error from remote server (e.g., 401, 429, 500, 503)
                raise
            except Exception as e:
                if "SSL" in str(e) or "certificate" in str(e).lower() or "handshake" in str(e).lower():
                    last_error = e
                    log.warning("SSL attempt '%s' failed: %s", attempt["label"], e)
                    continue
                raise LLMServiceError(str(e)) from e

        raise LLMServiceError(
            f"All SSL attempts failed. Last error: {last_error}\n"
            "Possible causes:\n"
            "1. Corporate proxy/VPN intercepting requests\n"
            "2. Zscaler or antivirus SSL inspection\n"
            "3. Fiddler running on port 8080/8082\n"
            "Fix: Disable proxy, or switch LLM_PROVIDER=ollama"
        )

    @abstractmethod
    async def complete(self, messages: List[Dict[str, Any]], **kwargs: Any) -> str:
        """Send a chat completion request and return the response text."""
        ...

    @abstractmethod
    async def complete_json(
        self,
        messages: List[Dict[str, Any]],
        schema: Dict[str, Any],
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Complete a chat conversation and return a parsed JSON dict."""
        ...

    @abstractmethod
    async def stream(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        """Stream a chat completion, yielding text chunks."""
        ...

    @abstractmethod
    def get_model_name(self) -> str:
        """Return the model identifier string."""
        ...

    @abstractmethod
    def get_provider(self) -> str:
        """Return the provider name (e.g. "openrouter")."""
        ...


# ---------------------------------------------------------------------------
# OpenRouter Client
# ---------------------------------------------------------------------------

_OPENROUTER_BASE = "https://openrouter.ai/api/v1"
_OPENROUTER_HEADERS_COMMON = {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Research Synthesis Assistant",
    "Content-Type": "application/json",
}


class OpenRouterClient(BaseLLMClient):
    """LLM client backed by the OpenRouter API (OpenAI-compatible)."""

    def __init__(self, api_key: str, model: str, config: Optional[Settings] = None) -> None:
        super().__init__(api_key, model, config=config)
        cfg = self.config
        self.base_url = cfg.llm_base_url or _OPENROUTER_BASE
        self.headers: Dict[str, str] = {
            "Authorization": f"Bearer {api_key}",
            **_OPENROUTER_HEADERS_COMMON,
        }
        self.timeout = httpx.Timeout(cfg.llm_timeout)
        self.max_retries: int = cfg.llm_max_retries
        self._cfg = cfg

    async def complete(self, messages: List[Dict[str, Any]], **kwargs: Any) -> str:
        """Send a completion request and return the assistant message content with fallback support."""
        payload = self._build_payload(messages, **kwargs)
        return await self._make_request_with_retries(payload, allow_fallback=True)

    async def complete_json(
        self,
        messages: List[Dict[str, Any]],
        schema: Dict[str, Any],
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Complete a request and parse the response as JSON with fallback support."""
        json_reminder: Dict[str, str] = {
            "role": "system",
            "content": (
                "You MUST output ONLY valid JSON that conforms to the provided schema. "
                "Do not include any explanatory text, markdown, or code fences."
            ),
        }
        augmented = list(messages) + [json_reminder]
        supports_json_mode = ":free" not in self.model.lower()

        payload = self._build_payload(augmented, **kwargs)
        if supports_json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            response_text = await self._make_request_with_retries(payload, allow_fallback=True)
            return LLMOutputParser.parse_json(response_text)
        except (LLMParseError, LLMServiceError):
            plain_payload = self._build_payload(augmented, **kwargs)
            response_text = await self._make_request_with_retries(plain_payload, allow_fallback=True)
            return LLMOutputParser.parse_json(response_text)

    async def stream(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        """Yield text chunks from a streaming completion with SSL resilience."""
        payload = self._build_payload(messages)
        payload["stream"] = True
        apply_proxy_settings(self._cfg)

        cert_target = (
            self._cfg.ssl_cert_file
            if (self._cfg.ssl_cert_file and os.path.exists(self._cfg.ssl_cert_file))
            else certifi.where()
        )
        verify_attempts = [cert_target, False] if getattr(self._cfg, "ssl_verify", True) else [False]

        last_stream_err = None
        for verify_val in verify_attempts:
            try:
                async with httpx.AsyncClient(timeout=self.timeout, verify=verify_val) as client:
                    async with client.stream(
                        "POST",
                        f"{self.base_url}/chat/completions",
                        headers=self.headers,
                        json=payload,
                    ) as response:
                        if response.status_code != 200:
                            body = await response.aread()
                            raise LLMServiceError(
                                f"OpenRouter stream error {response.status_code}: {body.decode()}"
                            )
                        async for line in response.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            data = line[6:]
                            if data.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                            except json.JSONDecodeError:
                                continue
                return
            except (httpx.ConnectError, ssl.SSLError) as exc:
                last_stream_err = exc
                log.warning("OpenRouter stream SSL failure with verify=%s: %s", verify_val, exc)
                continue
            except Exception as exc:
                if "SSL" in str(exc) or "certificate" in str(exc).lower():
                    last_stream_err = exc
                    log.warning("OpenRouter stream SSL failure with verify=%s: %s", verify_val, exc)
                    continue
                raise LLMServiceError(f"OpenRouter stream error: {exc}") from exc

        if last_stream_err:
            raise LLMServiceError(f"OpenRouter stream failed across all SSL attempts: {last_stream_err}")

    def get_model_name(self) -> str:
        return self.model

    def get_provider(self) -> str:
        return "openrouter"

    def _build_payload(
        self, messages: List[Dict[str, Any]], **kwargs: Any
    ) -> Dict[str, Any]:
        """Construct the base request payload."""
        return {
            "model": kwargs.pop("model", self.model),
            "messages": messages,
            "temperature": kwargs.pop("temperature", self._cfg.llm_temperature),
            "max_tokens": kwargs.pop("max_tokens", self._cfg.llm_max_tokens),
            **kwargs,
        }

    async def _make_request_with_retries(
        self, payload: Dict[str, Any], allow_fallback: bool = True
    ) -> str:
        """POST payload with SSL fallback, retries, and fallback model chain."""
        url = f"{self.base_url}/chat/completions"
        primary_model = payload.get("model", self.model)
        last_error: Optional[Exception] = None

        for attempt in range(self.max_retries + 1):
            try:
                result = await self.safe_post(url, payload=payload, headers=self.headers)
                msg = result["choices"][0]["message"]
                content = msg.get("content") or msg.get("reasoning") or ""
                return content

            except httpx.HTTPStatusError as err:
                last_error = err
                status = err.response.status_code

                if status == 404:
                    log.warning(
                        "Primary model '%s' unavailable (HTTP 404: %s).",
                        primary_model,
                        err.response.text[:120],
                    )
                    break  # Break retry loop to trigger fallback models

                if status == 429:
                    if attempt < self.max_retries:
                        wait = 5 * (2 ** attempt)
                        log.warning("Rate-limited (429) on '%s'. Retrying in %ds (attempt %d).", primary_model, wait, attempt + 1)
                        await asyncio.sleep(wait)
                        continue
                    log.warning("Rate limit exceeded for '%s' after %d retries.", primary_model, self.max_retries)
                    break

                if status in (500, 502, 503, 504):
                    if attempt < self.max_retries:
                        wait = 2 ** attempt
                        log.warning("Server error %d on '%s'. Retrying in %ds.", status, primary_model, wait)
                        await asyncio.sleep(wait)
                        continue
                    log.warning("Server error %d for '%s' after %d retries.", status, primary_model, self.max_retries)
                    break

                raise LLMServiceError(f"API error {status}: {err.response.text}", status_code=status) from err

            except httpx.TimeoutException as err:
                last_error = err
                if attempt < self.max_retries:
                    log.warning("Request timed out for '%s'. Retrying (attempt %d).", primary_model, attempt + 1)
                    continue
                log.warning("Request timed out for '%s' after %d retries.", primary_model, self.max_retries)
                break

            except Exception as err:
                last_error = err
                log.warning("Request error on model '%s': %s", primary_model, err)
                break

        # If primary failed, iterate through fallback models
        if allow_fallback:
            fallback_models = get_fallback_models()
            for fb_model in fallback_models:
                if fb_model == primary_model:
                    continue
                try:
                    log.info("Attempting fallback model: '%s' (primary '%s' failed)...", fb_model, primary_model)
                    fb_payload = dict(payload)
                    fb_payload["model"] = fb_model
                    result = await self.safe_post(url, payload=fb_payload, headers=self.headers)
                    msg = result["choices"][0]["message"]
                    content = msg.get("content") or msg.get("reasoning") or ""
                    log.info("Fallback model '%s' succeeded!", fb_model)
                    return content
                except Exception as fb_err:
                    log.warning("Fallback model '%s' failed: %s", fb_model, fb_err)
                    continue

        status_code = getattr(getattr(last_error, "response", None), "status_code", None)
        raise LLMServiceError(
            f"LLM request failed for model '{primary_model}' and all fallback models failed. Last error: {last_error}",
            status_code=status_code,
        )



# ---------------------------------------------------------------------------
# OpenAI Client (Optional Fallback)
# ---------------------------------------------------------------------------

class OpenAIClient(BaseLLMClient):
    """LLM client for the official OpenAI API."""

    def __init__(self, api_key: str, model: str, config: Optional[Settings] = None) -> None:
        super().__init__(api_key, model, config=config)
        cfg = self.config
        self.base_url = cfg.llm_base_url if (cfg.llm_base_url and "openrouter.ai" not in cfg.llm_base_url) else "https://api.openai.com/v1"
        self.headers: Dict[str, str] = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        self.timeout = httpx.Timeout(cfg.llm_timeout)
        self.max_retries: int = cfg.llm_max_retries
        self._cfg = cfg

    def _build_payload(
        self, messages: List[Dict[str, Any]], **kwargs: Any
    ) -> Dict[str, Any]:
        return {
            "model": self.model,
            "messages": messages,
            "temperature": kwargs.pop("temperature", self._cfg.llm_temperature),
            "max_tokens": kwargs.pop("max_tokens", self._cfg.llm_max_tokens),
            **kwargs,
        }

    async def _post(self, payload: Dict[str, Any]) -> str:
        url = f"{self.base_url}/chat/completions"
        for attempt in range(self.max_retries + 1):
            try:
                data = await self.safe_post(url, payload=payload, headers=self.headers)
                return data["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as err:
                status = err.response.status_code
                if status == 429 and attempt < self.max_retries:
                    await asyncio.sleep(5 * (2 ** attempt))
                    continue
                if status >= 500 and attempt < self.max_retries:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise LLMServiceError(f"OpenAI API error {status}: {err.response.text}", status_code=status) from err
            except httpx.TimeoutException:
                if attempt < self.max_retries:
                    continue
                raise LLMServiceError("OpenAI request timed out")
        raise LLMServiceError("OpenAI request failed after retries")

    async def complete(self, messages: List[Dict[str, Any]], **kwargs: Any) -> str:
        return await self._post(self._build_payload(messages, **kwargs))

    async def complete_json(
        self,
        messages: List[Dict[str, Any]],
        schema: Dict[str, Any],
        **kwargs: Any,
    ) -> Dict[str, Any]:
        payload = self._build_payload(messages, **kwargs)
        payload["response_format"] = {"type": "json_object"}
        text = await self._post(payload)
        return LLMOutputParser.parse_json(text)

    async def stream(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        payload = self._build_payload(messages)
        payload["stream"] = True
        apply_proxy_settings(self._cfg)
        cert_target = (
            self._cfg.ssl_cert_file
            if (self._cfg.ssl_cert_file and os.path.exists(self._cfg.ssl_cert_file))
            else certifi.where()
        )
        verify_attempts = [cert_target, False] if getattr(self._cfg, "ssl_verify", True) else [False]

        for verify_val in verify_attempts:
            try:
                async with httpx.AsyncClient(timeout=self.timeout, verify=verify_val) as client:
                    async with client.stream(
                        "POST",
                        f"{self.base_url}/chat/completions",
                        headers=self.headers,
                        json=payload,
                    ) as response:
                        if response.status_code != 200:
                            body = await response.aread()
                            raise LLMServiceError(f"OpenAI stream error {response.status_code}: {body.decode()}")
                        async for line in response.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            data = line[6:]
                            if data.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                            except json.JSONDecodeError:
                                continue
                return
            except Exception as exc:
                if "SSL" in str(exc) or "certificate" in str(exc).lower():
                    log.warning("OpenAI stream SSL retry: %s", exc)
                    continue
                raise LLMServiceError(f"OpenAI streaming error: {exc}") from exc

    def get_model_name(self) -> str:
        return self.model

    def get_provider(self) -> str:
        return "openai"


# ---------------------------------------------------------------------------
# Anthropic Client (Optional Fallback)
# ---------------------------------------------------------------------------

class AnthropicClient(BaseLLMClient):
    """LLM client for the Anthropic Messages API."""

    _API_URL = "https://api.anthropic.com/v1/messages"
    _API_VERSION = "2023-06-01"

    def __init__(self, api_key: str, model: str, config: Optional[Settings] = None) -> None:
        super().__init__(api_key, model, config=config)
        cfg = self.config
        self.headers: Dict[str, str] = {
            "x-api-key": api_key,
            "anthropic-version": self._API_VERSION,
            "content-type": "application/json",
        }
        self.timeout = httpx.Timeout(cfg.llm_timeout)
        self.max_retries: int = cfg.llm_max_retries
        self._cfg = cfg

    @staticmethod
    def _split_messages(messages: List[Dict[str, Any]]) -> tuple:
        """Separate system prompt from chat messages (Anthropic API format)."""
        system_parts: List[str] = []
        chat: List[Dict[str, Any]] = []
        for m in messages:
            if m.get("role") == "system":
                system_parts.append(str(m["content"]))
            else:
                chat.append(m)
        system = "\n\n".join(system_parts) if system_parts else None
        return system, chat

    def _build_payload(
        self, messages: List[Dict[str, Any]], **kwargs: Any
    ) -> Dict[str, Any]:
        system, chat = self._split_messages(messages)
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": chat,
            "max_tokens": kwargs.pop("max_tokens", self._cfg.llm_max_tokens),
            "temperature": kwargs.pop("temperature", self._cfg.llm_temperature),
            **kwargs,
        }
        if system:
            payload["system"] = system
        return payload

    async def _post(self, payload: Dict[str, Any]) -> str:
        for attempt in range(self.max_retries + 1):
            try:
                data = await self.safe_post(self._API_URL, payload=payload, headers=self.headers)
                return data["content"][0]["text"]
            except httpx.HTTPStatusError as err:
                status = err.response.status_code
                if status == 429 and attempt < self.max_retries:
                    await asyncio.sleep(5 * (2 ** attempt))
                    continue
                if status == 529 and attempt < self.max_retries:  # Anthropic overloaded
                    await asyncio.sleep(10 * (2 ** attempt))
                    continue
                if status >= 500 and attempt < self.max_retries:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise LLMServiceError(f"Anthropic API error {status}: {err.response.text}", status_code=status) from err
            except httpx.TimeoutException:
                if attempt < self.max_retries:
                    continue
                raise LLMServiceError("Anthropic request timed out")
        raise LLMServiceError("Anthropic request failed after retries")

    async def complete(self, messages: List[Dict[str, Any]], **kwargs: Any) -> str:
        return await self._post(self._build_payload(messages, **kwargs))

    async def complete_json(
        self,
        messages: List[Dict[str, Any]],
        schema: Dict[str, Any],
        **kwargs: Any,
    ) -> Dict[str, Any]:
        reminder = {"role": "user", "content": "Respond with ONLY valid JSON, no other text."}
        augmented = list(messages) + [reminder]
        text = await self._post(self._build_payload(augmented, **kwargs))
        return LLMOutputParser.parse_json(text)

    async def stream(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        payload = self._build_payload(messages)
        payload["stream"] = True
        apply_proxy_settings(self._cfg)
        cert_target = (
            self._cfg.ssl_cert_file
            if (self._cfg.ssl_cert_file and os.path.exists(self._cfg.ssl_cert_file))
            else certifi.where()
        )
        verify_attempts = [cert_target, False] if getattr(self._cfg, "ssl_verify", True) else [False]

        for verify_val in verify_attempts:
            try:
                async with httpx.AsyncClient(timeout=self.timeout, verify=verify_val) as client:
                    async with client.stream(
                        "POST",
                        self._API_URL,
                        headers=self.headers,
                        json=payload,
                    ) as response:
                        if response.status_code != 200:
                            body = await response.aread()
                            raise LLMServiceError(f"Anthropic stream error {response.status_code}: {body.decode()}")
                        async for line in response.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            data = line[6:]
                            try:
                                event = json.loads(data)
                                if event.get("type") == "content_block_delta":
                                    delta = event.get("delta", {})
                                    if delta.get("type") == "text_delta":
                                        yield delta.get("text", "")
                            except json.JSONDecodeError:
                                continue
                return
            except Exception as exc:
                if "SSL" in str(exc) or "certificate" in str(exc).lower():
                    log.warning("Anthropic stream SSL retry: %s", exc)
                    continue
                raise LLMServiceError(f"Anthropic stream error: {exc}") from exc

    def get_model_name(self) -> str:
        return self.model

    def get_provider(self) -> str:
        return "anthropic"


# ---------------------------------------------------------------------------
# Ollama Client (Local Fallback)
# ---------------------------------------------------------------------------

class OllamaClient(BaseLLMClient):
    """LLM client for local Ollama instance (OpenAI-compatible /v1 endpoints)."""

    def __init__(
        self,
        api_key: str = "ollama",
        model: str = "deepseek-r1:7b",
        config: Optional[Settings] = None,
    ) -> None:
        super().__init__(api_key, model, config=config)
        cfg = self.config
        self.base_url = (
            cfg.llm_base_url
            if (cfg.llm_base_url and "openrouter.ai" not in cfg.llm_base_url)
            else "http://localhost:11434/v1"
        )
        self.headers: Dict[str, str] = {
            "Content-Type": "application/json",
        }
        self.timeout = httpx.Timeout(cfg.llm_timeout)
        self.max_retries: int = cfg.llm_max_retries
        self._cfg = cfg

    def _build_payload(
        self, messages: List[Dict[str, Any]], **kwargs: Any
    ) -> Dict[str, Any]:
        return {
            "model": self.model,
            "messages": messages,
            "temperature": kwargs.pop("temperature", self._cfg.llm_temperature),
            "max_tokens": kwargs.pop("max_tokens", self._cfg.llm_max_tokens),
            **kwargs,
        }

    async def _post(self, payload: Dict[str, Any]) -> str:
        url = f"{self.base_url}/chat/completions"
        for attempt in range(self.max_retries + 1):
            try:
                data = await self.safe_post(url, payload=payload, headers=self.headers)
                return data["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as err:
                status = err.response.status_code
                if attempt < self.max_retries and status >= 500:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise LLMServiceError(f"Ollama API error {status}: {err.response.text}", status_code=status) from err
            except httpx.TimeoutException:
                if attempt < self.max_retries:
                    continue
                raise LLMServiceError("Ollama request timed out")
        raise LLMServiceError("Ollama request failed after retries")

    async def complete(self, messages: List[Dict[str, Any]], **kwargs: Any) -> str:
        return await self._post(self._build_payload(messages, **kwargs))

    async def complete_json(
        self,
        messages: List[Dict[str, Any]],
        schema: Dict[str, Any],
        **kwargs: Any,
    ) -> Dict[str, Any]:
        reminder = {"role": "system", "content": "You MUST output ONLY valid JSON that conforms to the schema."}
        augmented = [reminder] + list(messages)
        payload = self._build_payload(augmented, **kwargs)
        payload["response_format"] = {"type": "json_object"}
        try:
            text = await self._post(payload)
            return LLMOutputParser.parse_json(text)
        except Exception:
            plain_payload = self._build_payload(augmented, **kwargs)
            text = await self._post(plain_payload)
            return LLMOutputParser.parse_json(text)

    async def stream(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        payload = self._build_payload(messages)
        payload["stream"] = True
        apply_proxy_settings(self._cfg)
        async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    raise LLMServiceError(f"Ollama stream error {response.status_code}: {body.decode()}")
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:]
                    if data.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        if "content" in delta:
                            yield delta["content"]
                    except json.JSONDecodeError:
                        continue

    def get_model_name(self) -> str:
        return self.model

    def get_provider(self) -> str:
        return "ollama"


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# NVIDIA NIM Client (OpenAI-compatible)
# ---------------------------------------------------------------------------

class NvidiaNimClient(BaseLLMClient):
    """LLM client for NVIDIA NIM API with model fallback and SSL resilience."""

    def __init__(
        self,
        api_key: str,
        model: str = "moonshotai/kimi-k3",
        config: Optional[Settings] = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(api_key, model, config=config, **kwargs)
        cfg = self.config
        base_url = (
            getattr(cfg, "nvidia_nim_base_url", None)
            or (cfg.llm_base_url if (cfg.llm_base_url and "openrouter.ai" not in cfg.llm_base_url) else None)
            or "https://integrate.api.nvidia.com/v1"
        )
        self.base_url = base_url.rstrip("/")
        self.headers: Dict[str, str] = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self.timeout = httpx.Timeout(cfg.llm_timeout)
        self.max_retries: int = cfg.llm_max_retries
        self._cfg = cfg

    def _build_payload(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        return {
            "model": model or self.model,
            "messages": messages,
            "max_tokens": kwargs.pop("max_tokens", self._cfg.llm_max_tokens),
            "temperature": kwargs.pop("temperature", self._cfg.llm_temperature),
            **kwargs,
        }

    async def _make_request_with_retries(
        self,
        payload: Dict[str, Any],
        allow_fallback: bool = True,
    ) -> str:
        models_to_try = [payload.get("model") or self.model]
        if allow_fallback:
            for fb in get_fallback_models():
                if fb not in models_to_try:
                    models_to_try.append(fb)

        last_error: Optional[Exception] = None

        for current_model in models_to_try:
            current_payload = dict(payload)
            current_payload["model"] = current_model

            for attempt in range(self.max_retries + 1):
                try:
                    log.debug("NvidiaNimClient request: model=%s attempt=%d", current_model, attempt + 1)
                    data = await self.safe_post(
                        f"{self.base_url}/chat/completions",
                        payload=current_payload,
                        headers=self.headers,
                    )
                    content = data.get("choices", [{}])[0].get("message", {}).get("content")
                    if content is not None:
                        return str(content)
                    raise LLMServiceError("Malformed response from NVIDIA NIM: choice content missing")
                except httpx.HTTPStatusError as err:
                    code = err.response.status_code
                    err_body = err.response.text
                    log.warning(
                        "NVIDIA NIM attempt %d/%d failed (status=%d): %s",
                        attempt + 1, self.max_retries + 1, code, err_body[:200],
                    )
                    if code in (404, 400, 401, 403) and allow_fallback:
                        log.warning("NVIDIA NIM model '%s' unavailable/error (HTTP %d). Trying fallback model.", current_model, code)
                        last_error = LLMServiceError(f"NVIDIA NIM API error {code}: {err_body}", status_code=code)
                        break  # Try next model
                    if code == 429 and attempt < self.max_retries:
                        await asyncio.sleep(min(2 ** attempt * 2, 30))
                        continue
                    if code >= 500 and attempt < self.max_retries:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    if allow_fallback and attempt == self.max_retries:
                        last_error = LLMServiceError(f"NVIDIA NIM API error {code}: {err_body}", status_code=code)
                        break
                    raise LLMServiceError(f"NVIDIA NIM API error {code}: {err_body}", status_code=code) from err
                except httpx.TimeoutException as exc:
                    log.warning("NVIDIA NIM request timed out on attempt %d/%d for model %s", attempt + 1, self.max_retries + 1, current_model)
                    if attempt < self.max_retries:
                        await asyncio.sleep(1)
                        continue
                    last_error = LLMServiceError(f"NVIDIA NIM request timed out for model {current_model}")
                    if allow_fallback:
                        break
                    raise last_error from exc
                except Exception as exc:
                    log.warning("NVIDIA NIM unexpected error: %s", exc)
                    last_error = exc
                    if attempt < self.max_retries:
                        continue
                    if allow_fallback:
                        break
                    raise LLMServiceError(f"NVIDIA NIM failed: {exc}") from exc

        if last_error:
            raise LLMServiceError(f"NVIDIA NIM all models failed. Last error: {last_error}")
        raise LLMServiceError("NVIDIA NIM request failed without response")

    async def complete(self, messages: List[Dict[str, Any]], **kwargs: Any) -> str:
        # The 'messages' parameter actually receives the full payload dict
        # from LLMService._payload() which already has the correct structure:
        # {"model", "messages" (list), "temperature", "max_tokens"}
        # Use it directly rather than re-building via _build_payload,
        # which would nest messages inside another "messages" key.
        payload = dict(messages)
        # Ensure model is set
        if "model" not in payload:
            payload["model"] = self.model
        return await self._make_request_with_retries(payload, allow_fallback=True)

    async def complete_json(
        self,
        messages: List[Dict[str, Any]],
        schema: Dict[str, Any],
        **kwargs: Any,
    ) -> Dict[str, Any]:
        schema_instruction = (
            "\n\nCRITICAL INSTRUCTION: You must respond ONLY with a valid JSON object. "
            "Do not include markdown code blocks, backticks, or any other explanatory text. "
            f"Adhere strictly to this schema:\n{json.dumps(schema, indent=2)}"
        )
        augmented = list(messages)
        augmented.append({"role": "user", "content": schema_instruction})

        payload = self._build_payload(augmented, **kwargs)
        payload["response_format"] = {"type": "json_object"}
        try:
            text = await self._make_request_with_retries(payload, allow_fallback=True)
            return LLMOutputParser.parse_json(text)
        except Exception:
            payload.pop("response_format", None)
            text = await self._make_request_with_retries(payload, allow_fallback=True)
            return LLMOutputParser.parse_json(text)

    async def stream(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        # The 'messages' parameter receives the full payload dict from
        # LLMService._payload() which already has the correct structure.
        # Use it directly rather than re-building via _build_payload.
        payload = dict(messages)
        payload["stream"] = True
        apply_proxy_settings(self._cfg)
        cert_target = (
            self._cfg.ssl_cert_file
            if (self._cfg.ssl_cert_file and os.path.exists(self._cfg.ssl_cert_file))
            else certifi.where()
        )
        verify_attempts = [cert_target, False] if getattr(self._cfg, "ssl_verify", True) else [False]
        for verify_val in verify_attempts:
            try:
                async with httpx.AsyncClient(timeout=self.timeout, verify=verify_val) as client:
                    async with client.stream(
                        "POST",
                        f"{self.base_url}/chat/completions",
                        headers=self.headers,
                        json=payload,
                    ) as response:
                        if response.status_code != 200:
                            body = await response.aread()
                            raise LLMServiceError(f"NVIDIA NIM stream error {response.status_code}: {body.decode()}")
                        async for line in response.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            data = line[6:]
                            if data.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                            except json.JSONDecodeError:
                                continue
                return
            except Exception as exc:
                if "SSL" in str(exc) or "certificate" in str(exc).lower():
                    log.warning("NVIDIA NIM stream SSL retry: %s", exc)
                    continue
                raise LLMServiceError(f"NVIDIA NIM streaming error: {exc}") from exc

    def get_model_name(self) -> str:
        return self.model

    def get_provider(self) -> str:
        return "nvidia_nim"


# ---------------------------------------------------------------------------
# DeepSeek Client (OpenAI-compatible)
# ---------------------------------------------------------------------------

class DeepSeekClient(OpenAIClient):
    """LLM client for direct DeepSeek API access."""

    def __init__(self, api_key: str, model: str = "deepseek-chat", config: Optional[Settings] = None) -> None:
        super().__init__(api_key, model, config=config)
        cfg = self.config
        self.base_url = cfg.llm_base_url if (cfg.llm_base_url and "openrouter.ai" not in cfg.llm_base_url) else "https://api.deepseek.com/v1"

    def get_provider(self) -> str:
        return "deepseek"


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

class LLMFactory:
    """Creates the appropriate LLM client from a Settings object."""

    @staticmethod
    def create(config: Settings) -> BaseLLMClient:
        """Instantiate and return the correct LLM client.

        Args:
            config: Application settings instance.

        Returns:
            A fully configured BaseLLMClient subclass.
        """
        apply_proxy_settings(config)
        provider = config.llm_provider.lower()
        model = config.llm_model

        if provider in ("nvidia_nim", "nvidia"):
            api_key = config.nvidia_nim_api_key or os.environ.get("NVIDIA_NIM_API_KEY", "")
            log.info("Creating NvidiaNimClient | model=%s", model)
            return NvidiaNimClient(api_key=api_key, model=model, config=config)

        if provider == "openrouter":
            log.info("Creating OpenRouterClient | model=%s", model)
            return OpenRouterClient(api_key=config.openrouter_api_key, model=model, config=config)

        if provider == "openai":
            log.info("Creating OpenAIClient | model=%s", model)
            return OpenAIClient(api_key=config.openai_api_key, model=model, config=config)

        if provider == "anthropic":
            log.info("Creating AnthropicClient | model=%s", model)
            return AnthropicClient(api_key=config.anthropic_api_key, model=model, config=config)

        if provider == "ollama":
            log.info("Creating OllamaClient | model=%s", model)
            return OllamaClient(api_key="ollama", model=model, config=config)

        if provider == "deepseek":
            log.info("Creating DeepSeekClient | model=%s", model)
            return DeepSeekClient(api_key=config.openrouter_api_key, model=model, config=config)

        raise ValueError(
            f"Unsupported LLM provider: '{provider}'. "
            "Supported providers: nvidia_nim, openrouter, openai, anthropic, ollama, deepseek."
        )

    @staticmethod
    def create_client() -> BaseLLMClient:
        """Convenience wrapper: create a client from the global settings singleton."""
        return LLMFactory.create(settings)

    # ------------------------------------------------------------------
    # Model health-check helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def check_model_availability(model: str, api_key: str) -> bool:
        """Send a minimal test request to verify a model is live with SSL fallback."""
        if not api_key:
            log.debug("check_model_availability: no API key, returning False.")
            return False

        headers = {
            "Authorization": f"Bearer {api_key}",
            **_OPENROUTER_HEADERS_COMMON,
        }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 1,
            "temperature": 0,
        }

        apply_proxy_settings(settings)
        cert_target = (
            settings.ssl_cert_file
            if (settings.ssl_cert_file and os.path.exists(settings.ssl_cert_file))
            else certifi.where()
        )
        verify_attempts = [cert_target, False] if getattr(settings, "ssl_verify", True) else [False]

        for verify_val in verify_attempts:
            try:
                client = httpx.AsyncClient(timeout=httpx.Timeout(15.0), verify=verify_val)
                async with client:
                    response = await client.post(
                        f"{_OPENROUTER_BASE}/chat/completions",
                        headers=headers,
                        json=payload,
                    )
                available = response.status_code == 200
                log.debug(
                    "check_model_availability: model=%s status=%d available=%s",
                    model, response.status_code, available,
                )
                return available
            except Exception as exc:
                log.debug("check_model_availability attempt verify=%s model=%s exc=%s", verify_val, model, exc)
                continue
        return False

    @staticmethod
    async def get_available_model(preferred: str, api_key: str) -> str:
        """Return the first responsive model from preferred then fallbacks."""
        if await LLMFactory.check_model_availability(preferred, api_key):
            log.info("Model selected: %s (preferred)", preferred)
            return preferred

        log.warning("Preferred model '%s' unavailable. Trying fallbacks.", preferred)
        for fallback in get_fallback_models():
            if fallback == preferred:
                continue
            if await LLMFactory.check_model_availability(fallback, api_key):
                log.info("Model selected: %s (fallback)", fallback)
                return fallback

        log.error("No available model found. Defaulting to preferred model '%s'.", preferred)
        return preferred


# ---------------------------------------------------------------------------
# Fallback helper with Ollama Support
# ---------------------------------------------------------------------------

async def create_with_fallback(config: Settings) -> BaseLLMClient:
    """
    Try primary provider.
    If SSL error detected, fall back to Ollama if available.
    """
    primary = LLMFactory.create(config)

    # Test primary
    try:
        await primary.complete([
            {"role": "user", "content": "ping"}
        ])
        return primary
    except Exception as e:
        err_msg = str(e).lower()
        if "ssl" in err_msg or "certificate" in err_msg or "handshake" in err_msg or "connecterror" in err_msg:
            log.warning(
                "Primary LLM provider failed with SSL/connection error. "
                "Attempting Ollama fallback..."
            )
            # Check if Ollama is running
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1.0)
            ollama_available = sock.connect_ex(("localhost", 11434)) == 0
            sock.close()

            if ollama_available:
                log.info("Ollama detected on port 11434. Switching to Ollama fallback.")
                fallback_config = config.model_copy(update={
                    "llm_provider": "ollama",
                    "llm_model": "deepseek-r1:7b",
                    "llm_base_url": "http://localhost:11434/v1",
                })
                return OllamaClient(api_key="ollama", model="deepseek-r1:7b", config=fallback_config)
            else:
                raise LLMServiceError(
                    "Primary provider SSL error and "
                    "Ollama fallback not available.\n"
                    "Solutions:\n"
                    "1. Install Ollama: https://ollama.com\n"
                    "2. Run: ollama pull deepseek-r1:7b\n"
                    "3. Run: ollama serve\n"
                    "4. Or fix SSL certificates"
                ) from e
        raise


if __name__ == "__main__":
    print("LLM Factory loaded successfully")
    print(f"Recommended model : {RECOMMENDED_MODEL}")
    print(f"Fallback order    : {get_fallback_models()}")
    print(f"Proxy check       : {detect_proxy_conflict()}")