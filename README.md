# A&GS AI Marketing — LinkedIn Content POC

A working prototype that demonstrates how A&GS can automate **LinkedIn
content creation** while keeping a **human in control before publishing**.

A&GS's actual product is **AI TRiSM** (Trust, Risk, and Security Management)
— a security proxy/gateway that enforces runtime guardrails (prompt-injection
defense, PII redaction, output filtering, policy-as-code) between enterprise
applications and LLM providers. The generated marketing content is grounded
in that specific product surface, not generic "AI security" language.

> **"A human gives a marketing objective → AI agents reason and create the
> LinkedIn content → a human reviews and approves it → the approved content
> can be published automatically."**

## How it works

```text
User (Next.js frontend)
        |
        v
  FastAPI backend
        |
        v
  LangGraph workflow
        |
  +-----+-----+
  v           v
Strategy    Content
 Agent       Agent
  |           |
  +-----+-----+
        v
     Gemini
        |
        v
  Generated Post
        |
        v
  Human Review (Edit / Regenerate)
        |
        v
  Approve & Publish  ->  "Ready to Publish"
```

Two agents, coordinated by LangGraph:

- **Strategy Agent** — turns a campaign objective into an audience, angle,
  hook, and key message.
- **Content Agent** — turns that strategy into a structured LinkedIn post
  (hook, body, CTA, hashtags), following current LinkedIn engagement best
  practices (scroll-stopping hook formulas, short line-broken paragraphs,
  3-hashtag broad/niche/branded mix).

Real LinkedIn publishing is intentionally out of scope for now — the flow
ends at a "Ready to Publish" state once a human approves the draft, per the
original design decision to prove the human-in-the-loop workflow before
tackling LinkedIn OAuth/API permissions.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Backend | FastAPI |
| Agent orchestration | LangGraph |
| LLM | Gemini (via `google-genai`, behind an `LLMProvider` abstraction) |
| Backend package manager | uv |

Agents never call Gemini directly — always through an `LLMProvider`
interface (`backend/app/llm/`), so swapping in another model provider later
doesn't require touching agent code.

## Project structure

```text
backend/    FastAPI + LangGraph + Gemini API — see backend/README.md
frontend/   Next.js campaign form / draft review UI — see frontend/README.md
```

Each has its own setup/run instructions in its own README. Both run
independently and must be started separately for local development — the
frontend calls the backend directly over HTTP (CORS-enabled for
`localhost:3000`).

## Quick start

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env   # then set GEMINI_API_KEY
uv sync
uv run uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>. See `backend/README.md` and `frontend/README.md`
for full details, API reference, and known gotchas.

## Status

- **Phase 1 (backend)** — complete. 2-agent workflow, `/generate`,
  `/regenerate`, `/approve`, `/draft/{id}` endpoints, fully tested offline
  (`FakeLLMProvider`), live-verified against the real Gemini API.
- **Phase 2 (frontend)** — complete. Campaign objective form, LinkedIn-style
  draft preview card, Edit/Regenerate/Copy/Approve flow.
- **Phase 3 (planned)** — real LinkedIn publishing (OAuth), persistence
  beyond a single process, deployment.

See `backend/CLAUDE.md` and `frontend/CLAUDE.md` for implementation notes,
conventions, and known gotchas worth knowing before changing either service.
