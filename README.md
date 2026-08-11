# Open Azulejos

Open Azulejos is a participatory map and photographic archive for documenting
Lisbon azulejos in place. Contributions combine a square image, retained source
frame, GPS quality metadata, moderation history, and a stable geographic record.

Production: [openazulejos.com](https://openazulejos.com)

Source: [github.com/openazulejos/open-azulejos](https://github.com/openazulejos/open-azulejos)

## Current capabilities

- Mobile camera and photo-library capture with square preview and hidden margin.
- Required photographer credit and explicit CC BY 4.0 consent for new photos.
- Mandatory recent GPS position with accuracy checks and live map location;
  public recording is Lisbon-only, while active admins may beta-test capture
  outside Lisbon.
- Pending-by-default moderation and a mobile-compatible image editor.
- Perspective correction, tonal adjustments, white point, and border recovery.
- Grid-aligned map images, viewport sampling, fullscreen mosaic viewer, and LQIP.
- Contributor accounts with pseudonyms, private emails, editable usernames,
  contribution claiming, account mosaics, and an About-page top-contributor
  list based on approved observations.
- Installable PWA shell and an IndexedDB submission queue that retries after a
  network interruption.
- Stable CIDOC CRM-oriented JSON-LD, IIIF Presentation 3, and LIDO 1.1 records.
- Cursor-paginated JSON-LD, IIIF, LIDO, GeoJSON, and CSV collection exports.
- PostGIS-backed archive foundation and private storage for new source images.
- GitHub Actions record/media backups with checksums, native PostgreSQL dumps,
  and a dry-run restore command; independent long-term storage remains an
  operational hardening task.

## Local development

The public frontend can be served without a build step:

```sh
python3 -m http.server 4173
```

Vercel functions require the Vercel CLI and local environment variables:

```sh
npx vercel dev
```

Never place production credentials in source files. Use `.env.local`, which is
ignored by Git.

## Verification

```sh
npm run check
npm test
npx playwright install chromium
npm run test:android
npm run harvest -- --format geojson --output ../openazulejos-harvest
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

The Android browser suite runs the public map, grid, canva, dark mode, GPS,
onboarding, and camera-permission flows against Pixel 8, Galaxy S24, and Galaxy
Tab S9 profiles. Network and archive responses are mocked, so it does not write
to production or consume Supabase bandwidth.

## Architecture and project policy

- [Architecture](docs/ARCHITECTURE.md)
- [Backup and restore](docs/BACKUP_AND_RESTORE.md)
- [Operations](docs/OPERATIONS.md)
- [Interoperability](docs/INTEROPERABILITY.md)
- [Strategic specification adoption](docs/decisions/0002-strategic-spec-adoption.md)
- [Roadmap](ROADMAP.md)
- [Governance](GOVERNANCE.md)
- [Contributing](CONTRIBUTING.md)
- [Licenses](LICENSES.md)
- [Security](SECURITY.md)

The `azulejos` table remains a compatibility contract while normalized archive
tables are introduced. Existing records are mirrored non-destructively through a
database trigger. Do not rewrite applied migrations.
