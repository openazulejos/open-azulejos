# Roadmap

## Product direction

Open Azulejos is a community-built, open-source observatory of Lisbon's visible
azulejos. It is not an expert catalogue produced by a university or museum. Its
research value comes from broad geographic coverage, dated field observations,
repeat visits, transparent provenance, and reusable open data.

The core loop is:

1. notice an azulejo while walking;
2. record it in a few seconds;
3. see it appear after moderation;
4. receive recognition for a useful contribution;
5. return to complete an area or document change over time.

## Product invariants

- A photograph is a dated observation, not automatically a new physical tile
  or pattern.
- One physical instance may have many observations over time and many media
  assets. Earlier observations are never overwritten.
- First contribution remains possible without creating an account.
- The map remains the primary experience; profiles, scores, and campaigns stay
  secondary to seeing the city's azulejos.
- Public identity is a pseudonym; email and recovery information remain private.
- Recognition is based on approved, useful observations, never raw uploads.
- Precise locations remain public for approved observations by default; masking
  is an exceptional moderation decision, not a general loss of map accuracy.
- Observation date and estimated production period remain separate facts.
- Automated similarity and condition analysis propose evidence; they do not
  create historical claims without review.
- Public data contracts and governance remain independent from any exclusive
  institutional partnership.

## Foundation completed

- Canonical production domain at `openazulejos.com`, with Vercel/GitHub
  deployment automation and redirects from older Vercel hosts.
- Verified GitHub Actions media-and-record backups and documented restoration.
- Private original photographs and explicit public derivatives.
- PostGIS-backed locations and normalized archival entities.
- Named Supabase Auth admin accounts with a temporary recovery bridge.
- Contributor accounts with pseudonyms, private emails, contribution claiming,
  password recovery, and editable usernames.
- Installable PWA shell and offline-resilient contribution queue.
- Stable JSON-LD, IIIF Presentation 3, and LIDO 1.1 representations.
- Explicit CC BY 4.0 consent and photographer attribution for new contributions.
- Versioned JSON-LD, IIIF, LIDO, GeoJSON, and CSV collection exports, tested at
  100,000 records.
- Nearby perceptual-similarity ranking and persisted 64-bit image fingerprints.
- Administrator-reviewed duplicate relationships without destructive merging.
- Mobile-first square capture with preview, source-margin preservation,
  mandatory geolocation, iOS-oriented permission guidance, and admin-only
  outside-Lisbon beta capture.
- Account page contribution mosaic and About-page top-contributor list based on
  approved observations.
- Minimal admin image treatment tools: crop correction, four-point perspective
  rectification, white-point sampling, exposure/highlight adjustments, condition
  tags, source-margin recovery, adjacent-record navigation, and rejection
  workflow.

## Operational gaps

- Add `SUPABASE_DB_URL` to GitHub Actions so the native PostgreSQL `pg_dump`
  step runs in addition to the current record/media backup.
- Add independent S3-compatible backup storage, not only 30-day GitHub Actions
  artifacts.
- Run and document a monthly restore drill into an isolated Supabase project.
- Confirm that the founder contributor account and named admin profile remain
  linked in production, so admin-only beta capture works from the public map.
- Add lightweight monitoring for failed uploads, backup completion, pending
  moderation count, and API errors.

## Phase 1: temporal observation core

Target: next 4 to 8 weeks.

- Make repeated observations first-class: remove the remaining one-observation
  assumptions from compatibility tables and APIs.
- Extend admin relationships to distinguish `same physical tile`, `same
  pattern`, `colour variation`, and `possibly related`.
- Let moderation attach a new contribution to an existing physical instance
  while preserving both images, dates, locations, and credits.
- Record a deliberately small condition vocabulary: intact, crazed, chipped,
  missing, painted or covered, repaired, and unknown.
- Store structured condition evidence separately from optional free-text notes.
- Expose observation history through stable APIs before adding timeline UI.
- Add moderation reasons that can later be shown safely to contributors.

Success signals:

- repeat photographs create additional observations instead of duplicates;
- every approved contribution has an observation timestamp and provenance;
- moderators can resolve same-tile candidates without deleting evidence.

## Phase 2: progressive contributor identity

Target: 1 to 3 months.

- Give every installation a more durable random guest identity and recoverable
  claim token.
- Keep capture account-free and retain guest contributions across offline retry,
  browser restarts, and account creation.
- Refine the three-observation invitation so it feels playful rather than
  coercive; never block the fourth contribution.
- Evaluate whether password-based accounts should stay or whether magic-link
  login is simpler for the public contributor workflow.
- Expand the private contribution page with moderation dates, concise rejection
  reasons, and direct map links for approved observations.
- Make public profiles opt-in and never expose email, precise movement history,
  device identifiers, or rejected contributions.

Success signals:

- guest-to-account conversion can be measured without third-party tracking;
- contributors can find the outcome of every submission;
- returning contributors retain attribution across devices after authentication.

## Phase 3: recognition and collective collection

Target: 4 to 8 months.

- Count newly documented physical instances and verified temporal revisits as
  separate forms of recognition; never count submitted photos directly.
- Refine the About-page top-contributor list into an opt-in recognition system
  that can distinguish monthly, neighbourhood, and lifetime contributions.
- Offer monthly and neighbourhood views so new contributors can participate
  without competing against lifetime totals.
- Reward useful behaviours: first observation in a grid cell, a verified revisit,
  coverage of an incomplete street, and a contribution accepted without edits.
- Show map coverage and suggested nearby gaps without turning the map into a
  task dashboard.
- Run bounded collection walks and campaigns that can be shared with geocaching,
  urban-walking, local-history, architecture, and design communities.
- Add rate limits, duplicate warnings, and moderator workload metrics before any
  large public recruitment campaign.

Success signals:

- approval rate and geographic coverage rise together;
- repeat-contributor rate increases without increasing moderation time per item;
- no leaderboard metric can be improved merely by resubmitting the same tile.

## Phase 4: the city through time

Target: 6 to 12 months, after sufficient repeated observations exist.

- Add a map timeline based on observation dates, with an explicit latest-state
  mode and comparable historical snapshots.
- Let viewers move between observations of the same physical instance.
- Build neighbourhood summaries for observed colours, pattern recurrence,
  condition, loss, repair, and replacement.
- Publish methodology and uncertainty with every aggregate; do not present
  photographic estimates of age or condition as established facts.
- Release versioned, citable observation-level dataset snapshots with checksums.
- Provide reproducible notebooks or reference queries for researchers without
  requiring institutional access or changing community governance.

Success signals:

- temporal views are backed by actual repeat observations rather than image
  upload dates being misrepresented as object history;
- every chart can be reproduced from a public, versioned export;
- researchers can cite a dataset release and trace each result to observations.

## Phase 5: durable open infrastructure

Target: 12 to 24 months, triggered by measured use.

- Move image derivatives and map delivery only when storage, bandwidth, or
  latency measurements justify it.
- Evaluate MapLibre, PMTiles, IIIF Image API, and dedicated search infrastructure
  against documented operational requirements.
- Introduce assisted visual clustering and condition-change detection with a
  review queue and published algorithm versions.
- Establish technical, data-curation, and moderation maintainers.
- Create a sustainable legal entity only when funding, contracts, or provider
  ownership require one; preserve open data access and non-exclusive governance.

## Explicitly deferred

- A general discussion forum, because it creates a separate moderation system
  before the collection community is established.
- Mandatory registration before capture.
- Rewards based on raw upload volume or daily engagement streaks.
- Automatic historical dating, authorship, or conservation diagnosis from AI.
- Bulk replication of third-party catalogues without clear rights and provenance.
- Institutional features that do not improve public collection, data durability,
  or independent research reuse.

## Immediate implementation order

1. Harden backups: add `SUPABASE_DB_URL`, independent object storage, and a
   documented restore drill.
2. Confirm and, if needed, repair the `orson` contributor/admin account link in
   production.
3. Finish the many-observations-per-instance data contract.
4. Add reviewed relation types and non-destructive instance attachment in admin.
5. Add contributor-visible moderation dates and rejection reasons.
6. Design the durable guest identity and contribution-claim security model in an
   ADR.
7. Pilot repeated observations and condition vocabulary on existing records.
8. Build the timeline only after the temporal dataset is credible.
