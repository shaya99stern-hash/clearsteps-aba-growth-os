# Clear Steps Fable Ledger

## Card CS-001 — Free source mesh
**Goal:** Replace paid-API dependency as the only live discovery path.
**Acceptance:** `/api/intelligence/search` can run without API credentials and returns either evidence-backed public results or an explicit empty/error response.
**Status:** implemented in feature branch.

## Card CS-002 — Territory intelligence
**Goal:** Convert public community/referral/provider/talent signals into an explainable 0–100 territory score.
**Acceptance:** every search response contains a territory score, confidence, breakdown-derived reasoning, and no household-level record.
**Status:** implemented in feature branch.

## Card CS-003 — Navi-style Scout + CRM
**Goal:** Provide a mobile-first research surface and save qualified referral/talent leads into stage-based pipelines.
**Acceptance:** Scout can save a result locally and Pipeline/Talent surfaces render it in the correct stage.
**Status:** implemented in feature branch.

## Card CS-004 — Playwright browser acquisition
**Goal:** Enable public JS-rendered forms/pages as an optional acquisition method.
**Acceptance:** runtime reports Playwright availability and browser collector works when dependency/browser are installed.
**Status:** adapter implemented; package installation blocked by npm DNS in current execution environment.
