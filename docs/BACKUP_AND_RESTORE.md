# Backup and restore

Supabase database backups do not contain Storage objects. Open Azulejos therefore
backs up database records and every media object separately.

## Create and verify

The scheduled GitHub Actions workflow `archive backup` backs up all records and
media using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, creates a native
PostgreSQL dump from `SUPABASE_DB_URL`, verifies checksums, stores a 30-day
GitHub artifact, and copies a compressed archive to independent S3-compatible
storage. It downloads that archive again and compares its SHA-256 digest. A
missing database URL or independent destination fails the run instead of
reporting a partial backup as successful.

```sh
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/backup-open-azulejos.mjs --output /independent/location
node scripts/verify-backup.mjs /independent/location/<timestamp>
```

The GitHub workflow runs `pg_dump` and `pg_restore --list` through the official
PostgreSQL 17 Docker client. For Supabase projects whose direct database
hostname resolves to IPv6, use the Supabase IPv4 session pooler connection in
`SUPABASE_DB_URL`. Prefer a read-only backup role when one is available.

Configure these GitHub Actions secrets before merging the workflow:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_URL`.
- `BACKUP_S3_URI`, for example `s3://private-backup-bucket/openazulejos`.
- `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY`, and
  `BACKUP_AWS_REGION` for an account with write and read access to that prefix.
- `BACKUP_S3_ENDPOINT` only when the independent provider requires a custom
  S3 API endpoint.

Use a private bucket in an account independent of Supabase and Vercel. Restrict
access to the backup operator, enable provider-side encryption and retention,
and periodically test retrieval. The archive includes private originals and a
full database dump; never publish it. The object key contains the GitHub run ID,
so each run gets a distinct copy. The GitHub artifact remains a short-lived
second copy.

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

## Monthly drill record

Once per month, create or reset an isolated Supabase test project, apply the
repository migrations, and download the latest archive from independent storage.
Verify the archive with `npm run backup:verify -- <backup-directory> --require-database` and inspect
the database dump with `pg_restore --list database.backup`. Confirm that the
test project has no production records, set its URL and service key only in the
drill shell, then run the `--apply` command above. Check row and object counts
against `manifest.json`, open several published images and private originals,
and exercise a moderation action in the test project. Record the date, backup
run ID, test project reference, counts, elapsed recovery time, outcome, and any
gaps in a private operations log. Delete or reset the isolated project after
recording the result.

The `--apply` script restores compatibility records and listed media objects.
The native PostgreSQL dump is a separate recovery source for database state
beyond those records; restoring it into Supabase requires a planned migration
procedure because the project already contains managed schemas. Do not feed a
full dump directly into production.
