# Operations

## Secrets

`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_KEY`, and `ADMIN_SESSION_SECRET` are
server-only. Rotate them after suspected exposure. Production must use a random
session secret distinct from the human-entered admin password.

`SUPABASE_DB_URL` is required for native PostgreSQL dumps in GitHub Actions but
is not needed by the runtime app. Prefer a read-only backup role. Do not commit
the database URL, publishable key, service role key, or downloaded `.env` files.

After signing in with the temporary key, the owner creates the first named
Supabase Auth administrator in the back office. The key exchange remains only as
a compatibility bridge and must be removed after two named owner accounts are
verified on separate devices.

Admins who also have a public contributor account should keep the contributor
`user_id` linked to an active `admin_profiles` row. That link is what allows
admin-only outside-Lisbon beta capture from the public map.

## Monitoring thresholds

- Alert when upload failures exceed 1% in 30 minutes.
- Alert when API p95 exceeds 500 ms for 15 minutes.
- Alert when no verified backup completes within 26 hours.
- Alert at 70%, 85%, and 95% of storage or egress budget.
- Review architecture when a viewport query returns its 1,200-item cap or the
  map takes longer than one second to become interactive.

## Routine

- Daily: inspect failed uploads, backup status, and pending moderation count.
- Daily during beta: verify that at least one admin can capture from the public
  map and that non-admin users outside Lisbon receive the Lisbon-only message.
- Weekly: review costs, errors, rejected content, and access logs.
- Monthly: restore the latest backup into an isolated test project.
- Quarterly: rotate recovery credentials and verify two maintainers can recover
  the domain, Vercel project, Supabase project, and backup account.
