# Clear Steps · ABA Engine

**An evidence-first growth operating system for ABA referral, workforce and territory decisions in Missouri and Kansas.** This repository is not a patient finder, a generic contact scraper, or a source of clinical or legal approvals.

## Start here

The main experience is **Scout**. Choose a lead engine (Clients, RBTs or BCBAs), choose Missouri or Kansas, enter a city/ZIP/county and run a public-source investigation. Review the evidence, coverage, confidence, current state/payer rule references, and unknowns before saving any eligible organization or recruiter-sourced candidate to the relevant CRM.

- **Scout** (`/`): bounded official/public research, public-source enrichment and dossiers, with a summary saved to this device after successful runs.
- **Map** (`/map`): county scores and census-tract hotspots statewide; click a point or enter an address to see licensed child care (priority / confirmed / unconfirmed), ABA providers, pediatric practices, schools and hospitals, with 202 indicators at 2, 5 and 10 miles and eight two-source convergence tests.
- **Territories** (`/territories`): rank every county with 90 cross-source data joins (51 need no API key), then compare latest research summaries per market, state and engine; spot thin or aging evidence; re-run a scan with its original scope.
- **Intelligence** (`/intelligence`): prioritize overdue tasks, high-evidence CRM items and markets needing verification. Create linked verification tasks; no messages are sent.
- **Referral CRM** (`/pipeline`): review referral organizations by lifecycle stage.
- **Talent CRM** (`/talent`): manage recruiting opportunities with separate verification boundaries.
- **Tasks** (`/tasks`): prioritize and track operational work, optionally linking CRM records.
- **Outreach** (`/outreach`): manual-review drafts and suppression workflows; sending is intentionally unavailable.
- **Sources** (`/connectors`): public-source inventory and health.

## Research runtime

Scout fans out to Census, NPPES, state registries and keyless public search under a 60-second serverless limit. All collectors run on one deadline-bounded timeline:

- Official collectors and the public search plan start together; website enrichment, institutional website resolution, competitor-review discovery and weak-clue follow-up run in two concurrent tracks.
- Each stage has a cutoff. When an upstream is slow, Scout returns the evidence it has and lists the stages it stopped waiting on (`timing.truncatedStages`) instead of being killed with no answer.
- Search results and enriched pages are cached for 30 minutes per server instance, robots.txt for an hour, and identical in-flight requests are coalesced.
- Each search provider has bounded concurrency and a circuit breaker, so a provider that is rate-limiting is skipped for two minutes instead of costing a timeout on every query.
- Pillar scores weight each observation by its confidence.

## Run locally

Requires Node 22+, npm, and a PostgreSQL instance only if durable server-side persistence is desired.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. If no `DATABASE_URL` is configured, CRM and tasks operate using browser-local fallback storage and the API reports the database as unavailable. Research summaries used by Territories/Intelligence are intentionally limited to the latest 30 on the current device; **they do not automatically sync across devices**.

For a database-backed environment, supply `DATABASE_URL` as a server-only secret through the deployment provider, apply the checked-in Prisma migrations and verify authorization/access controls before exposing durable customer data. Do not commit credentials.

## Quality gates

```bash
npm run verify:intelligence
npm run verify:aba-engine
npm run verify:scout-runtime
npm run verify:command-center
npm run lint
npm run build
```

GitHub Actions also checks official-source collectors, research persistence, task/CRM/outreach rules and a real Chromium smoke flow. All tests and pages must pass before deploying.

## Operating rules

Research is restricted to MO and KS for new Scout scans. Historical CRM data from elsewhere is preserved but is not an acquisition target.

Research must cite public evidence and distinguish confidence, coverage, recency, constraints and unknowns. Scores prioritize human review; they **do not** confirm actual waitlists, clinical need, payer coverage, professional licensure, reimbursement, outreach consent or legal eligibility. State rules must be checked against effective, official first-party sources before use.

No parent/child dossiers, individual disability inference, household-level targeting, private-group access, login/CAPTCHA bypassing, PHI-based marketing or use of verification-only registries as recruiting lists. Outreach is never sent automatically.

See [docs/SPEC.md](docs/SPEC.md) for the current product contract.
