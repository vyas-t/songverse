# SONGVERSE Google OAuth setup

Google sign-in uses Supabase Auth. Google credentials belong in the Supabase provider configuration and are not required in the browser bundle.

## Application callback URLs

Google OAuth always uses this application callback:

- Production: `https://songverse.pages.dev/auth/callback`

When sign-in is initiated from localhost or another non-production host, SONGVERSE first opens `https://songverse.pages.dev/?auth=google`; OAuth then starts on the production origin and returns to the production callback. This keeps Supabase's PKCE verifier on the same origin that redeems it and prevents a redirect back to localhost. Existing email confirmation links continue to use their production-safe callback resolver. Guest data stored on a separate local origin remains there and is not transferred by this handoff.

## Supabase Dashboard

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to `https://songverse.pages.dev`.
3. Add these exact entries to **Redirect URLs**:
   - `https://songverse.pages.dev/auth/callback`
4. Open **Authentication → Sign In / Providers → Google** and enable Google.
5. Paste the Google **Client ID** and **Client Secret** into the Supabase Google provider fields, then save.
6. Copy the callback URI shown on that Google provider page. It normally has this form:
   - `https://<project-ref>.supabase.co/auth/v1/callback`
   - Use the exact URI shown in your dashboard if the project uses a custom domain.

No database migration or user-record change is needed for this integration.

## Google Cloud Console

1. Open **Google Auth Platform → Clients** (or **APIs & Services → Credentials**) and create an **OAuth client ID** of type **Web application**.
2. Add these **Authorized JavaScript origins**:
   - `https://songverse.pages.dev`
3. Add the exact Supabase callback URI copied from the provider page to **Authorized redirect URIs**. This is the Supabase `/auth/v1/callback` URI, not the SONGVERSE `/auth/callback` URL.
4. Save the OAuth client, then paste its Client ID and Client Secret into Supabase’s Google provider settings.
5. If the Google consent screen is in testing mode, add the accounts you will use as test users. Complete any required consent-screen or domain verification steps before opening sign-in to all users.

## Application environment

The existing public client configuration remains:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Set those in the local development environment and the Cloudflare Pages build environment as they are today. This feature adds no OAuth-specific browser environment variable. Do not place the Google Client Secret or a Supabase service-role key in any `VITE_*` variable or client-side file.

## Verification status

Local tests cover provider request construction, callback parsing, cancellation/error messaging, profile metadata mapping, and guest-profile continuity. A real Google round trip, refresh persistence against the deployed Supabase project, and production callback validation still require the Client ID/Secret and enabled provider configuration above. They have not been verified end to end by the local test suite.

### References

- [Supabase Google sign-in setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Google OAuth 2.0 web server setup](https://developers.google.com/identity/protocols/oauth2/web-server)
