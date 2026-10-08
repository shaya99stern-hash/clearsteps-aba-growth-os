# Clear Steps — Active Product Contract

Clear Steps is an evidence-first ABA lead-intelligence, recruiting, referral-growth, outreach, and CRM operating system.

## Current product definition (2026-10)

Clear Steps now operates as **three lead engines sharing one durable CRM core**:

1. **Client Engine** — ranks Missouri, Kansas, and Colorado territories and public organization-level referral opportunities likely to produce qualified client demand.
2. **RBT Engine** — ranks labor markets, employers, hiring signals, training pipelines, public candidate signals, payer readiness, and technician compliance constraints.
3. **BCBA Engine** — ranks analyst labor markets, licensed-professional supply, open roles, supervision capacity, payer readiness, and state licensure constraints.

The product is constrained to **Missouri, Kansas, and Colorado** for new Scout research. Existing historical CRM records from other states are preserved but are not used as new territory targets.

## Intelligence architecture

Scout is not a single web search. A research run must produce an evidence graph:

`public sources -> normalized observations -> entity resolution -> regulatory/payer gates -> engine scores -> explainable lead dossier`

The target model contains **300 independently addressable indicator hypotheses** across thirty pillars:

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
## Cross-source public intelligence expansion (October 2026)

- 120 initial model indicators plus 60 broad institutional hypotheses plus 120 age-2–18 public institutional hypotheses across 30 pillars.
- 60 explicitly paired cross-source tests, status supported, partial, or unobserved based on actual evidence.
- 274 registered candidate public publisher domains across Missouri, Kansas, Colorado, federal, and national sources. Registered does NOT mean queried, accessible, verified, or integrated.
- Discovery without user API keys: bounded public HTML search, public RSS fallback, direct official agency datasets, NPPES, and keyless Census Reporter ACS.
- City/county matching is required before public discussion can contribute to local market scoring.
- Multiple search snippets from one publisher count as ONE source. Strong corroboration requires independent domains and relevant first-party or authoritative evidence.
- Lead dossiers expose independent claim confirmations, conflicts over intake/hiring, source dates and missing evidence.
- Enacted Colorado HB26-1425 has practitioner licensing starting July 1, 2028; clinic and payer rules have separate review obligations.
- No residential sign-to-home disability inference or family profiles. Public discussion is aggregated only.

## Shipping and verification

Tests include verify:aba-engine, verify:colorado-signals, verify:evidence-mesh, state-source checks, production build, mobile Playwright and a non-gating real public-source smoke.
Green code tests do not prove public hosts return live results, cross-device database persistence or active daily monitoring. Always report live source status independently.

## Age-2–18 research scope and tripled discovery catalog (October 2026)

- The **Client** research engine requires independent, geographically matching public **institutional** evidence aligned to ages 2–18 or a clearly contained age subrange. Recruitment for adult RBT/BCBA professionals is not age-filtered.
- Age-only community signs near a household, personal family stories, posts and household coordinates are never contact leads. Public municipal campaigns, city budgets, district programs, accessible transit and local press can inform **aggregate** market context.
- Two independent domain names repeating identical published copy are **not** independent corroboration; contradictory evidence is retained for review.
- Registering 274 candidate sites is not 274 working API collectors. Source status must reveal the number actually searched, returned and independently corroborated; keyless-only and public pages.
- The current ACS data groups ages 0–2 and 3–17. Ages 2 and 18 cannot be separated from those tables, so Clear Steps currently only displays observed ages 3–17; exact age-2–18 census population remains **unknown**, never estimated without single-year age data.
- The 60 crosschecks test relationship hypotheses; they do not claim confirmed relationships without corroborating sources.
