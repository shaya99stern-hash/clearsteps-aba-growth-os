# Clear Steps — Active Product Contract

Clear Steps is an evidence-first ABA lead-intelligence, recruiting, referral-growth, outreach, and CRM operating system.

## Phase 3 product definition

Clear Steps now operates as **three lead engines sharing one durable CRM core**:

1. **Client Engine** — ranks Missouri and Kansas territories and public organization-level referral opportunities likely to produce qualified client demand.
2. **RBT Engine** — ranks labor markets, employers, hiring signals, training pipelines, public candidate signals, payer readiness, and technician compliance constraints.
3. **BCBA Engine** — ranks analyst labor markets, licensed-professional supply, open roles, supervision capacity, payer readiness, and state licensure constraints.

The product is constrained to **Missouri and Kansas** for new Scout research. Existing historical CRM records from other states are preserved but are not used as new territory targets.

## Intelligence architecture

Scout is not a single web search. A research run must produce an evidence graph:

`public sources -> normalized observations -> entity resolution -> regulatory/payer gates -> engine scores -> explainable lead dossier`

The target model contains at least **120 independently addressable indicators** across twelve pillars:

- child/demographic demand
- developmental and public-program demand
- referral ecosystem
- ABA provider supply/capacity
- payer and reimbursement economics
- geographic access
- RBT workforce
- BCBA workforce
- competitive/market movement
- regulatory and credentialing constraints
- organization/referral quality
- evidence quality and trend persistence

Every observation should carry source provenance, capture/effective dates, geography, confidence, freshness, and whether it is a score signal or a hard compliance gate.

## Regulatory and payer rules

Legal and payer rules are **versioned knowledge**, not model memory. Each rule must include state, domain, applicable role/payer, effective date, official source URL, and a conservative result of `PASS`, `REVIEW`, `BLOCK`, or `INFO`.

Initial official rules include:

- Missouri behavior-analyst practice/licensure requirements under RSMo 337.315.
- Missouri MO HealthNet RBT credential rule and 90-day grace period published 2026-06-26.
- Missouri autism/ABA coverage requirements under RSMo 376.1224.
- Kansas Applied Behavior Analysis Licensure Act, including LBA/LaBA and line-therapist constructs under K.S.A. 65-7502 and 65-7503.
- Kansas autism/ABA commercial coverage rules under K.S.A. 40-2,194.

Rules may block a workflow even when market scores are high. A legal or payer failure is never converted into a favorable score.

## Acquisition model

- **Node/Next.js is the orchestrator.** Prefer direct downloads, JSON, CSV/XLSX parsing, public APIs without paid keys, and first-party HTML.
- **Playwright is a bounded fallback** for legitimate public JS-rendered pages that cannot be acquired reliably with fetch.
- No login bypassing, CAPTCHA bypassing, private groups, private-network requests, or household-level disability targeting.
- Search-engine HTML is a fallback/enrichment layer, not the primary evidence foundation for Missouri/Kansas.
- Strong conclusions should prefer two independent sources and a first-party source when one exists.

## Mobile information architecture

Desktop keeps a dense HubSpot/ClickUp-style operator rail. iPhone/PWA uses a separate native-feeling presentation with five persistent destinations:

- Scout
- Territories
- CRM
- Tasks
- More

The phone view must not expose the complete desktop navigation as a horizontally scrolling strip. Screen-specific top bars contain only relevant actions. The Scout hero is compact on phone so the research composer is visible immediately.

## PWA identity

The installed application is labeled **ABA Engine** while the in-product brand remains **Clear Steps**. The app icon uses a restrained light-purple ABA Engine mark rather than the inherited Property Scout artwork.

## Non-negotiable boundaries

- Public community discussions are aggregated as territory signals.
- No parent/child dossiers and no household-level autism/disability inference.
- No targeting individual families from diagnoses, school records, signs, posts, or inferred health status.
- No private group scraping or login/CAPTCHA bypassing.
- Verification-only registries are not bulk recruiting lists.
- Public named professionals may be verified when already discovered through a legitimate recruiting or professional source.
- Source provenance, freshness, confidence, conflicts, and unknowns stay visible in the UI.
- The product may encode official legal/payer requirements, but uncertain applicability must be surfaced as `REVIEW`, not guessed.