"""LLM factory for creating provider-specific LLM clients."""

from __future__ import annotations

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx

from ..config import Settings, settings
from ..utils.llm_parser import LLMOutputParser, LLMParseError

logger = logging.getLogger(__name__)


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
# Abstract base
# ---------------------------------------------------------------------------

class BaseLLMClient(ABC):
    """Abstract base class for all LLM provider clients."""

    def __init__(self, api_key: str, model: str, **kwargs: Any) -> None:
        self.api_key = api_key
        self.model = model
        self.kwargs = kwargs

    @abstractmethod
    async def complete(self, messages: List[Dict[str, Any]], **kwargs: Any) -> str:
        """Send a chat completion request and return the response text.

        Args:
            messages: OpenAI-style list of {"role": ..., "content": ...} dicts.
            **kwargs: Optional overrides (temperature, max_tokens, etc.).

        Returns:
            The generated text content.
        """
        ...

    @abstractmethod
    async def complete_json(
        self,
        messages: List[Dict[str, Any]],
        schema: Dict[str, Any],
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Complete a chat conversation and return a parsed JSON dict.

        Args:
            messages: Chat messages.
            schema: JSON schema that the response should conform to.
            **kwargs: Optional overrides.

        Returns:
            Parsed JSON response as a Python dict.
        """
        ...

    @abstractmethod
    async def stream(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        """Stream a chat completion, yielding text chunks.

        Args:
            messages: Chat messages.

        Yields:
            Text chunks as they arrive.
        """
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
# OpenRouter client
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
        super().__init__(api_key, model)
        cfg = config or settings
        self.base_url = cfg.llm_base_url or _OPENROUTER_BASE
        self.headers: Dict[str, str] = {
            "Authorization": f"Bearer {api_key}",
            **_OPENROUTER_HEADERS_COMMON,
        }
        self.timeout = httpx.Timeout(cfg.llm_timeout)
        self.max_retries: int = cfg.llm_max_retries
        self._cfg = cfg

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

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
        """Complete a request and parse the response as JSON.

        Strategy:
        1. Inject a system reminder to output only valid JSON.
        2. Attempt native response_format json_object for models that
           support JSON mode (non-free models on OpenRouter).
        3. Fall back to plain completion + LLMOutputParser.parse_json.
        """
        json_reminder: Dict[str, str] = {
            "role": "system",
            "content": (
                "You MUST output ONLY valid JSON that conforms to the provided schema. "
                "Do not include any explanatory text, markdown, or code fences."
            ),
        }
        augmented = list(messages) + [json_reminder]

        # Free models on OpenRouter do not reliably support JSON mode.
        supports_json_mode = ":free" not in self.model.lower()

        payload = self._build_payload(augmented, **kwargs)
        if supports_json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            response_text = await self._make_request_with_retries(payload)
            return LLMOutputParser.parse_json(response_text)
        except LLMParseError:
            # If JSON-mode payload failed, retry without it and parse manually.
            plain_payload = self._build_payload(augmented, **kwargs)
            response_text = await self._make_request_with_retries(plain_payload)
            return LLMOutputParser.parse_json(response_text)

    async def stream(self, messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
        """Yield text chunks from a streaming completion."""
        payload = self._build_payload(messages)
        payload["stream"] = True

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    raise RuntimeError(
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
                        continue  # skip malformed SSE frames

    def get_model_name(self) -> str:
        return self.model

    def get_provider(self) -> str:
        return "openrouter"

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

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
        """POST the payload to OpenRouter with retry logic.

        Retry policy:
          - 429 Rate-limit  : wait 5 s then retry (exponential backoff)
          - 503 Unavailable : wait 10 s then retry (exponential backoff)
          - 5xx other       : exponential backoff
          - Timeout         : retry immediately (no extra sleep)
        """
        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers=self.headers,
                        json=payload,
                    )

                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]

                if response.status_code == 429:
                    if attempt < self.max_retries:
                        wait = 5 * (2 ** attempt)
                        logger.warning("Rate-limited (429). Retrying in %ds (attempt %d).", wait, attempt + 1)
                        await asyncio.sleep(wait)
                        continue
                    raise RuntimeError(f"Rate limit exceeded after {self.max_retries} retries")

                if response.status_code == 503:
                    if attempt < self.max_retries:
                        wait = 10 * (2 ** attempt)
                        logger.warning("Service unavailable (503). Retrying in %ds (attempt %d).", wait, attempt + 1)
                        await asyncio.sleep(wait)
                        continue
                    raise RuntimeError(f"Service unavailable after {self.max_retries} retries")

                if response.status_code >= 500:
                    if attempt < self.max_retries:
                        wait = 2 ** attempt
                        logger.warning("Server error %d. Retrying in %ds.", response.status_code, wait)
                        await asyncio.sleep(wait)
                        continue
                    raise RuntimeError(
                        f"Server error {response.status_code} after {self.max_retries} retries"
                    )

                # 4xx -- client error, do not retry.
                raise RuntimeError(f"API error {response.status_code}: {response.text}")

            except httpx.TimeoutException:
                if attempt < self.max_retries:
                    logger.warning("Request timed out. Retrying immediately (attempt %d).", attempt + 1)
                    continue
                raise RuntimeError(f"Request timed out after {self.max_retries} retries")

        raise RuntimeError(f"Failed to complete request after {self.max_retries} retries")


# ---------------------------------------------------------------------------
# OpenAI client (optional fallback)
# ---------------------------------------------------------------------------

class OpenAIClient(BaseLLMClient):
    """LLM client for the official OpenAI API."""

    def __init__(self, api_key: str, model: str, config: Optional[Settings] = None) -> None:
        super().__init__(api_key, model)
        cfg = config or settings
        self.base_url = "https://api.openai.com/v1"
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
        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers=self.headers,
                        json=payload,
                    )
                if response.status_code == 200:
                    return response.json()["choices"][0]["message"]["content"]
                if response.status_code == 429 and attempt < self.max_retries:
                    await asyncio.sleep(5 * (2 ** attempt))
                    continue
                if response.status_code >= 500 and attempt < self.max_retries:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise RuntimeError(f"OpenAI API error {response.status_code}: {response.text}")
            except httpx.TimeoutException:
                if attempt < self.max_retries:
                    continue
                raise RuntimeError("OpenAI request timed out")
        raise RuntimeError("OpenAI request failed after retries")

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
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    raise RuntimeError(f"OpenAI stream error {response.status_code}: {body.decode()}")
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
        return "openai"


# ---------------------------------------------------------------------------
# Anthropic client (optional fallback)
# ---------------------------------------------------------------------------

class AnthropicClient(BaseLLMClient):
    """LLM client for the Anthropic Messages API."""

    _API_URL = "https://api.anthropic.com/v1/messages"
    _API_VERSION = "2023-06-01"

    def __init__(self, api_key: str, model: str, config: Optional[Settings] = None) -> None:
        super().__init__(api_key, model)
        cfg = config or settings
        self.headers: Dict[str, str] = {
            "x-api-key": api_key,
            "anthropic-version": self._API_VERSION,
            "content-type": "application/json",
        }
        self.timeout = httpx.Timeout(cfg.llm_timeout)
        self.max_retries: int = cfg.llm_max_retries
        self._cfg = cfg

    @staticmethod
    def _split_messages(
        messages: List[Dict[str, Any]],
    ) -> tuple:
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
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        self._API_URL,
                        headers=self.headers,
                        json=payload,
                    )
                if response.status_code == 200:
                    data = response.json()
                    return data["content"][0]["text"]
                if response.status_code == 429 and attempt < self.max_retries:
                    await asyncio.sleep(5 * (2 ** attempt))
                    continue
                if response.status_code == 529 and attempt < self.max_retries:  # Anthropic overloaded
                    await asyncio.sleep(10 * (2 ** attempt))
                    continue
                if response.status_code >= 500 and attempt < self.max_retries:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise RuntimeError(f"Anthropic API error {response.status_code}: {response.text}")
            except httpx.TimeoutException:
                if attempt < self.max_retries:
                    continue
                raise RuntimeError("Anthropic request timed out")
        raise RuntimeError("Anthropic request failed after retries")

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
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream(
                "POST",
                self._API_URL,
                headers=self.headers,
                json=payload,
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    raise RuntimeError(f"Anthropic stream error {response.status_code}: {body.decode()}")
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

    def get_model_name(self) -> str:
        return self.model

    def get_provider(self) -> str:
        return "anthropic"


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

class LLMFactory:
    """Creates the appropriate LLM client from a Settings object."""

    @staticmethod
    def create(config: Settings) -> BaseLLMClient:
        """Instantiate and return the correct LLM client.

        Provider and model are read entirely from *config* -- nothing is
        hard-coded in this method.

        Args:
            config: Application settings instance.

        Returns:
            A fully configured BaseLLMClient subclass.

        Raises:
            ValueError: If the provider is not supported.
        """
        provider = config.llm_provider.lower()
        model = config.llm_model

        if provider == "openrouter":
            logger.info("Creating OpenRouterClient | model=%s", model)
            return OpenRouterClient(api_key=config.openrouter_api_key, model=model, config=config)

        if provider == "openai":
            logger.info("Creating OpenAIClient | model=%s", model)
            return OpenAIClient(api_key=config.openai_api_key, model=model, config=config)

        if provider == "anthropic":
            logger.info("Creating AnthropicClient | model=%s", model)
            return AnthropicClient(api_key=config.anthropic_api_key, model=model, config=config)

        raise ValueError(
            f"Unsupported LLM provider: '{provider}'. "
            "Supported providers: openrouter, openai, anthropic."
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
        """Send a minimal test request to OpenRouter to verify a model is live.

        Args:
            model: Full OpenRouter model identifier (e.g. "qwen/qwen3-32b:free").
            api_key: OpenRouter API key.

        Returns:
            True if the model responds with HTTP 200.
            False on 503, 404, or any network/exception failure.
        """
        if not api_key:
            logger.debug("check_model_availability: no API key, returning False.")
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

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
                response = await client.post(
                    f"{_OPENROUTER_BASE}/chat/completions",
                    headers=headers,
                    json=payload,
                )
            available = response.status_code == 200
            logger.debug(
                "check_model_availability: model=%s status=%d available=%s",
                model, response.status_code, available,
            )
            return available
        except Exception as exc:
            logger.debug("check_model_availability: model=%s exception=%s", model, exc)
            return False

    @staticmethod
    async def get_available_model(preferred: str, api_key: str) -> str:
        """Return the first responsive model from preferred then fallbacks.

        Args:
            preferred: The caller first-choice model identifier.
            api_key: OpenRouter API key.

        Returns:
            An available model identifier. If all checks fail, returns
            preferred (let the caller handle the downstream error).
        """
        if await LLMFactory.check_model_availability(preferred, api_key):
            logger.info("Model selected: %s (preferred)", preferred)
            return preferred

        logger.warning("Preferred model '%s' unavailable. Trying fallbacks.", preferred)
        for fallback in get_fallback_models():
            if fallback == preferred:
                continue
            if await LLMFactory.check_model_availability(fallback, api_key):
                logger.info("Model selected: %s (fallback)", fallback)
                return fallback

        logger.error(
            "No available model found. Defaulting to preferred model '%s'.", preferred
        )
        return preferred


if __name__ == "__main__":
    print("LLM Factory loaded successfully")
    print(f"Recommended model : {RECOMMENDED_MODEL}")
    print(f"Fallback order    : {get_fallback_models()}")