"""LLM client for OpenRouter API calls."""

import json
import logging

import requests
from pydantic import BaseModel, ValidationError

from app.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
# MODEL = "openai/gpt-oss-120b"
MODEL = "openai/gpt-oss-safeguard-20b"


class LLMClient:
    """Client for calling OpenRouter LLM with structured output parsing."""

    @staticmethod
    def call(
        messages: list[dict],
        response_schema: type[BaseModel],
    ) -> BaseModel:
        """
        Call the LLM and parse response into the given Pydantic schema.

        Args:
            messages: List of message dicts with 'role' and 'content'
            response_schema: Pydantic BaseModel class to parse response into

        Returns:
            Parsed response as an instance of response_schema

        Raises:
            ValueError: If API call fails or response cannot be parsed
        """
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY not configured in settings")

        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": MODEL,
            "messages": messages,
            "temperature": 0,
            "reasoning": {"enabled": True},
        }

        # First attempt
        try:
            response = requests.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload,
                timeout=60,
            )
            response.raise_for_status()
        except requests.RequestException as e:
            logger.error(f"OpenRouter API call failed: {e}")
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

        # Try to parse the content as JSON and validate against schema
        try:
            parsed_json = json.loads(content)
            parsed_response = response_schema(**parsed_json)
            return parsed_response
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Failed to parse LLM response into {response_schema.__name__}: {e}")
            raise ValueError(f"LLM response parsing failed: {e}")
