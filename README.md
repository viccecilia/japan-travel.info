# Japan Travel

Production static and PHP foundation for `japan-travel.info`.

Japan Travel is operated by 株式会社大寅 / Daitora Group. The public site provides Kansai travel content, route guidance, transport service explanations and Rezio booking guidance. Rezio remains the source of truth for inventory, dates, prices, payment, vouchers and formal orders.

## Commands

- `npm run build` generates the directory URL site.
- `npm run verify` runs build, asset checks, SEO, i18n, security and rule tests.
- `npm run test:e2e` runs Playwright against `PLAYWRIGHT_BASE_URL`. Start any local static server first when testing locally.

## Safety

External URLs, SMTP, pixels and APIs are configured through environment variables. Missing values safely degrade; no fake social links, fake Rezio links or fake order success states are generated.
