# ADR 0002: staged adoption of the strategic specification

Status: accepted, 2026-07-02.

The strategic specification is the research and interoperability direction for
Open Azulejos. It is not a requirement to replace working infrastructure before
the archive has evidence that a replacement is needed.

## Adopt now

- Event-oriented normalized records compatible with CIDOC CRM concepts.
- Moderated contributions with append-only provenance.
- Private immutable originals and replaceable public derivatives.
- Offline-resilient capture and submission.
- Contributor identities, account mosaics, and restrained top-contributor
  acknowledgements based on approved observations.
- Stable public identifiers and future JSON-LD, IIIF Presentation, and LIDO
  exports.
- Explicit rights, attribution, and contributor consent for future releases.
- PostGIS queries, portable backups, checksums, and documented restoration.

## Retain

- Supabase Postgres/PostGIS, Auth, and Storage.
- Vercel hosting and functions.
- Leaflet and the current vanilla JavaScript map interface.
- The current moderation workflow and compatibility table during migration.
- Vercel/GitHub deployment automation and the canonical
  `openazulejos.com` domain.

These choices already satisfy the immediate operational needs and remain
portable through standard SQL, PostGIS, object paths, and versioned exports.

## Defer behind measurable triggers

- Arches or another dedicated heritage platform: reconsider when institutional
  workflows cannot be represented cleanly in the normalized model.
- MapLibre and PMTiles: reconsider when vector rendering, offline basemaps, or
  Leaflet performance becomes a measured constraint.
- Cantaloupe or another IIIF Image API server: reconsider when region/size
  requests and institutional image federation justify operating it.
- Elasticsearch/OpenSearch: reconsider when Postgres full-text, spatial, and
  similarity indexes no longer meet measured search latency targets.

Every deferred migration requires a separate ADR, a reversible migration plan,
and a verified production backup.
