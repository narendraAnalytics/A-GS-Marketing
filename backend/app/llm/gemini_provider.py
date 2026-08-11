from google import genai
from google.genai import types

from app.config import Settings
from app.llm.base import SchemaT


class GeminiProvider:
    """The only module allowed to import google.genai directly."""

    def __init__(self, settings: Settings):
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._model = settings.gemini_model

    def generate_structured(
        self,
        prompt: str,
        response_schema: type[SchemaT],
        system_instruction: str | None = None,
    ) -> SchemaT:
        response = self._client.models.generate_content(
            model=self._model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=response_schema,
            ),
        )
        return response_schema.model_validate_json(response.text)
