# Rezio Attribution

The browser never submits arbitrary destination URLs. Rezio redirects go through:

```text
/go/rezio/{product_key}
```

The PHP handler validates `product_key` against `REZIO_ROUTE_URLS_JSON`, `REZIO_PRODUCT_URLS_JSON` or `REZIO_DEFAULT_URL`. Only HTTPS Rezio hosts are allowed, including `rezio.io`, `rezio.com` and `rezio.shop` subdomains. A click creates a `click_id`, preserves existing Rezio query parameters and appends UTM/referral fields, but it is not an order and not a purchase.

Import confirmed Rezio orders with:

```bash
php tools/import-rezio-csv.php docs/examples/rezio-orders-sample.csv --dry-run
php tools/import-rezio-csv.php orders.csv
```

Only paid and completed/fulfilled orders are imported as `valid_order` booking references for referral or VIP progression. Cancelled, refunded, test and incomplete rows are retained for audit but do not count as purchases.
