# SongVerse 2.1 Repository Audit

Audit performed against the source tree in `songverse-main-2` on 2026-11-13. This folder has no local Git metadata. Its tracked source files match the adjacent `songverse-main` copy; only the latter contains a local `.env`, build output, and a `docs` directory. No production credentials were read or printed.

## Architecture

- Frontend: React 19 + TypeScript + Vite, entered through `src/main.tsx` and `src/App.tsx`.
- Development/backend server: `server.ts`, an Express application that also starts Vite in development and serves `dist` in production. It owns authentication proxy routes, catalogue routes, solo game endpoints, leaderboard endpoints, administrative routes, and in-memory multiplayer rooms.
- Production backend: Cloudflare Pages Functions under `functions/api`. The checked-in functions cover OTP email dispatch, Apple music search/discovery, and a subset of admin metrics/player endpoints.
- Persistence/authentication: Supabase Auth and client SDK, with additive SQL migrations in `supabase/migrations`. The frontend also persists guest and game state locally.
- Multiplayer: `src/services/multiplayerEngine.ts` combines PeerJS/WebRTC with HTTP polling and server routes. The Express multiplayer room map is process memory; there is no checked-in durable room coordination implementation.
- Music: Apple/iTunes search/discovery and a local curated catalogue, with provider metadata and playback handling in `src/services`.
- Tests: TypeScript scenario scripts in `tests`; the package `test` script runs `tests/verify-gameplay.ts`.

## Findings

### P0 — critical security or data-integrity risk

1. **Static administrator access bypasses server authorization.** `src/components/admin/AdminPanel.tsx` contains the literal PIN `ABHI0810`, stores it in browser session storage, and sends it as `x-admin-key`. `server.ts` accepts that value and `songverse2026` regardless of environment. Multiple Cloudflare admin functions contain the same fallbacks. Anyone who inspects the public bundle can gain access to the admin operations these routes expose.
2. **OTP security is browser-controlled.** `src/services/authService.ts` creates six-digit codes with `Math.random()`, stores the code in local storage, and compares the submitted code in the browser. `/api/send-otp` accepts a caller-supplied code and sends it. A modified client can create/verify codes without proving mailbox control.
3. **OTP delivery can be reported as successful when no email was sent.** The Express dispatcher logs an OTP when no provider is configured and returns `{success:true, provider:'simulated'}`. The frontend email service also treats network failure as success. This creates false assurance during signup, recovery, and account deletion.
4. **Password changes can report success after failure.** `authService.ts` catches and discards Supabase `updateUser` errors, then sets a success state. This affects the reset flow and authenticated password change.
5. **Client profile update policies do not restrict sensitive columns.** The own-profile UPDATE policy checks row ownership but not changes to `account_type` or other protected fields. RLS is row-level; it does not prevent users from updating privileged columns when table UPDATE grants include them.

### P1 — major production functionality risk

1. **Production route mismatch.** The UI calls routes that exist only in `server.ts`; corresponding Cloudflare functions are absent for auth, catalogue, telemetry, leaderboard, music metadata, solo gameplay, multiplayer, and admin catalogue import operations. Cloudflare Pages cannot serve those Express routes.
2. **Multiplayer identity is client-supplied.** HTTP guess, skip, and heartbeat endpoints use a request-body `playerId` to select the player; room reads expose room state without authenticating membership. Host actions use a bearer-like host token carried by clients. This does not establish a durable identity boundary.
3. **Room state is single-process memory.** `activeServerRooms` is lost on restart and is not shared among instances. Multi-instance Cloudflare/Express deployments can return inconsistent or missing rooms.
4. **Friendship state transitions are too broad.** The migration permits both sender and receiver to update any columns on a friendship row. It does not enforce that only the receiver accepts/rejects, or that sender/receiver/status remain unchanged in an authorized transition.
5. **Missing/failed service configuration can produce plausible empty admin data.** The Cloudflare metrics and player handlers return successful zero/empty data when Supabase is not configured, hiding deployment failures.
6. **Production deployment configuration is unverified.** This source folder has no `.env` file or Cloudflare/Supabase production bindings to inspect. Runtime environment, SMTP delivery, RLS state, and deployed function behavior need confirmation in the actual accounts.

### P2 — reliability and performance

1. **Large frontend bundle.** Baseline Vite build emitted a 1,152.82 kB minified JS chunk (275.78 kB gzip), plus ineffective dynamic-import warnings for modules also statically imported.
2. **Express request handling is not bounded by an explicit route policy.** `express.json()` uses its library default; the API has no shared request correlation, schema validation, or rate limiter in the inspected setup.
3. **Multiplayer polling and PeerJS fallback paths need further live-network validation.** No configured TURN service or persistent coordination is present in the checked-in source.
4. **Error and telemetry routes accept caller-provided identity/context.** Sanitization exists for selected keys but does not establish an authenticated `userId`; downstream logs/database records may therefore have spoofed attribution.

### P3 — optional engineering improvements

1. Split independent frontend surfaces into route-level chunks after the major auth and API correctness work is complete.
2. Add automated endpoint tests that exercise the actual Cloudflare handlers and Express middleware, not only in-memory game engine logic.
3. Add production health/readiness checks that distinguish missing configuration, unavailable dependencies, and a healthy service.

## Existing functionality to preserve

Guest mode, solo guessing, four-level scoring, daily challenges, ranked modes, catalogue discovery/search, audio fallback and metadata-only safeguards, friend/social views, six-digit room codes, host controls, player capacity, round timers, score synchronization, presence/heartbeat, reconnect flows, and current visual styling.

## Baseline verification

- `npm test`: passed, 58/58 scenarios.
- `npm run build`: passed; emitted the bundle warnings noted above.
- `npm run lint` (`tsc --noEmit`): failed at baseline with existing type errors across ShareResultModal, leaderboard/profile match history, multiplayer types, RankedBlitzModal, authService, gameEngine, and test files. These were corrected in the working copy; final verification is listed below.

## Remediation applied in this working copy

- Removed the browser-visible administrator PIN and static server/Cloudflare fallback keys. Admin API access now requires a verified session and active server-side profile/allowlist authorization.
- Changed Cloudflare admin metrics/player handlers to return configuration errors rather than successful fabricated empty data.
- Removed the browser OTP generator and local-storage OTP verifier. Signup verification and password recovery now use Supabase Auth code/link flows; password update errors are surfaced.
- Disabled the caller-supplied OTP delivery endpoint with HTTP 410. Supabase Auth must deliver verification and recovery emails.
- Changed account deletion to require a signed-in session and exact typed confirmation, and made the backend delete the actual Supabase Auth user using a server-side service-role binding. A Cloudflare Pages function now handles this route too.
- Added an additive migration restricting profile column updates and friendship/invitation transitions. It has not been applied to any database.
- Removed client-side guest aggregate score writes because those totals are not verifiable; a validated history import is still needed to restore remote score transfer safely.
- Corrected the existing TypeScript model and component mismatches found by the baseline compiler so `npm run lint` now passes.

## Remaining blockers and limitations

- Cloudflare still lacks most Express routes listed in `API_ROUTE_MATRIX.md`; production parity is not achieved.
- Multiplayer rooms remain in-memory and player identity remains client-supplied on HTTP guess/skip/heartbeat paths. Durable authoritative multiplayer requires a larger architecture change and integration coverage.
- The new RLS migration has not been run against staging; existing duplicate pending friendships must be reviewed if the index guard finds any.
- Supabase email templates must be configured for OTP codes or confirmation links, and recovery redirect allowlists must include the app callback. No external account configuration was changed.
- TypeScript now passes, but static checking and a Vite build do not validate deployed runtime bindings, database policies, or external provider configuration.
- Admin audit inserts still ignore failures in some handlers. Request correlation IDs, shared rate limits, and persistent room observability are not implemented.
- Deployment has not occurred. Production acceptance criteria remain incomplete.

## Scope and operational notes

No database migration has been applied and no production service has been contacted. The additive migration is present in this working copy and requires validation on a non-production Supabase project before deployment. Secrets must be checked and rotated in the external provider if a committed credential is later confirmed; this audit did not identify any tracked `.env` file in this folder.

## Final verification

- `npm test`: passed, 58/58 scenarios.
- `npm run lint` (`tsc --noEmit`): passed.
- `npm run build`: passed; the large-bundle notice and ineffective dynamic-import warnings remain.
- `npx tsx tests/verify-auth-and-admin.ts`: passed, 19/19.
- `npx tsx tests/test-otp-flows.ts`: passed.
- `npx tsx tests/test-social-mvp.ts`: passed, 21/21.
- `npx tsx tests/test-multiplayer-e2e.ts`: passed, 7/7.
- `npx tsx tests/test-multiplayer-catalogue-and-modes.ts`: passed, 29/29.
- `npx tsx tests/verify-catalogue-and-skip.ts`: passed, 7/7; the catalogue JSON was checked against the original copy and is unchanged.
- `npx tsx tests/test-new-features-mvp.ts`: passed, 34 checks.
- Test scripts are local scenario checks; no live Supabase, Cloudflare, OAuth, or SMTP integration was exercised.
