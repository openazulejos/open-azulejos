# Backup and restore

Supabase database backups do not contain Storage objects. Open Azulejos therefore
backs up database records and every media object separately.

## Create and verify

The scheduled GitHub Actions workflow `archive backup` currently backs up all
records and media using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, verifies
checksums, and stores a 30-day GitHub artifact. Treat this as a useful recovery
layer, not the final backup architecture.

```sh
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/backup-open-azulejos.mjs --output /independent/location
node scripts/verify-backup.mjs /independent/location/<timestamp>
```

Also create a native PostgreSQL dump with `pg_dump` using a read-only backup
connection. In GitHub Actions this requires the missing `SUPABASE_DB_URL`
secret; until it is set, the PostgreSQL dump step is skipped. Copy both outputs
to storage controlled by a different provider. Long-term backup should use
S3-compatible storage or another provider account independent from Supabase and
Vercel.

## Restore drill

Validate without changing a database:

```sh
node scripts/restore-open-azulejos.mjs --backup /path/to/backup
```

Restore only into an empty, migrated test project:

```sh
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/restore-open-azulejos.mjs --backup /path/to/backup --apply
```

After restoration, compare record and asset counts, open random originals and
derivatives, test moderation, and record recovery time. Never test restoration
against production. Target RPO is 24 hours and target RTO is four hours.
