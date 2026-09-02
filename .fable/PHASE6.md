# Phase 6 — Production Activation + Lead Engine Hardening

Started from merged main `c233dabf4b24032702781d5f399933e0a883bc98`.

## Goals
- keep Phase 5 Missouri/Kansas Scout + persistence behavior intact
- make the active work visible in a new GitHub pull request and Vercel preview
- verify production Neon schema read-only before any migration attempt
- attach a valid production database connection to the canonical Vercel project
- verify `/api/crm/leads`, `/api/tasks`, and Scout persistence against deployed Postgres
- continue Missouri/Kansas client/RBT/BCBA source expansion only after production persistence is proven

## Safety
- do not replay the full init migration if the production schema already exists
- do not place database credentials in source control
- keep production writes behind verified schema and deployment checks
