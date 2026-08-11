# Open Azulejos repository guide

## Scope

Open Azulejos is a conservation research map and photographic archive. Preserve
the quiet map-first interface, the existing public URLs, and the integrity of
production records.

## Current architecture

- Browser: static HTML, CSS, vanilla JavaScript, and Leaflet.
- Hosting/API: Vercel and Vercel functions.
- Data: Supabase Postgres/PostGIS, Auth, and Storage.
- The legacy `azulejos` table remains a compatibility write contract while the
  normalized archive tables become the long-term model.

Do not replace this stack without an accepted ADR supported by measured
reliability, latency, maintainability, or cost evidence.

## Working rules

- Read `docs/ARCHITECTURE.md` and relevant ADRs before changing data flows.
- Add a new timestamped migration; never rewrite an applied migration.
- Never perform a destructive production operation without a recent verified
  backup and an explicit recovery plan.
- Keep originals private and immutable. Public images are derivatives.
- Do not expose service keys, private object paths, moderation data, or admin
  sessions to public clients.
- Preserve GPS provenance and accuracy. A contribution without location must
  not be submitted.
- Do not assign an open license to historic photographs retroactively.
- Keep changes scoped and avoid unrelated formatting or generated-file churn.

## Commands

- Static checks: `npm run check`
- Test suite: `npm test`
- Android browser suite: `npm run test:android`
- Local static app: `python3 -m http.server 4173`
- Full Vercel runtime: `npx vercel dev`
- Verify a backup: `npm run backup:verify -- <backup-directory>`

## Done criteria

A change is complete when checks and tests pass, relevant desktop and mobile
flows have been exercised, migrations are non-destructive, documentation is
updated for changed contracts, and production deployment has been verified when
deployment is part of the task.
