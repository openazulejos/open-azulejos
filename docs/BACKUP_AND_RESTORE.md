# Backup and restore

Supabase database backups do not contain Storage objects. Open Azulejos therefore
backs up database records and every media object separately.

## Create and verify

```sh
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/backup-open-azulejos.mjs --output /independent/location
node scripts/verify-backup.mjs /independent/location/<timestamp>
```

Also create a native PostgreSQL dump with `pg_dump` using a read-only backup
connection. Copy both outputs to storage controlled by a different provider.

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
