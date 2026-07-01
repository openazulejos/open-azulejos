# ADR 0001: portable managed foundation

Status: accepted, 2026-07-01.

Open Azulejos will retain Vercel and Supabase while the collection is small. It
will avoid provider lock-in through Postgres migrations, PostGIS standard types,
S3-compatible object paths, independent backups, checksums, and versioned public
exports. Migration will be triggered by measured reliability, latency, or cost,
not by an arbitrary image count.
