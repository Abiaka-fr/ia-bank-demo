"""LLM client for OpenRouter API calls."""

import json
import logging

import requests
from pydantic import BaseModel, ValidationError

from app.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"


class LLMClient:
    """Client for calling OpenRouter LLM with structured output parsing."""

    @staticmethod
    def call(
        messages: list[dict],
        response_schema: type[BaseModel],
        retry_on_parse_error: bool = True,
    ) -> BaseModel:
        """
        Call the LLM and parse response into the given Pydantic schema.

        Args:
            messages: List of message dicts with 'role' and 'content'
            response_schema: Pydantic BaseModel class to parse response into
            retry_on_parse_error: If True, retry once if JSON parsing fails

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
            if not retry_on_parse_error:
                logger.error(f"Failed to parse LLM response into {response_schema.__name__}: {e}")
                raise ValueError(f"LLM response parsing failed: {e}")

            # Retry with a follow-up message asking for correction
            logger.warning(f"JSON parsing failed, retrying: {e}")

            follow_up_messages = messages + [
                {"role": "assistant", "content": content},
                {
                    "role": "user",
                    "content": (
                        f"The JSON you provided is invalid. Please provide a valid JSON object "
                        f"that matches this structure exactly (no markdown, no extra text):\n\n"
                        f"{response_schema.model_json_schema()}"
                    ),
                },
            ]

            try:
                response = requests.post(
                    OPENROUTER_API_URL,
                    headers=headers,
                    json={**payload, "messages": follow_up_messages},
                    timeout=60,
                )
                response.raise_for_status()
                result = response.json()

                assistant_message = result["choices"][0].get("message", {})
                content = assistant_message.get("content")

                if not content:
                    raise ValueError("Empty content in assistant message (retry)")

                parsed_json = json.loads(content)
                parsed_response = response_schema(**parsed_json)
                return parsed_response
            except Exception as retry_error:
                logger.error(f"Retry failed: {retry_error}")
                raise ValueError(f"LLM response parsing failed after retry: {retry_error}")
