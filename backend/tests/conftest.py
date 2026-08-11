import pytest

from app.models import ContentOutput, StrategyOutput

FAKE_STRATEGY = StrategyOutput(
    audience="CISOs and AI platform teams",
    angle="Runtime guardrails for enterprise LLM traffic",
    hook="Your LLM pipeline has a blind spot.",
    key_message="A&GS enforces AI TRiSM guardrails at the proxy layer.",
)

FAKE_CONTENT = ContentOutput(
    post_text="Your LLM pipeline has a blind spot.\n\nA&GS secures it at the proxy layer.",
    cta="Book a 15-minute AI security review.",
    hashtags=["#AITRiSM", "#LLMGateway", "#AGS"],
)


class FakeLLMProvider:
    """Deterministic stand-in for GeminiProvider. No network calls, so
    agent/workflow/route tests run offline and don't depend on GEMINI_API_KEY."""

    def __init__(self):
        self.calls: list[dict] = []

    def generate_structured(self, prompt, response_schema, system_instruction=None):
        self.calls.append(
            {
                "prompt": prompt,
                "schema": response_schema,
                "system_instruction": system_instruction,
            }
        )
        if response_schema is StrategyOutput:
            return FAKE_STRATEGY
        if response_schema is ContentOutput:
            return FAKE_CONTENT
        raise ValueError(f"FakeLLMProvider has no canned response for {response_schema}")


@pytest.fixture
def fake_llm():
    return FakeLLMProvider()
