@AGENTS.md

# A&GS AI Marketing — Frontend

Next.js frontend for the LinkedIn content generation POC. Full design and
per-task verification log lives in `../phase2.txt` — read that first for
the "why" behind any decision below. `../marketinginfo.txt.txt` has the
original product vision, `../stepslinkedin.txt` has the LinkedIn OAuth
setup reference for the not-yet-built Phase 3 publishing feature.

## What this is

A single-screen workspace: enter a campaign objective, generate a draft
LinkedIn post (via the FastAPI backend), review/edit/regenerate it, preview
how it'll actually look in the LinkedIn feed, optionally attach an image,
and approve it. No real LinkedIn publishing yet — approving just flips a
status flag server-side (see `../phase1.txt`/`backend/`).

## Status: Phase 2 complete, deployed

**Live**: https://a-gs-marketing.vercel.app, talking to the backend at
https://a-gs-marketing.onrender.com. Root Directory on Vercel is `frontend`
(monorepo — `backend/` is a sibling folder, not part of this deploy).

## Architecture

```
app/page.tsx (Server Component)
  -> CampaignWorkspace ('use client', owns all state: objective, draft,
     busyLabel, error/retry)
    -> PostDraftCard (per-draft: text/CTA edit, hashtags, image, actions)
      -> ImagePicker (local file upload + preview, no backend upload)
      -> LinkedInPreviewModal (realistic feed mockup with truncation)
      -> ReactionIcon (shared SVG icons, used by both the card and the modal)
lib/api.ts   -- typed fetch wrappers + ApiError, calls the backend directly
lib/types.ts -- mirrors backend/app/models.py exactly
app/privacy/page.tsx -- Privacy Policy (needed for LinkedIn Developer App
                        registration, see ../stepslinkedin.txt)
```

Frontend calls the backend directly via `fetch` (no Next.js API-route
proxy) — CORS is handled backend-side via `CORS_ALLOWED_ORIGINS`.

## Commands

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # also runs the TypeScript check
npx tsc --noEmit  # type-check only, faster than a full build
```

No test framework — one screen, thin API wrapper, verified manually
end-to-end each time (see phase2.txt TESTING PLAN). Revisit if the app
grows past this single workspace.

## Known gotchas / deliberate decisions

- **Edit is local-only.** There's no `PATCH /draft` endpoint on the
  backend, so text/CTA edits in `PostDraftCard` never reach the server.
  Approving after editing still approves the *original* AI-generated
  draft. This is explicitly surfaced in the UI (amber note), not hidden.
- **The attached image is local-only too**, same reasoning — no upload
  endpoint exists. It's for preview/reference only; users attach it
  separately when they actually post to LinkedIn. Uses
  `URL.createObjectURL()` with cleanup in `useImagePreview` — don't forget
  `revokeObjectURL` if this pattern gets copied elsewhere, it leaks memory
  otherwise.
- **Image aspect ratio is 4:5 portrait, not the "safer" 1.91:1 landscape.**
  Deliberate: current LinkedIn guidance says portrait images claim more
  mobile feed space and compound reach faster when used consistently. If a
  design review pushes back, this was a considered choice, not a default.
- **`LinkedInPreviewModal`'s "…see more" truncation is a character-count
  estimate** (`~210` desktop / `~140` mobile), using Tailwind's
  `line-clamp-3`. LinkedIn's real cutoff is line-based, not character-based
  — the modal says so in its own footnote. Don't present the cutoff number
  as exact if this UI gets extended.
- **`NEXT_PUBLIC_API_BASE_URL` is inlined at Next.js *build* time**, not
  read at runtime. Changing it on Vercel requires a redeploy, not just a
  restart — this bit us once during initial Vercel setup.
- **`next/image` isn't used for the uploaded/preview image** — it's a
  `blob:` object URL from a local file, which next/image's optimizer
  doesn't handle well without `unoptimized`. Plain `<img>` with an eslint
  suppression comment is used instead in `ImagePicker.tsx` and
  `LinkedInPreviewModal.tsx`. Don't "fix" this to `next/image` without
  checking that blob URLs actually render correctly first.
- **This is Next.js 16 (Turbopack)** — `AGENTS.md` (imported above) warns
  training-data assumptions about Next.js APIs may be stale for this
  version. Check `node_modules/next/dist/docs/` before relying on memory
  for anything API-shape-related.

## Conventions

- `src/` layout with `@/*` path alias (create-next-app default) — `@/lib/...`,
  `@/components/...`.
- Types in `lib/types.ts` mirror `backend/app/models.py` field-for-field —
  update both together when the backend's `PostDraft`/`ContentOutput` shape
  changes.
- Shared small UI pieces (icons, badges) get their own file
  (`ReactionIcon.tsx`, `StatusBadge.tsx`) rather than being redefined per
  consumer — `ReactionIcon` was extracted this way after being duplicated
  between `PostDraftCard` and `LinkedInPreviewModal`.

## Next up

Phase 3 (not started): real LinkedIn OAuth + publishing. The frontend's
piece of this will be a "Connect LinkedIn" button that does a full-page
redirect (not `fetch`) to LinkedIn's authorization URL — see
`../stepslinkedin.txt` STEP 6 for the exact flow this needs to trigger and
what the backend will expect back.
