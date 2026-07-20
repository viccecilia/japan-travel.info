# Member Security

The member foundation uses PHP sessions and SQLite. Sensitive state is server-side only:

- No email, profile, booking, session or token data in `localStorage`.
- Passwords use `password_hash` / `password_verify`.
- Verification and reset tokens are stored as hashes.
- Session cookies use `HttpOnly`, `Secure` when HTTPS is active, and `SameSite=Lax`.
- State-changing actions require a CSRF token from `/api/csrf.php` and same-origin Origin/Referer validation.
- Login and form endpoints use rate limiting.
- Errors do not reveal whether an account exists.
- Email verification is required before login.
- Public travel content stays open; member-only data such as favorites, saved trips, booking references, VIP, referral and ambassador records requires login.

Set `APP_SECRET` to a long random value before production use.
