# SONGVERSE account recovery keys

This change adds one-time, server-verified recovery keys while keeping Google OAuth, guest mode, existing profiles, and existing accounts. No production Supabase setting or migration has been changed.

## How it works

- A Pages Function creates a 256-bit random key after an authenticated email or Google sign-in when the account has no usable key. The frontend holds the plaintext only in memory and displays it once behind a required acknowledgment checkbox.
- The database stores only a SHA-256 hash. The key expires after 365 days; signing in with the password allows the user to replace a forgotten or expired key. Replacement immediately invalidates the previous key.
- Password reset accepts the registered email, the exact 64-character lowercase hex key, and a new password. The server validates the inputs, applies persistent email/IP rate limits, atomically claims the key, changes the password using Supabase Auth Admin, consumes the old key, and issues a replacement key.
- Invalid email/key combinations receive the same error. Audit records contain event names and keyed fingerprints of email/IP only; neither plaintext keys, key hashes, passwords, raw emails, nor raw IP addresses are written to the audit table.
- Older accounts are backfilled into a separate legacy marker table by the migration. They retain Supabase email recovery only until they next sign in and enroll a recovery key. The legacy password-reset endpoint accepts a verified Supabase recovery session only if the server confirms that the account still has that legacy marker. It then issues a recovery key.
- Guest gameplay remains local and does not create or require recovery keys.

## Supabase settings to configure manually

1. In the Supabase Dashboard, open **Authentication → Sign In / Providers → Email** (the Email provider's configuration section) and turn off **Confirm email**. Supabase returns an authenticated session for signup when this is disabled.
2. Keep the Google provider enabled and keep its current client ID/secret and callback configuration. The code does not need a new Google credential.
3. Set **Authentication → URL Configuration → Site URL** to `https://songverse.pages.dev`.
4. Add `https://songverse.pages.dev/auth/callback` to the allowed redirect URLs. For local development, add `http://localhost:5173/auth/callback` only if local callback testing is needed. The legacy recovery email is intentionally redirected to the production callback.
5. Configure a supported SMTP sender if recovery email delivery is needed for pre-migration accounts; Supabase's built-in sender may be restricted to project team addresses.

**Email ownership risk:** Supabase documents that disabling Confirm Email implicitly confirms the address, including for an address the signer may not own. This can let someone register using another person's email and claim that identity. Review that tradeoff before changing the setting. The application cannot switch it remotely, and it remains unchanged in this implementation.

## Cloudflare Pages server bindings

Configure these on the Pages Functions runtime, never as browser `VITE_*` secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secret binding; never place it in frontend variables)

The anon key is used server-side for Supabase Auth session validation and legacy recovery email dispatch. The service-role key is used only inside Pages Functions for protected RPCs and Auth Admin password updates. No key values are included in source or docs.

## Migration and staging procedure

`supabase/migrations/20261115073251_account_recovery_keys.sql` is additive. It creates separate key, audit, and rate-limit tables and backfills only a `legacy_email_recovery` marker for current `auth.users` IDs; it does not update or delete profiles or Auth users. All tables use RLS and revoke browser-role access. Only `service_role` receives table/RPC access.

Before production approval, apply it to a staging Supabase project and verify:

1. Existing account count matches the inserted legacy marker count; no existing auth or profile rows changed.
2. `anon` and `authenticated` cannot read/write key, audit, or throttle tables or execute the protected RPCs.
3. New email signups return a session after Confirm Email is disabled; Google sign-in and guest gameplay are unchanged.
4. Recovery key issuance displays exactly once, acknowledgment succeeds, key expiry triggers replacement, wrong keys do not change passwords, and a valid key can be used only once.
5. Audit rows contain no plaintext secrets or direct email/IP values; rate-limit rows use keyed fingerprints.
6. Legacy accounts can complete Supabase email recovery once; after enrollment, the legacy endpoint refuses the account.

Do not apply this migration to production until staging results and a current backup have been reviewed and explicitly approved. No staging Supabase connection was available during local implementation, so the migration and end-to-end Auth flows are not staging-verified.

## API endpoints

- `POST /api/auth/recovery-key` — issue on an authenticated account; `{ "rotate": true }` explicitly replaces a current key.
- `POST /api/auth/recovery-key/ack` — acknowledge the displayed key.
- `POST /api/auth/recovery/reset` — verify email/key and reset; successful reset returns a new one-time key.
- `POST /api/auth/recovery/legacy-email` and `POST /api/auth/recovery/legacy-reset` — migration-only Supabase email recovery for accounts with no enrolled key.

## Verification performed locally

The automated Pages tests mock Supabase Auth and PostgREST to exercise real handlers, including issuance, wrong-key rejection, server-side password update, one-time rotation, acknowledgement, and the non-enumerating legacy response. These are unit/integration mocks; they do not establish that Supabase migration SQL or live Auth configuration works in staging or production.
