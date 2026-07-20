# Deployment

Set the domain document root to this repository root after running `npm run build`.

Required production checks:

```bash
npm ci
npx playwright install chromium
npm run verify
php -l api/bootstrap.php
php -l api/csrf.php
php -l api/inquiry.php
php -l api/member.php
php -l api/rezio.php
php tests/php/integration.php
```

Runtime data must not be inside a public readable folder. Prefer:

```text
APP_DATA_DIR=/home/daitora/private/japan-travel-info
```

If hosting forces project-local runtime data, keep it under `runtime/private` and deploy the included `.htaccess` rules. Do not upload `.env`, database files, logs or mail spool files to GitHub.

Apache rewrite maps `/go/rezio/{product_key}` to `/api/rezio.php`. Old `/h5/` URLs are redirected to the new directory URL structure.

Required production environment:

```text
APP_ENV=production
APP_SECRET=<32+ random characters>
APP_DATA_DIR=/home/daitora/private/japan-travel-info
SITE_URL=https://japan-travel.info
ALLOWED_ORIGINS=japan-travel.info,www.japan-travel.info
MAIL_TRANSPORT=smtp
SMTP_HOST=<mail host>
SMTP_PORT=587
SMTP_USER=<smtp user>
SMTP_PASSWORD=
SMTP_TLS=1
MAIL_FROM=no-reply@japan-travel.info
BOOKING_TO_EMAIL=<operations inbox>
```

Without SMTP settings, registration and inquiry endpoints return a clear configuration failure instead of pretending that mail was sent.
