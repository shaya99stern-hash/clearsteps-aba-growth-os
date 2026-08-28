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
**Status:** implemented and verified with real chromium-headless-shell launch. Latest durable-Outreach browser gate passed GitHub Actions run `33163044540`.

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
**Status:** implemented and build-verified. The initial schema has been safely applied to Neon production `main` and all expected Clear Steps tables were verified there. Vercel still needs a secure `DATABASE_URL` environment-variable attachment before deployed persistence becomes active.

## Card CS-008 — Operational Tasks workspace
**Goal:** Replace the Tasks placeholder with a ClickUp-style local-first operational board linked to CRM records.
**Acceptance:** user can create tasks with priority/due date, optionally link a saved CRM record, move tasks through Open → In Progress → Done, retain them in browser storage, and automatically sync/merge PostgreSQL tasks when durable storage is configured.
**Status:** implemented and verified in GitHub Actions, including task acceptance rules, Prisma validation/generation, ESLint, and full Next.js production build.

## Card CS-009 — Outreach preparation OS
**Goal:** Replace the Outreach placeholder with a compliant campaign/draft preparation workflow for eligible organization/professional contacts.
**Acceptance:** user can build a segment from outreach-eligible CRM records, prepare reviewed message drafts, and preserve suppression/manual-review boundaries without enabling uncontrolled bulk sending.
**Status:** implemented and verified. Reviewed drafts and email suppressions now sync to PostgreSQL through `/api/outreach/workspace`; the server independently re-checks durable CRM eligibility and suppressions before creating Campaign/CampaignRecipient records. GitHub Actions run `33163044505` passed outreach persistence acceptance, Prisma validate/generate, ESLint, and full Next.js production build. Sending remains intentionally disabled.

## Card CS-010 — Production database activation
**Goal:** Establish the real production PostgreSQL backing store without exposing credentials in code or Git history.
**Acceptance:** migrate the committed Prisma schema through a temporary Neon branch, verify the expected application tables, promote only after explicit approval, and leave credentials outside the repository.
**Status:** completed. Managed Neon migration `ac317531-8fcc-45db-aa4a-0983f3565cac` was tested, user-approved, promoted to Neon `main`, and the temporary migration branch was removed automatically. The production database contains 19 expected Clear Steps tables.

## Card CS-011 — Accessibility and release hardening
**Goal:** Remove high-confidence WCAG 2.2 AA barriers from the shared Clear Steps shell before release review.
**Acceptance:** keyboard users can bypass repeated navigation, active navigation is programmatically exposed, the document language/title/landmarks are correct, and remaining visual-focus/contrast items are explicitly verified rather than assumed.
**Status:** in verification. Shared skip-to-content/main landmark and `aria-current` navigation semantics have been implemented; final exact-head CI and remaining visual/manual checks are pending.
