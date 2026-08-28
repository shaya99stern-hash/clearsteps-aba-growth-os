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
**Status:** implemented and verified with real chromium-headless-shell launch.

## Card CS-005 — Official source adapters
**Goal:** Add free authoritative sources that improve referral/provider evidence beyond general web search.
**Acceptance:** official source adapters join Scout discovery; CMS/NPPES current download files are discoverable without hardcoded dated URLs; parsers have deterministic fixture tests.
**Status:** Phase 1 NJ adapter implemented. Phase 3 replaces the NJ-first product target with Missouri/Kansas official adapters while preserving historical code until the replacement is verified.

## Card CS-006 — Operational Sources surface
**Goal:** Expose live source capability/health inside Clear Steps rather than hiding connector state in code.
**Acceptance:** app route/API reports source purpose, method, availability, official-source freshness/details, and optional browser readiness without requiring paid keys.
**Status:** implemented and build-verified.

## Card CS-007 — Durable CRM persistence
**Goal:** Move CRM from browser-only storage to durable server persistence while preserving a usable fallback.
**Acceptance:** production-capable PostgreSQL/Prisma repository and server routes persist only eligible CRM records; browser storage remains functional when `DATABASE_URL` is absent.
**Status:** implemented and build-verified. The initial schema has been safely applied to Neon production `main`; the active Vercel project still requires its secure `DATABASE_URL` attachment for deployed durability.

## Card CS-008 — Operational Tasks workspace
**Goal:** Replace the Tasks placeholder with a ClickUp-style local-first operational board linked to CRM records.
**Acceptance:** user can create tasks with priority/due date, optionally link a saved CRM record, move tasks through Open → In Progress → Done, retain them in browser storage, and automatically sync/merge PostgreSQL tasks when durable storage is configured.
**Status:** implemented and verified.

## Card CS-009 — Outreach preparation OS
**Goal:** Replace the Outreach placeholder with a compliant campaign/draft preparation workflow for eligible organization/professional contacts.
**Acceptance:** user can build a segment from outreach-eligible CRM records, prepare reviewed message drafts, and preserve suppression/manual-review boundaries without enabling uncontrolled bulk sending.
**Status:** implemented and verified. Sending remains intentionally disabled.

## Card CS-010 — Production database activation
**Goal:** Establish the real production PostgreSQL backing store without exposing credentials in code or Git history.
**Acceptance:** migrate the committed Prisma schema through a temporary Neon branch, verify the expected application tables, promote only after explicit approval, and leave credentials outside the repository.
**Status:** completed. Neon production `main` contains the initial 19-table Clear Steps schema.

## Card CS-011 — Accessibility and release hardening
**Goal:** Remove high-confidence WCAG 2.2 AA barriers from the shared Clear Steps shell before release review.
**Acceptance:** keyboard users can bypass repeated navigation, active navigation is programmatically exposed, the document language/title/landmarks are correct, and browser tests verify focus/reflow behavior.
**Status:** Phase 2 implemented shared skip navigation, `aria-current`, focus styling, and real-browser CRM checks. Phase 3 must preserve these guarantees in the new phone navigation.

## Card CS-012 — Missouri/Kansas 120-indicator intelligence model
**Goal:** Replace the nine-signal territory heuristic with a 120-indicator evidence model shared by Client, RBT, and BCBA engines.
**Acceptance:** indicator definitions are unique, grouped into twelve pillars, declare applicable engines/direction/source classes, and can produce explainable per-engine coverage/confidence without inventing missing values.
**Status:** active Phase 3 card.

## Card CS-013 — Missouri/Kansas regulatory + payer rule engine
**Goal:** Encode current official ABA licensure, supervision, Medicaid, and commercial-coverage constraints as versioned rules rather than prompt/model memory.
**Acceptance:** rules include official URL, state, domain, effective date, applicable roles/payers, and `PASS/REVIEW/BLOCK/INFO` posture; uncertain applicability is never silently converted into a score.
**Status:** active Phase 3 card.

## Card CS-014 — MO/KS authoritative source mesh
**Goal:** Make first-party Missouri/Kansas sources and federal provider/demographic data the primary Scout evidence foundation.
**Acceptance:** Scout can return real MO/KS public evidence from at least federal NPPES/demographics plus state-specific official sources; generic web search is fallback/enrichment rather than the sole provider.
**Status:** active Phase 3 card.

## Card CS-015 — Native iPhone CRM/navigation system
**Goal:** Preserve dense HubSpot/ClickUp desktop operation while making the installed iPhone PWA fast, compact, and native-feeling.
**Acceptance:** phone uses five persistent destinations (Scout, Territories, CRM, Tasks, More), removes the horizontally scrolling desktop nav and redundant Scout actions, keeps primary information above the fold at 320–440px, and preserves keyboard/focus semantics.
**Status:** active Phase 3 card.

## Card CS-016 — ABA Engine PWA identity
**Goal:** Remove inherited Property Scout identity from the installed Clear Steps app.
**Acceptance:** installed application title is `ABA Engine`, app icon is a light-purple ABA Engine mark generated from project source, and in-product branding remains Clear Steps.
**Status:** active Phase 3 card.
