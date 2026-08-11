from typing import TypedDict

from app.models import ContentOutput, StrategyOutput


class GraphState(TypedDict):
    objective: str
    strategy: StrategyOutput | None
    content: ContentOutput | None
