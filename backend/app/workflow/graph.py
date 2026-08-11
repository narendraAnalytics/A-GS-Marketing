from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.agents.content_agent import ContentAgent
from app.agents.strategy_agent import StrategyAgent
from app.llm.base import LLMProvider
from app.workflow.state import GraphState


def build_graph(llm: LLMProvider) -> CompiledStateGraph:
    strategy_agent = StrategyAgent(llm)
    content_agent = ContentAgent(llm)

    def strategy_node(state: GraphState) -> dict:
        return {"strategy": strategy_agent.run(state["objective"])}

    def content_node(state: GraphState) -> dict:
        assert state["strategy"] is not None
        return {"content": content_agent.run(state["strategy"])}

    graph = StateGraph(GraphState)
    graph.add_node("strategy", strategy_node)
    graph.add_node("content", content_node)
    graph.set_entry_point("strategy")
    graph.add_edge("strategy", "content")
    graph.add_edge("content", END)

    return graph.compile(checkpointer=MemorySaver())
