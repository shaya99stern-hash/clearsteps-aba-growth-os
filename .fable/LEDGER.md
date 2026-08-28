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
**Acceptance:** runtime reports Playwright availability and browser collector works when dependency/browser are installed.
**Status:** adapter implemented; package/browser installation remains a follow-up deployment concern.

## Card CS-005 — Official source adapters
**Goal:** Add free authoritative sources that improve referral/provider evidence beyond general web search.
**Acceptance:** NJ licensed child-care records can join Scout referral discovery; CMS/NPPES current download files are discoverable without hardcoded dated URLs; parsers have deterministic fixture tests.
**Status:** implemented and verified in GitHub Actions run `33142651757`.

## Card CS-006 — Operational Sources surface
**Goal:** Expose live source capability/health inside Clear Steps rather than hiding connector state in code.
**Acceptance:** app route/API reports source purpose, method, availability, official-source freshness/details, and optional browser readiness without requiring paid keys.
**Status:** active.

## Card CS-007 — Durable CRM persistence
**Goal:** Move CRM/research history from browser-only storage to durable server persistence while preserving a usable fallback.
**Acceptance:** production-capable repository adapter and server routes persist eligible CRM records without placing intelligence-only community/talent signals into outreach records.
**Status:** planned; production database provider/driver still unresolved in this tool surface.
