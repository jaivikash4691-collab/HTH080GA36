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
    Detect if a local proxy or inference gateway is running
    that could intercept LLM API requests.
    Check common ports: 8080, 8082, 8888, 3128
    Return a dict with:
    {
        "conflict_detected": bool,
        "conflicting_ports": list[int],
        "recommendation": str
    }
    """
    common_proxy_ports = [8080, 8082, 8888, 3128]
    conflicting = []
    for port in common_proxy_ports:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            result = sock.connect_ex(("localhost", port))
            if result == 0:
                conflicting.append(port)
            sock.close()
        except Exception:
            pass
    return {
        "conflict_detected": len(conflicting) > 0,
        "conflicting_ports": conflicting,
        "recommendation": (
            "Kill processes on these ports or set NO_PROXY in .env"
            if conflicting else "No conflict detected"
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
    "qwen3-32b": "qwen/qwen3-32b:free",
    "qwen3-235b": "qwen/qwen3-235b-a22b:free",
    "qwen3-8b": "qwen/qwen3-8b:free",
    "deepseek-r1": "deepseek/deepseek-r1:free",
    "gemma3-27b": "google/gemma-3-27b-it:free",
    "llama4-scout": "meta-llama/llama-4-scout:free",
}

RECOMMENDED_MODEL: str = FREE_MODELS["qwen3-32b"]


def get_fallback_models() -> List[str]:
    """Return OpenRouter free models in descending order of preference.

    Returns:
        List of full model identifiers to try, in preference order.
    """
    return [
        FREE_MODELS["qwen3-32b"],
        FREE_MODELS["deepseek-r1"],
        FREE_MODELS["gemma3-27b"],
        FREE_MODELS["llama4-scout"],
        FREE_MODELS["qwen3-235b"],
        FREE_MODELS["qwen3-8b"],
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
        """Send a completion request and return the assistant message content."""
        payload = self._build_payload(messages, **kwargs)
        return await self._make_request_with_retries(payload)

    async def complete_json(
        self,
        messages: List[Dict[str, Any]],
        schema: Dict[str, Any],
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Complete a request and parse the response as JSON."""
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
            response_text = await self._make_request_with_retries(payload)
            return LLMOutputParser.parse_json(response_text)
        except (LLMParseError, LLMServiceError):
            plain_payload = self._build_payload(augmented, **kwargs)
            response_text = await self._make_request_with_retries(plain_payload)
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
            "model": self.model,
            "messages": messages,
            "temperature": kwargs.pop("temperature", self._cfg.llm_temperature),
            "max_tokens": kwargs.pop("max_tokens", self._cfg.llm_max_tokens),
            **kwargs,
        }

    async def _make_request_with_retries(self, payload: Dict[str, Any]) -> str:
        """POST payload with SSL fallback and retry policy."""
        url = f"{self.base_url}/chat/completions"
        for attempt in range(self.max_retries + 1):
            try:
                result = await self.safe_post(url, payload=payload, headers=self.headers)
                return result["choices"][0]["message"]["content"]

            except httpx.HTTPStatusError as err:
                status = err.response.status_code
                if status == 429:
                    if attempt < self.max_retries:
                        wait = 5 * (2 ** attempt)
                        log.warning("Rate-limited (429). Retrying in %ds (attempt %d).", wait, attempt + 1)
                        await asyncio.sleep(wait)
                        continue
                    raise LLMServiceError(
                        f"Rate limit exceeded after {self.max_retries} retries", status_code=429
                    ) from err

                if status == 503:
                    if attempt < self.max_retries:
                        wait = 10 * (2 ** attempt)
                        log.warning("Service unavailable (503). Retrying in %ds (attempt %d).", wait, attempt + 1)
                        await asyncio.sleep(wait)
                        continue
                    raise LLMServiceError(
                        f"Service unavailable after {self.max_retries} retries", status_code=503
                    ) from err

                if status >= 500:
                    if attempt < self.max_retries:
                        wait = 2 ** attempt
                        log.warning("Server error %d. Retrying in %ds.", status, wait)
                        await asyncio.sleep(wait)
                        continue
                    raise LLMServiceError(
                        f"Server error {status} after {self.max_retries} retries", status_code=status
                    ) from err

                raise LLMServiceError(f"API error {status}: {err.response.text}", status_code=status) from err

            except httpx.TimeoutException as err:
                if attempt < self.max_retries:
                    log.warning("Request timed out. Retrying immediately (attempt %d).", attempt + 1)
                    continue
                raise LLMServiceError(f"Request timed out after {self.max_retries} retries") from err

        raise LLMServiceError(f"Failed to complete request after {self.max_retries} retries")


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
            "Supported providers: openrouter, openai, anthropic, ollama, deepseek."
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