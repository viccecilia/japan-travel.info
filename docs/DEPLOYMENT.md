# Deployment

Run the complete verification suite before publishing, then set the domain document root to this repository root.

```bash
npm ci
npx playwright install chromium
npm run verify
```

Lint every PHP endpoint and run the HTTP integration suite with the Daitora contact mock as documented in CI. Runtime data must live outside the public document root:

```text
APP_DATA_DIR=/home/daitora/private/japan-travel-info
```

The public form posts to the same-origin `/api/inquiry.php` endpoint. That endpoint validates and stores the inquiry, then signs the exact JSON body with `DAITORA_CONTACT_SHARED_SECRET` and forwards it server-to-server to `DAITORA_CONTACT_ENDPOINT`. The browser never receives the shared secret and does not call the group endpoint directly.

Required production environment:

```text
APP_ENV=production
APP_SECRET=<32+ random characters>
APP_DATA_DIR=/home/daitora/private/japan-travel-info
SITE_URL=https://japan-travel.info
ALLOWED_ORIGINS=japan-travel.info,www.japan-travel.info
DAITORA_CONTACT_ENDPOINT=https://daitora-jp.com/api/send-contact.php
DAITORA_CONTACT_SHARED_SECRET=<same 32+ character secret configured on Daitora Group>
```

SMTP settings remain required for member verification and password-reset email. Transport inquiries themselves use the Daitora Group channel and always go to the fixed group recipient configured there (`info@daitora-jp.com`).

Legacy top-level booking-guide URLs redirect to the localized contact page. Legacy operator-information URLs redirect to the localized home page. Sending an inquiry is never presented as a confirmed booking.

Do not upload `.env`, database files, logs, mail spool files or private exports to GitHub or the public web root.
