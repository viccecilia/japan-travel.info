# Legacy Booking Redirect

Direct Rezio booking integration is not active in this release. Historical `/go/rezio/*` requests are redirected to the Japanese contact page, where visitors can submit a transport inquiry.

The public site must not claim that an inquiry is paid, confirmed or reserved. Existing backend order records and import utilities are retained for data compatibility, but they are not exposed as a public booking flow.
