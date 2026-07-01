# Architecture

Open Azulejos is a static browser application hosted on Vercel. Vercel functions
validate requests and mediate privileged operations. Supabase provides Postgres,
PostGIS, Storage, and named administrator identities.

## Data flow

1. The browser captures a square derivative and retains a larger source frame.
2. `/api/uploads` returns short-lived signed upload URLs.
3. The derivative uploads to the public `azulejos` bucket; the source uploads to
   private `azulejos-originals`.
4. A small finalize request records GPS quality and creates a pending record.
5. The compatibility trigger mirrors `azulejos` into normalized archive tables.
6. Admin reads receive temporary signed URLs for private originals.
7. Named administrators authenticate through Supabase Auth; the API exchanges a
   verified active profile for a short-lived HttpOnly application session.

The legacy `azulejos` table remains the write contract during migration. The v2
tables distinguish site, physical instance, observation, contribution, media,
treatment, moderation event, source, assertion, and similarity. New features
should target v2 while preserving the compatibility trigger until all clients
have migrated.

## Invariants

- Original files are immutable and private.
- Published images are derivatives and may be replaced without changing IDs.
- Every location stores GPS accuracy and provenance where available.
- Every moderation transition creates an append-only event.
- Named moderation actions retain the administrator UUID in the audit event.
- Public APIs never return private paths or moderation records.
