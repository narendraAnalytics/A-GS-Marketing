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
Phase 1. `GET /health` returns `{"status": "ok"}` for uptime/deploy checks.

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

## Deploying to Render

1. Push this repo to GitHub (already done) — Render deploys from git.
2. Render Dashboard → **New** → **Web Service** → connect the repo.
3. **Root Directory**: `backend` (this is a monorepo with `frontend/` as a
   sibling folder — Render must be scoped to `backend/` or it'll try to
   build both).
4. **Runtime**: Python 3 (Render reads `.python-version` = `3.12`
   automatically from the root directory once scoped to `backend/`).
5. **Build Command**:
   ```
   uv sync --frozen
   ```
   (Needs `uv` available — Render's Python environment doesn't have it
   preinstalled by default; if the build fails with `uv: command not
   found`, prefix with `pip install uv && uv sync --frozen`.)
6. **Start Command**:
   ```
   uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
   `--host 0.0.0.0` and `$PORT` (Render's dynamically assigned port) are
   both required — omitting either means Render can't route traffic to the
   container and every request 502s.
7. **Environment variables** (Render dashboard → Environment):
   - `GEMINI_API_KEY` — required, no default (`Settings` will fail to
     construct without it).
   - `LANGGRAPH_STRICT_MSGPACK=true` — keep this set in every environment
     (see phase1.txt task 7 for why).
   - `CORS_ALLOWED_ORIGINS` — comma-separated list of origins allowed to
     call this API from a browser. Defaults to `http://localhost:3000` if
     unset, which is wrong for production — set it to your deployed
     frontend's real URL once that exists (e.g.
     `https://ags-marketing.vercel.app`). Multiple origins:
     `https://a.com,https://b.com`.
   - `GEMINI_MODEL` — optional, defaults to `gemini-flash-latest`.
8. Deploy. Verify with `curl https://<your-service>.onrender.com/health`
   (expect `{"status":"ok"}`), then `/docs` for Swagger UI.

**Known limitation carried over from local dev**: the draft store
(`app/store.py`) is an in-memory Python dict — it does not persist across
Render restarts/redeploys or scale to multiple instances. Fine for this
POC's single always-on free/starter instance; revisit with a real database
before scaling beyond one instance (see phase1.txt "WHY NOT FULL LANGGRAPH
interrupt() / POSTGRES CHECKPOINTER YET").

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
