"""LLM client for OpenRouter API calls."""

import json
import logging
import re
import time

import requests
from pydantic import BaseModel, ValidationError

from app.config import settings

# Rate limit handling
MAX_RETRIES = 1
INITIAL_BACKOFF = 1  # seconds

logger = logging.getLogger(__name__)


def extract_json_from_response(content: str) -> str:
    """
    Extract JSON from response that may be wrapped in markdown.

    Handles:
    - ```json { ... } ```
    - ```{ ... }```
    - Plain JSON
    - Text before/after JSON
    """
    content = content.strip()

    # Try markdown code block (```json ... ```)
    match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", content)
    if match:
        return match.group(1)

    # Try to find JSON object in response (greedy match)
    match = re.search(r"\{[\s\S]*\}", content)
    if match:
        return match.group(0)

    # Return as-is if no wrapper found
    return content

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
# MODEL = "openai/gpt-oss-120b"
# MODEL = "meta-llama/llama-3.2-1b-instruct" - cheaper, high latency use for testing local
MODEL = "openai/gpt-oss-safeguard-20b" # more expensive a bit, low latency use for deploy
LLM_CALL_TIMEOUT = 60  # seconds — fail fast if LLM hangs


class LLMClient:
    """Client for calling OpenRouter LLM with structured output parsing."""

    @staticmethod
    def call(
        messages: list[dict],
        response_schema: type[BaseModel],
        model: str = MODEL,
        api_key: str | None = None,
        reasoning: bool = True,
    ) -> BaseModel:
        """
        Call the LLM and parse response into the given Pydantic schema.

        Args:
            messages: List of message dicts with 'role' and 'content'
            response_schema: Pydantic BaseModel class to parse response into
            model: OpenRouter model id (defaults to the pipeline model)
            api_key: OpenRouter key (defaults to OPENROUTER_API_KEY)
            reasoning: model thinking on/off (off is much faster for chat)

        Returns:
            Parsed response as an instance of response_schema

        Raises:
            ValueError: If API call fails or response cannot be parsed
        """
        api_key = api_key or settings.openrouter_api_key
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not configured in settings")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0,
            "reasoning": {"enabled": reasoning},
            "max_tokens": 10000,  # Limit output to prevent excessive token usage
        }

        # First attempt (with rate limit retries)
        for retry_attempt in range(MAX_RETRIES + 1):
            try:
                start_time = time.time()
                response = requests.post(
                    OPENROUTER_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=LLM_CALL_TIMEOUT,
                )
                latency_ms = (time.time() - start_time) * 1000

                # Check for rate limit (429)
                if response.status_code == 429:
                    if retry_attempt < MAX_RETRIES:
                        backoff_time = INITIAL_BACKOFF * (2 ** retry_attempt)
                        logger.warning(f"⚠️  Rate limited (429). Retry {retry_attempt + 1}/{MAX_RETRIES} after {backoff_time}s...")
                        time.sleep(backoff_time)
                        continue
                    else:
                        logger.error(f"❌ Rate limited (429) - max retries exceeded after {latency_ms:.2f}ms")
                        raise ValueError("LLM API rate limited: max retries exceeded")

                logger.info(f"⏱️  LLM call completed in {latency_ms:.2f}ms")
                response.raise_for_status()
                break  # Success, exit retry loop
            except requests.Timeout as e:
                latency_ms = (time.time() - start_time) * 1000
                logger.error(f"❌ LLM call TIMEOUT after {latency_ms:.2f}ms (limit: {LLM_CALL_TIMEOUT}s): {e}")
                raise ValueError(f"LLM API timeout: request exceeded {LLM_CALL_TIMEOUT} seconds")
            except requests.RequestException as e:
                latency_ms = (time.time() - start_time) * 1000
                logger.error(f"❌ OpenRouter API call failed after {latency_ms:.2f}ms: {e}")
                raise ValueError(f"LLM API error: {e}")

        try:
            result = response.json()
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenRouter response: {e}")
            raise ValueError(f"Invalid API response: {e}")

        # Extract assistant message
        if "choices" not in result or not result["choices"]:
            raise ValueError("No choices in API response")

        assistant_message = result["choices"][0].get("message", {})
        content = assistant_message.get("content")

        if not content:
            raise ValueError("Empty content in assistant message")

        # Parse the content as JSON and validate against schema
        try:
            # Extract JSON from markdown-wrapped response if needed
            json_content = extract_json_from_response(content)
            parsed_json = json.loads(json_content)
            parsed_response = response_schema(**parsed_json)
            return parsed_response
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"❌ Failed to parse LLM response into {response_schema.__name__}: {e}")
            raise ValueError(f"LLM response parsing failed: {e}")
