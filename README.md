# Open Azulejos

Open Azulejos is a participatory map and photographic archive for documenting
Lisbon azulejos in place. Contributions combine a square image, retained source
frame, GPS quality metadata, moderation history, and a stable geographic record.

Production: [openazulejos.vercel.app](https://openazulejos.vercel.app)

Source: [github.com/orsoneveraert/open-azulejos](https://github.com/orsoneveraert/open-azulejos)

## Current capabilities

- Mobile camera and photo-library capture with square preview and hidden margin.
- Mandatory recent GPS position with accuracy checks and live map location.
- Pending-by-default moderation and a mobile-compatible image editor.
- Perspective correction, tonal adjustments, white point, and border recovery.
- Grid-aligned map images, viewport sampling, fullscreen mosaic viewer, and LQIP.
- PostGIS-backed archive foundation and private storage for new source images.
- Verified media backups with checksums and a dry-run restore command.

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
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

## Architecture and project policy

- [Architecture](docs/ARCHITECTURE.md)
- [Backup and restore](docs/BACKUP_AND_RESTORE.md)
- [Operations](docs/OPERATIONS.md)
- [Roadmap](ROADMAP.md)
- [Governance](GOVERNANCE.md)
- [Contributing](CONTRIBUTING.md)
- [Licenses](LICENSES.md)
- [Security](SECURITY.md)

The `azulejos` table remains a compatibility contract while normalized archive
tables are introduced. Existing records are mirrored non-destructively through a
database trigger. Do not rewrite applied migrations.
