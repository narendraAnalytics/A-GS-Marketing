from typing import Protocol, TypeVar

from pydantic import BaseModel

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class LLMProvider(Protocol):
    """Abstraction agents depend on instead of a specific model SDK."""

    def generate_structured(
        self,
        prompt: str,
        response_schema: type[SchemaT],
        system_instruction: str | None = None,
    ) -> SchemaT:
        """Generate a response and parse it into response_schema."""
        ...
