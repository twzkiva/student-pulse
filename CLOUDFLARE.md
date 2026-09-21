# Cloudflare deployment

Public site: https://campus-pulse-ki13.student-pulse.workers.dev

The production Worker and D1 binding are in `wrangler.cloudflare.jsonc`.
The original `wrangler.jsonc` remains local-only; Sites metadata is preserved.

## Update the site

1. Run `npm test`.
2. If schema migrations were added, run `npx wrangler d1 migrations apply DB --remote --config wrangler.cloudflare.jsonc`.
3. Run `npm run deploy:cloudflare`.
4. Verify `/`, `/api/schedule/odd`, `/api/schedule/even`, and `/api/homework` at the public origin.

The Cloudflare build uses same-origin API requests. Static assets bypass the
Worker; `/api/*` and `/telegram/*` reach the application. No paid plan or R2
resource was enabled during deployment. Free-tier quotas still apply.

## Accounts and Google sign-in

Account records and hashed sessions live in D1. `SESSION_SECRET`, `PASSWORD_PEPPER`,
`GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` must be Wrangler secrets and must
never be committed. `PUBLIC_ORIGIN` is a non-secret Worker variable.

Create a Google OAuth 2.0 Web application and add this exact authorized redirect
URI:

`https://campus-pulse-ki13.student-pulse.workers.dev/api/auth/google/callback`

Then upload the two Google values with:

`npx wrangler secret put GOOGLE_CLIENT_ID --config wrangler.cloudflare.jsonc`

`npx wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.cloudflare.jsonc`

The Google button remains disabled until both values exist. Passwords use salted
PBKDF2-HMAC-SHA256 after an HMAC pepper stored separately from D1; session cookies are `Secure`, `HttpOnly`, and `SameSite=Lax`.
The database stores only hashes of session tokens. Auth mutations require a
same-origin JSON request and are rate-limited in D1.

## Telegram integration

The token currently in `.env.local` failed Telegram's `getMe` check. No token was
uploaded and no existing bot webhook was changed. Until a valid token is provided,
the website serves its database but bot-based updates remain unavailable.

Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`,
`TELEGRAM_ADMIN_USER_IDS` (required separately for a group admin chat), and a fresh
`TELEGRAM_WEBHOOK_SECRET` with Wrangler secrets for `wrangler.cloudflare.jsonc`.
Then register `https://campus-pulse-ki13.student-pulse.workers.dev/telegram/webhook`
with Telegram using the same secret. Do not copy the local mock
`TELEGRAM_API_BASE_URL` into production. Never commit bot credentials.

## Mobile application

Future web/mobile builds use the new API origin. Existing installed APKs and
previously generated OTA archives are not automatically migrated by this web
deployment; rebuild and verify the mobile release separately.
