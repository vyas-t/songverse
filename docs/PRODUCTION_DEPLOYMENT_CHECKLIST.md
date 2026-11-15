# SongVerse Production Deployment Checklist

This checklist is a source-based draft. Production accounts and their current configuration were not accessed, and no deployment or migration was performed.

## Cloudflare Pages

- [ ] Confirm the Pages project is connected to this source and builds with the repository lockfile/runtime versions.
- [ ] Add only server-side bindings required by deployed Functions; never expose a service-role key through `VITE_*` variables.
- [ ] Configure the Supabase project URL and public anon/publishable key for the browser.
- [ ] Configure `SUPABASE_SERVICE_ROLE_KEY` only as a server-side Pages secret if the admin handlers require it; rotate if exposure is suspected.
- [ ] Configure email provider secrets (`RESEND_API_KEY` or approved SMTP provider) and a verified sender address.
- [ ] Configure Supabase Auth SMTP and signup/recovery email templates; the legacy caller-supplied OTP mail endpoint now returns 410.
- [ ] Configure OAuth client identifiers and Supabase Auth redirect allowlists for the production domain.
- [ ] Add rate limits/WAF rules for signup, OTP, account recovery, room create/join, and public search routes.
- [ ] Verify every API route in `API_ROUTE_MATRIX.md` has a production implementation before enabling affected UI controls.

## Supabase

- [ ] Confirm production database backups and point-in-time recovery before schema changes.
- [ ] Review migration SQL in staging; apply migrations only after backup and authorization review.
- [ ] Verify RLS is enabled on all user-owned and social tables.
- [ ] Restrict profile UPDATE grants so users cannot change account role/status or score/stat fields.
- [ ] Restrict friendship and invitation state transitions to the proper sender/receiver.
- [ ] Confirm public leaderboard views expose only approved fields and only validated records.
- [ ] Confirm Auth email templates use Supabase-managed verification/recovery tokens; do not use browser-generated OTPs.
- [ ] Verify password recovery links expire and single-use behavior is enabled.
- [ ] Review and apply `20261113000000_songverse_security_hardening.sql` in staging first; inspect duplicate pending friendship pairs if its migration guard stops.
- [ ] Set `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` for the Pages account deletion function. Keep the service-role key in server-only secret bindings.
- [ ] On staging only, test `20261115073251_account_recovery_keys.sql`, inspect how many legacy users will be enrolled for email recovery, and verify all new tables/RPCs are inaccessible to `anon` and `authenticated`.
- [ ] Configure Email provider confirmation only after reviewing the email-ownership risk documented in `ACCOUNT_RECOVERY_KEY_SETUP.md`; the code cannot change this Dashboard setting.
- [ ] Configure the Supabase Site URL and allowed redirect URL `https://songverse.pages.dev/auth/callback`; retain the existing Google provider configuration.
- [ ] Add Cloudflare Pages server-only bindings `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; do not use `VITE_` names for the service-role secret.
- [ ] Verify key issue, acknowledgment, expiry, one-time reset, key rotation, and legacy account recovery against staging Auth and database before enabling this flow for users.

## Release verification

- [ ] Confirm service-role/public key separation in built frontend artifacts.
- [ ] Confirm unauthorized admin requests return 401/403 and do not reveal player data.
- [ ] Confirm email dispatch failures surface as failures and no OTP is logged.
- [ ] Confirm successful and failed password updates are reported truthfully.
- [ ] Verify email signup returns an authenticated session with Confirm Email disabled and that a recovery key is displayed before the new account continues.
- [ ] Verify new-account email confirmation is intentionally disabled only after the account ownership implications are accepted; keep Google OAuth and guest-mode tests passing.
- [ ] Confirm recovery keys and passwords are absent from audit rows, Cloudflare logs, frontend storage, source maps, and built assets.
- [ ] Exercise a guest game, authenticated game, search/discovery, friend request, room creation/join, reconnect, and complete match using staging accounts.
- [ ] Check Cloudflare logs, Supabase logs, rate-limit behavior, and health/readiness endpoints.
- [ ] Verify backup and rollback plan before enabling the release.

## Rollback

- [ ] Preserve the last known-good Pages deployment and use Cloudflare rollback to that deployment if verification fails.
- [ ] Treat additive SQL migrations as forward-only unless the migration explicitly includes a reviewed reverse script. Do not drop user data or disable RLS to roll back an app release.
- [ ] Restore data from a verified backup only with an explicit incident decision and a tested recovery procedure.
- [ ] Rotate affected provider secrets if logs or builds show exposure; do not revoke keys without confirming dependent services are ready for the replacement.
