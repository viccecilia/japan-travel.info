# Content Maintenance

Primary content lives in `src/content.json`. Brand facts live in `src/facts/brand.json`; FAQ lives in `src/facts/faq.json`.

Keep every spot in all five languages:

- `zh`
- `zhHant`
- `ja`
- `en`
- `ko`

Run `npm run audit:i18n` after editing. Do not add copied external article text. Add `source_url`, `source_name` and `last_reviewed_at` when reliable official sources are available.
