# Contributing

Open Azulejos welcomes code, design, documentation, heritage research, data
quality, translation, and field-recording contributions.

1. Read `README.md`, `docs/ARCHITECTURE.md`, and `CODE_OF_CONDUCT.md`.
2. Open an issue before changes to the schema, licenses, moderation rules, or
   public data model.
3. Keep pull requests focused and include tests for changed behavior.
4. Never commit credentials, production exports, private originals, or personal
   location data.
5. Run `npm run check && npm test` before requesting review.

Schema changes use a new timestamped file in `supabase/migrations`. Existing
migrations are immutable. Data corrections must target an explicit record ID
and must never select "the latest" record.

Small accessibility fixes, tests, translations, and documentation improvements
are suitable first contributions. Security reports follow `SECURITY.md`.
