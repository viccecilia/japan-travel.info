# Deployment

Set the domain document root to this repository root after running `npm run build`.

Required production checks:

```bash
npm ci
npm run verify
php -l api/bootstrap.php
php -l api/inquiry.php
php -l api/member.php
php -l api/rezio.php
```

Runtime data must not be inside a public readable folder. Prefer:

```text
APP_DATA_DIR=/home/daitora/private/japan-travel-info
```

If hosting forces project-local runtime data, keep it under `runtime/private` and deploy the included `.htaccess` rules. Do not upload `.env`, database files, logs or mail spool files to GitHub.

Apache rewrite maps `/go/rezio/{product_key}` to `/api/rezio.php`. Old `/h5/` URLs are redirected to the new directory URL structure.
