# Japan Travel

Production static and PHP foundation for `japan-travel.info`.

Japan Travel is operated by 株式会社大寅 / Daitora Group. The public site provides Kansai travel content, route guidance and transport service information. Public content is available without signing in. Transport inquiries are reviewed by the group team; sending a form is not a booking confirmation.

## Commands

- `npm run build` generates the directory URL site.
- `npm run verify` runs build, asset checks, SEO, i18n, security, rule tests and browser checks.
- `npm run test:e2e` runs Playwright against `PLAYWRIGHT_BASE_URL`.

## Safety

External URLs, SMTP, pixels and APIs are configured through environment variables. Missing values safely degrade; no fake social links, fake booking links or fake success states are generated. Japan Travel forwards transport inquiries to Daitora Group through a signed server-to-server channel, never from browser JavaScript.
