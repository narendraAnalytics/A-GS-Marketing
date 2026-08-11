# A&GS AI Marketing — Backend (Phase 1)

FastAPI + LangGraph + Gemini backend for the LinkedIn content POC: a
2-agent workflow (Strategy Agent -> Content Agent) that turns a campaign
objective into a draft LinkedIn post, with a human-approval step before
publishing. See `../phase1.txt` for the full design and task log.

Phase 1 is backend-only — no frontend, no real LinkedIn publishing yet.

## Prerequisites

- Python 3.12 (see `.python-version`)
- [uv](https://docs.astral.sh/uv/) for dependency management
- A Gemini API key ([Google AI Studio](https://aistudio.google.com/apikey))

## Setup

```bash
cp .env.example .env
```

Edit `.env` and set `GEMINI_API_KEY`. `GEMINI_MODEL` defaults to
`gemini-flash-latest` (an alias Google keeps pointed at their current fast
model — pinned model names like `gemini-2.5-flash` can be deprecated for new
API keys without notice; see phase1.txt task 2). `LANGGRAPH_STRICT_MSGPACK`
should stay `true` — it restricts LangGraph's checkpoint deserialization to
a safe allowlist (see phase1.txt task 7).

Install dependencies:

```bash
uv sync
```

## Run the dev server

```bash
uv run uvicorn app.main:app --reload
```

Then open http://127.0.0.1:8000/docs for interactive Swagger UI.

> **Windows/git-bash note:** `fastapi dev app/main.py` crashes on some
> Windows terminals with a `UnicodeEncodeError` — its startup banner writes
> an emoji that the cp1252 console can't encode. This is unrelated to the
> app itself; use `uvicorn app.main:app --reload` instead, or set
> `PYTHONUTF8=1` if you want to use `fastapi dev`.

## API

All endpoints are under `/api/marketing`:

| Method | Path                  | Body                    | Notes                                |
| ------ | --------------------- | ------------------------ | ------------------------------------- |
| POST   | `/generate`           | `{"objective": str}`     | Runs the graph, creates a new draft   |
| POST   | `/regenerate`         | `{"draft_id": str}`      | Re-runs the graph for the same brief  |
| POST   | `/approve`            | `{"draft_id": str}`      | Flips status to `ready_to_publish`    |
| GET    | `/draft/{draft_id}`   | —                         | Fetch current draft                   |

`/publish` does not exist yet — publishing to LinkedIn is out of scope for
Phase 1.

Example:

```bash
curl -X POST http://127.0.0.1:8000/api/marketing/generate \
  -H "Content-Type: application/json" \
  -d '{"objective": "Announce our AI security proxy guardrails for enterprise LLM traffic."}'
```

## Tests

```bash
uv run pytest -v
```

All tests run against a `FakeLLMProvider` (see `tests/conftest.py`) — no
network calls, no `GEMINI_API_KEY` required in CI.

## Project layout

```
app/
  main.py              FastAPI app
  config.py            Settings (GEMINI_API_KEY, GEMINI_MODEL)
  models.py             Pydantic schemas
  store.py              In-memory draft store (single-process, POC only)
  llm/
    base.py             LLMProvider protocol
    gemini_provider.py   Gemini implementation (only module importing google.genai)
  agents/
    strategy_agent.py
    content_agent.py
  workflow/
    state.py             GraphState
    graph.py              LangGraph StateGraph wiring
  routers/
    marketing.py          /api/marketing/* endpoints
tests/
  conftest.py             FakeLLMProvider fixture
  test_agents.py
  test_workflow.py
  test_routes.py
```
