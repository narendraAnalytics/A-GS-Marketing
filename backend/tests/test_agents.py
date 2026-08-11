from app.agents.content_agent import ContentAgent
from app.agents.strategy_agent import StrategyAgent
from app.models import ContentOutput, StrategyOutput
from tests.conftest import FAKE_CONTENT, FAKE_STRATEGY


def test_strategy_agent_returns_structured_output(fake_llm):
    agent = StrategyAgent(fake_llm)

    result = agent.run("Announce our AI security proxy guardrails.")

    assert result == FAKE_STRATEGY
    assert len(fake_llm.calls) == 1
    call = fake_llm.calls[0]
    assert call["schema"] is StrategyOutput
    assert "Announce our AI security proxy guardrails." in call["prompt"]
    assert call["system_instruction"] is not None


def test_content_agent_returns_structured_output(fake_llm):
    agent = ContentAgent(fake_llm)

    result = agent.run(FAKE_STRATEGY)

    assert result == FAKE_CONTENT
    assert len(fake_llm.calls) == 1
    call = fake_llm.calls[0]
    assert call["schema"] is ContentOutput
    assert FAKE_STRATEGY.hook in call["prompt"]
    assert FAKE_STRATEGY.key_message in call["prompt"]
