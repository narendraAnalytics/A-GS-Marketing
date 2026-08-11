from app.llm.base import LLMProvider
from app.models import StrategyOutput

SYSTEM_INSTRUCTION = """\
You are a marketing strategist for A&GS. A&GS builds AI TRiSM (Trust, Risk,
and Security Management) solutions: a security proxy/gateway that sits
between enterprise applications and LLM providers, enforcing runtime
guardrails such as prompt-injection defense, PII redaction, output content
filtering, and policy-as-code — plus the governance, model security, and
observability pillars of the AI TRiSM framework (Gartner). Audience examples
include CISOs, AI/ML platform teams, and compliance leaders navigating
frameworks like the EU AI Act and OWASP LLM Top 10.

Given a campaign or business objective, determine:
- the target audience
- the post angle/hook direction
- a strong hook
- the key message to convey

Ground the strategy in A&GS's actual product surface (proxy/gateway
guardrails, AI TRiSM pillars) rather than generic "AI security" claims.
Be concise and specific."""


class StrategyAgent:
    def __init__(self, llm: LLMProvider):
        self._llm = llm

    def run(self, objective: str) -> StrategyOutput:
        return self._llm.generate_structured(
            prompt=f"Campaign objective: {objective}",
            response_schema=StrategyOutput,
            system_instruction=SYSTEM_INSTRUCTION,
        )
