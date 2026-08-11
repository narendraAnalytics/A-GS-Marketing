from app.workflow.graph import build_graph
from tests.conftest import FAKE_CONTENT, FAKE_STRATEGY


def test_graph_runs_strategy_then_content(fake_llm):
    graph = build_graph(fake_llm)
    config = {"configurable": {"thread_id": "test-thread"}}

    result = graph.invoke(
        {"objective": "Announce our AI security proxy guardrails.", "strategy": None, "content": None},
        config=config,
    )

    assert result["strategy"] == FAKE_STRATEGY
    assert result["content"] == FAKE_CONTENT
    # strategy node must run before content node: the content call's prompt
    # should be built from the strategy output, not the raw objective.
    assert len(fake_llm.calls) == 2
    assert fake_llm.calls[0]["prompt"] == "Campaign objective: Announce our AI security proxy guardrails."
    assert FAKE_STRATEGY.hook in fake_llm.calls[1]["prompt"]
