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

## Status: Phase 1 + Phase 2 complete, deployed. Phase 3 OAuth code in progress

All Phase 1 (backend) and Phase 2 (frontend) tasks done — see `../phase1.txt`
and `../phase2.txt` TASK BREAKDOWN sections for full checklists with
live-verification notes.

Phase 3 (real LinkedIn publishing) backend code now exists: OAuth
connect/callback/status endpoints plus `/publish`. Covered by 9 offline
tests (monkeypatched `app.linkedin.client`, same pattern as
`FakeLLMProvider`). NOT yet verified against a real LinkedIn account in a
browser, and the frontend has no "Connect LinkedIn" button yet — both are
the next concrete steps. Full setup + flow reference in
`../stepslinkedin.txt`.

**Live**: backend deployed on Render at
https://a-gs-marketing.onrender.com (`/health`, `/docs`), frontend on
Vercel at https://a-gs-marketing.vercel.app. See README.md "Deploying to
Render" for the deploy recipe if redeploying elsewhere. The LinkedIn env
vars are only in local `.env` so far — Render's Environment tab still needs
`LINKEDIN_CLIENT_ID`/`LINKEDIN_CLIENT_SECRET`/`LINKEDIN_REDIRECT_URI` (the
Render-URL version of the redirect) added before OAuth will work in prod.

Working endpoints: `POST /api/marketing/generate`, `/regenerate`,
`/approve`, `/publish`, `GET /api/marketing/draft/{id}`, `GET /health`,
`GET /api/marketing/linkedin/connect` (redirect to LinkedIn),
`GET /api/marketing/linkedin/callback` (OAuth redirect target),
`GET /api/marketing/linkedin/status`.

## Architecture

```
FastAPI routes
  app/routers/marketing.py: generate/regenerate/approve/publish/draft
    -> LangGraph StateGraph (app/workflow/graph.py): strategy -> content
      -> StrategyAgent / ContentAgent (app/agents/)
        -> LLMProvider protocol (app/llm/base.py)
          -> GeminiProvider (app/llm/gemini_provider.py) -- only module
             that imports google.genai directly
  app/routers/linkedin.py: connect/callback/status
    -> app/linkedin/client.py -- OAuth + Posts API calls via httpx (only
       module that talks to LinkedIn's API directly)
    -> app/linkedin/store.py -- in-memory OAuth state (CSRF) + the single
       LinkedIn connection (access token, author URN)
```

Agents never call Gemini directly — always through `LLMProvider`, so
swapping in another model provider later doesn't touch agent code. Same
principle applied to `app/linkedin/client.py` for LinkedIn calls, though
there's no provider-abstraction layer there (only one LinkedIn integration
will ever exist, unlike swappable LLM providers — would be needless
abstraction).

Drafts live in an in-memory singleton store (`app/store.py`) — no
persistence across restarts, single-process only. Deliberate for a POC; see
phase1.txt "WHY NOT FULL LANGGRAPH interrupt() / POSTGRES CHECKPOINTER YET".
The LinkedIn connection (`app/linkedin/store.py`) uses the same in-memory
pattern for now, but this one is a known-weaker tradeoff — see gotchas below.

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
- **Render env vars are separate fields, not a pasted `.env` blob.** Pasting
  the whole local `.env` file's contents into a single Render env var field
  (e.g. into `GEMINI_API_KEY`) embeds a literal newline in that value. Since
  `GeminiProvider` sends the key as an HTTP header, this produced
  `httpx.LocalProtocolError: Illegal header value` on every `/generate`
  call in production (worked fine locally, since `.env` parsing there
  splits on newlines correctly). Each key must be its own Render env var
  entry with only its own value.
- **The LinkedIn connection store is genuinely weaker than `store.py`'s
  tradeoff, not just a copy of it.** A lost draft costs one Gemini call to
  regenerate; a lost LinkedIn connection costs the user a full re-consent
  through LinkedIn's OAuth screen. Render restarts, redeploys, or free-tier
  spin-down all wipe it. Acceptable for this POC's single-user, single-
  instance setup — but if this app ever needs to survive a Render restart
  without forcing reconnection, this is the first thing to move to real
  persistence (not the draft store).
- **LinkedIn issues no refresh tokens for standard (non-Marketing-
  Developer-Platform) apps.** Access tokens last 60 days, then the only way
  to get a new one is the user going through `/connect` again — there's no
  silent refresh call to make. `LinkedInStore.get_connection()` treats an
  expired token as "not connected" rather than trying to use it.
- **`LinkedIn-Version` header (`app/config.py`'s `linkedin_api_version`,
  currently `"202606"`) needs bumping periodically.** LinkedIn deprecates
  API versions roughly 12 months out. If `/publish` starts failing with a
  version-related error, check
  https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
  for the current value before assuming it's a code bug.

## Conventions

- Structured LLM output only (`response_mime_type="application/json"` +
  `response_schema`) — never parse free text.
- New Pydantic models go in `app/models.py`, not scattered per-module.
- Tests use `FakeLLMProvider` (`tests/conftest.py`) — no network calls, no
  `GEMINI_API_KEY` required. Route tests monkeypatch
  `app.routers.marketing.get_graph` to inject it. LinkedIn tests
  (`tests/test_linkedin.py`) follow the same shape: monkeypatch
  `app.linkedin.client`'s functions rather than hitting the real API, and
  reset `get_linkedin_store()`'s module-level singleton between tests via
  an autouse fixture (it isn't request-scoped like FastAPI dependencies —
  without the reset, tests leak connection state into each other).
- Only `app/linkedin/client.py` imports/calls LinkedIn's API directly, same
  isolation principle as `GeminiProvider` for Gemini.

## Next up

1. **Verify the OAuth flow against a real LinkedIn account in a browser.**
   Code is written and unit-tested (monkeypatched), but nobody has actually
   clicked through `/api/marketing/linkedin/connect` → LinkedIn's consent
   screen → `/callback` → checked `/status` shows `connected: true` with a
   real name yet. Do this before trusting `/publish` works at all — it's
   the one thing that can't be verified without a real LinkedIn login.
2. **Build the frontend's "Connect LinkedIn" button** (full-page
   navigation to `/api/marketing/linkedin/connect`, not `fetch` — see
   `frontend/CLAUDE.md`) and wire `PostDraftCard`'s "Approve & Publish"
   flow to actually call the new `/publish` endpoint instead of just
   flipping to `ready_to_publish` and stopping there.
3. Add the 3 `LINKEDIN_*` env vars to Render's Environment tab (with the
   Render-URL redirect, not localhost) once ready to test the deployed
   version.

Setup steps (LinkedIn Page/app/products) are already done — see
`../stepslinkedin.txt` for the full record, including the `&`-in-names
gotcha and why Community Management API was deliberately avoided.
