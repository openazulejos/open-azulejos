# Architecture

Open Azulejos is a static browser application hosted on Vercel. Vercel functions
validate requests and mediate privileged operations. Supabase provides Postgres,
PostGIS, Storage, contributor identities, and named administrator identities.

## Data flow

1. The browser captures a square derivative and retains a larger source frame.
2. `/api/uploads` returns short-lived signed upload URLs.
3. The derivative uploads to the public `azulejos` bucket; the source uploads to
   private `azulejos-originals`.
4. A small finalize request records GPS quality, photographer attribution, and
   explicit photo-license consent before creating a pending record.
5. The compatibility trigger mirrors `azulejos` into normalized archive tables.
6. Admin reads receive temporary signed URLs for private originals.
7. Contributor accounts authenticate through Supabase Auth and receive an
   HttpOnly application session with private email and public pseudonym split.
8. Named administrators authenticate through Supabase Auth; the API exchanges a
   verified active profile for a short-lived HttpOnly administrator session.
   The public map also recognizes contributor sessions whose `user_id` is an
   active `admin_profiles` row, so admins can beta-test capture outside Lisbon
   without opening the back office first.
9. Duplicate review first bounds candidates spatially in PostGIS, then ranks
   their public derivatives locally with a 64-bit perceptual difference hash.
10. Computed fingerprints are persisted on the compatibility record and its
   published media asset. A confirmed duplicate creates a reviewed similarity
   relation between physical instances; it never merges or deletes media.
11. A reviewed same-tile decision moves only the newer observation to the
    canonical physical instance. Its contribution, media, location, credit, and
    timestamps remain independent and available through observation history.
12. Finalization issues a random contribution receipt. Only its SHA-256 hash is
    stored; the browser keeps the token locally and exchanges it through a POST
    request to read that contribution's status and moderation reason.

The legacy `azulejos` table remains the write contract during migration. The v2
tables distinguish site, physical instance, observation, contribution, media,
treatment, moderation event, source, assertion, and similarity. New features
should target v2 while preserving the compatibility trigger until all clients
have migrated.

## Invariants

- Original files are immutable and private.
- Published images are derivatives and may be replaced without changing IDs.
- Every location stores GPS accuracy and provenance where available.
- Public capture rejects valid GPS outside Lisbon with a specific message;
  active administrators may bypass that boundary only for beta testing.
- A photo license is published only when its contributor credit and consent
  timestamp are both present.
- Every moderation transition creates an append-only event.
- Named moderation actions retain the administrator UUID in the audit event.
- Duplicate decisions preserve both physical instances and both contributions.
- Compatibility updates never undo a reviewed observation attachment.
- Unauthenticated public APIs never return private paths or moderation records.
- A contribution receipt grants access only to its matching status record and
  is never transported in a URL.
