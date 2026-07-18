# Rezio Attribution

The browser never submits arbitrary destination URLs. Rezio redirects go through:

```text
/go/rezio/{product_key}
```

The PHP handler validates `product_key` against `REZIO_ROUTE_URLS_JSON`, `REZIO_PRODUCT_URLS_JSON` or `REZIO_DEFAULT_URL`. Only Rezio hosts are allowed. A click creates a `click_id` and records source fields, but it is not an order and not a purchase.

Import confirmed Rezio orders with:

```bash
php tools/import-rezio-csv.php docs/examples/rezio-orders-sample.csv --dry-run
php tools/import-rezio-csv.php orders.csv
```

Only paid and completed/fulfilled orders should be used for referral or VIP progression.
