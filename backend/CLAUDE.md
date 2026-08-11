# A&GS AI Marketing — Backend

FastAPI + LangGraph + Gemini backend for a LinkedIn content generation POC.
Full design and per-task verification log lives in `../phase1.txt` — read
that first for the "why" behind any decision below. `../marketinginfo.txt.txt`
has the original product vision.

## What this is

A 2-agent workflow (Strategy Agent -> Content Agent) that turns a campaign
objective into a draft LinkedIn post, with a human-approval step before
publishing. A&GS's actual product is **AI TRiSM** (Trust, Risk, and Security
Management) — a security proxy/gateway enforcing runtime guardrails
(prompt-injection defense, PII redaction, output filtering, policy-as-code)
between enterprise apps and LLM providers. Generated marketing content
should stay grounded in that specific product surface, not generic "AI
security" language.

## Status: Phase 1 + Phase 2 complete

All Phase 1 (backend) and Phase 2 (frontend) tasks done — see `../phase1.txt`
and `../phase2.txt` TASK BREAKDOWN sections for full checklists with
live-verification notes. No real LinkedIn publishing yet (Phase 3+).
Deployment to Render is in progress — see README.md "Deploying to Render".

Working endpoints: `POST /api/marketing/generate`, `/regenerate`, `/approve`,
`GET /api/marketing/draft/{id}`. `/publish` does not exist yet.

## Architecture

```
FastAPI routes (app/routers/marketing.py)
  -> LangGraph StateGraph (app/workflow/graph.py): strategy -> content
    -> StrategyAgent / ContentAgent (app/agents/)
      -> LLMProvider protocol (app/llm/base.py)
        -> GeminiProvider (app/llm/gemini_provider.py) -- only module that
           imports google.genai directly
```

Agents never call Gemini directly — always through `LLMProvider`, so
swapping in another model provider later doesn't touch agent code.

Drafts live in an in-memory singleton store (`app/store.py`) — no
persistence across restarts, single-process only. Deliberate for a POC; see
phase1.txt "WHY NOT FULL LANGGRAPH interrupt() / POSTGRES CHECKPOINTER YET".

## Commands

```bash
uv sync                              # install deps
uv run uvicorn app.main:app --reload # run dev server (NOT `fastapi dev` — see gotcha below)
uv run pytest -v                     # run tests (offline, no GEMINI_API_KEY needed)
```

## Known gotchas

- **`fastapi dev app/main.py` crashes on Windows/git-bash** with
  `UnicodeEncodeError` (its startup banner writes an emoji the cp1252
  console can't encode). Unrelated to app code. Use `uvicorn app.main:app
  --reload` instead, or set `PYTHONUTF8=1`.
- **Gemini model names get deprecated for new API keys without much
  warning** — `gemini-2.5-flash` 404'd during Phase 1 implementation despite
  being listed as available. Default is `gemini-flash-latest` (an alias
  Google keeps pointed at their current fast model) specifically to avoid
  this recurring.
- **`LANGGRAPH_STRICT_MSGPACK=true` must stay set** in `.env` — restricts
  LangGraph checkpoint deserialization to a safe allowlist derived from the
  graph's own state schema (mitigates CVE-2026-28277, unsafe msgpack
  deserialization). This env var is read by LangGraph directly from
  `os.environ` at import time, not through our `Settings` model — that's why
  `.env` loading happens in `app/__init__.py` (runs before any other app
  submodule, and therefore before any langgraph import) rather than in
  `config.py`. Don't move it back to config.py without checking import order
  still works.
- **Gemini structured output can occasionally degenerate** into a repeating
  token loop inside a string field (observed in `hashtags` during testing) —
  syntactically valid JSON, garbage content. `ContentOutput.hashtags` has a
  `field_validator` that catches overlong/malformed tags as a guardrail, but
  there's no retry-on-failure logic yet.
- **CORS origins are configurable, not hardcoded** — `CORS_ALLOWED_ORIGINS`
  in `Settings` (comma-separated, defaults to `http://localhost:3000`).
  Added when preparing for Render deployment, since the deployed frontend's
  origin isn't `localhost:3000`. Set the real value as a Render env var
  rather than editing `main.py`.
- **In-memory `store.py` doesn't survive Render restarts/redeploys** and
  won't work correctly if scaled to multiple instances (each has its own
  dict). Fine for one always-on instance; needs a real DB before scaling.

## Conventions

- Structured LLM output only (`response_mime_type="application/json"` +
  `response_schema`) — never parse free text.
- New Pydantic models go in `app/models.py`, not scattered per-module.
- Tests use `FakeLLMProvider` (`tests/conftest.py`) — no network calls, no
  `GEMINI_API_KEY` required. Route tests monkeypatch
  `app.routers.marketing.get_graph` to inject it.

## Next up

Phase 2 (not started): Next.js frontend on top of these endpoints. Phase 3+:
real LinkedIn publishing (OAuth), Postgres-backed checkpointer if
persistence across restarts becomes necessary.
