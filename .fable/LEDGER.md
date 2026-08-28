# Clear Steps Fable Ledger

## Card CS-001 — Free source mesh
**Goal:** Replace paid-API dependency as the only live discovery path.
**Acceptance:** `/api/intelligence/search` can run without API credentials and returns either evidence-backed public results or an explicit empty/error response.
**Status:** implemented and verified in GitHub Actions.

## Card CS-002 — Territory intelligence
**Goal:** Convert public community/referral/provider/talent signals into an explainable 0–100 territory score.
**Acceptance:** every search response contains a territory score, confidence, breakdown-derived reasoning, and no household-level record.
**Status:** implemented and verified in GitHub Actions.

## Card CS-003 — Navi-style Scout + CRM
**Goal:** Provide a mobile-first research surface and save qualified referral/talent leads into stage-based pipelines.
**Acceptance:** Scout can save a result locally and Pipeline/Talent surfaces render it in the correct stage.
**Status:** implemented; React 19 browser-store subscription path repaired and build-verified.

## Card CS-004 — Playwright browser acquisition
**Goal:** Enable public JS-rendered forms/pages as an optional acquisition method.
**Acceptance:** runtime reports real browser availability and the browser collector can launch installed Chromium, while blocking private-network requests and revalidating final navigation targets.
**Status:** implemented and verified with real chromium-headless-shell launch in GitHub Actions run `33152086411` on head `44cf09af277495f2dfd3168341e38f861c74670f`.

## Card CS-005 — Official source adapters
**Goal:** Add free authoritative sources that improve referral/provider evidence beyond general web search.
**Acceptance:** NJ licensed child-care records can join Scout referral discovery; CMS/NPPES current download files are discoverable without hardcoded dated URLs; parsers have deterministic fixture tests.
**Status:** implemented and verified in GitHub Actions.

## Card CS-006 — Operational Sources surface
**Goal:** Expose live source capability/health inside Clear Steps rather than hiding connector state in code.
**Acceptance:** app route/API reports source purpose, method, availability, official-source freshness/details, and optional browser readiness without requiring paid keys.
**Status:** implemented and build-verified.

## Card CS-007 — Durable CRM persistence
**Goal:** Move CRM from browser-only storage to durable server persistence while preserving a usable fallback.
**Acceptance:** production-capable PostgreSQL/Prisma repository and server routes persist only eligible CRM records; browser storage remains functional when `DATABASE_URL` is absent.
**Status:** implemented and build-verified; initial PostgreSQL migration exists. Production database attachment remains deployment configuration, not an application-code blocker.

## Card CS-008 — Operational Tasks workspace
**Goal:** Replace the Tasks placeholder with a ClickUp-style local-first operational board linked to CRM records.
**Acceptance:** user can create tasks with priority/due date, optionally link a saved CRM record, move tasks through Open → In Progress → Done, retain them in browser storage, and automatically sync/merge PostgreSQL tasks when durable storage is configured.
**Status:** implemented and verified in GitHub Actions run `33152082863` on head `44cf09af277495f2dfd3168341e38f861c74670f`, including task acceptance rules, Prisma validation/generation, ESLint, and full Next.js production build.

## Card CS-009 — Outreach preparation OS
**Goal:** Replace the Outreach placeholder with a compliant campaign/draft preparation workflow for eligible organization/professional contacts.
**Acceptance:** user can build a segment from outreach-eligible CRM records, prepare reviewed message drafts, and preserve suppression/manual-review boundaries without enabling uncontrolled bulk sending.
**Status:** implemented and verified in GitHub Actions run `33152082863` on head `44cf09af277495f2dfd3168341e38f861c74670f`. Referral eligibility, suppression, template rendering, manual review, Prisma, lint, and production build all pass. Sending remains intentionally disabled.
