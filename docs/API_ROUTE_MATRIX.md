# SongVerse API Route Matrix

Source comparison performed on 2026-11-13 and refreshed for SongVerse 2.2 on 2026-11-13. “Cloudflare” means a matching Pages Function exists in this source folder; it does not imply that it has been deployed or exercised against production.

| Route | Frontend caller | Backend implementation | Authentication | Production status |
|---|---|---|---|---|
| `GET /api/health` | Deployment/operations | Express + `functions/api/health.ts` | Public | Implemented locally in both runtimes; not deployed |
| `GET /api/supabase/status` | No direct frontend caller found | Express + `functions/api/supabase/status.ts` | Public | Pages handler reports configuration/readiness without secret values; not live-verified |
| `POST /api/send-otp` | No active frontend caller; deprecated shim only | Express + Cloudflare return 410 | None | Disabled; use Supabase Auth verification/recovery |
| `POST /api/telemetry/error` | `supabaseClient.ts` | Express + `functions/api/telemetry/error.ts` | Optional verified bearer; body identity ignored | Pages handler added; requires service-role storage binding; per-isolate throttle plus edge rate limits required |
| `GET /api/licensing/audit` | No direct frontend caller found | Express | Public | Missing Cloudflare function |
| `GET /api/auth/providers` | Called during `authService` initialization | Express + `functions/api/auth/providers.ts` | Public config state only | Implemented locally; reflects server bindings, not Supabase dashboard state |
| `POST /api/auth/google` | Legacy compatibility method; no current call site | Express + `functions/api/auth/google.ts` | Supabase Auth validates Google ID token | Pages exchanges through Supabase Auth; not live-verified |
| `POST /api/auth/apple` | Legacy compatibility method; no current call site | Express + `functions/api/auth/apple.ts` | Supabase Auth validates Apple ID token | Pages exchanges through Supabase Auth; not live-verified |
| `GET /api/auth/me` | No direct current call site | Express + `functions/api/auth/me.ts` | Verified Supabase bearer | Implemented locally; not live-verified |
| `POST /api/auth/link-guest` | No current HTTP caller; `linkGuestData` is a local no-op | Express + `functions/api/auth/link-guest.ts` | Verified bearer required; imported totals rejected | Returns 409 until unverified progress archive/import is designed; local progress remains on device |
| `POST /api/auth/signout` | Called by `authService` after Supabase signout | Express + `functions/api/auth/signout.ts` | Verified bearer + server-side revocation binding | Implemented locally; frontend call order needs adjustment and live revocation is unverified |
| `DELETE /api/auth/account` | `authService.ts` | Express + `functions/api/auth/account.ts` | Verified Supabase bearer session + typed `DELETE`; server-side Auth Admin delete | Both implementations exist; Cloudflare needs anon + service-role bindings |
| `GET /api/musicbrainz/search` | `musicbrainzService.ts` | Express + `functions/api/musicbrainz/search.ts` | Public, bounded query + per-isolate throttle | Pages handler added; provider quota needs Cloudflare edge limits; not live-verified |
| `GET /api/catalogue/stats` | `AdminPanel.tsx` | Express + `functions/api/catalogue/stats.ts` | Public | Pages reads checked-in snapshot; backup status is unavailable/false |
| `GET /api/catalogue/tracks` | Catalogue/admin UI | Express + `functions/api/catalogue/tracks.ts` | Public baseline; user additions require future authenticated store | Pages reads snapshot with matching filters/pagination; not live-deployed |
| `POST /api/catalogue/tracks` | `musicCatalogue.ts` fire-and-forget | Express + `functions/api/catalogue/tracks.ts` | Verified admin session for shared writes | Pages validates admin then returns 503; no false persistence claim; user edits remain local; durable storage needed |
| `DELETE /api/catalogue/tracks/:id` | `musicCatalogue.ts` fire-and-forget | Express + `functions/api/catalogue/tracks.ts` | Verified admin session for shared writes | Pages validates admin then returns 503; local removal remains local |
| `POST /api/catalogue/clear` | No current caller; UI explicitly avoids it | Express admin middleware | Verified session + active admin profile/explicit server allowlist | No Pages handler; intentionally not ported without durable shared store |
| `GET /api/music/search` | Search/autocomplete/discovery | Express + `functions/api/music/search.ts` | Public | Implemented in both |
| `GET /api/music/discover` | `musicCatalogue.ts` | Express + `functions/api/music/discover.ts` | Public; bounded request rate | Implemented in both; Pages now filters requested language; not live-verified |
| `POST /api/game/round/random` | No caller in current frontend; solo engine is local | Express | Public; process-local round state | Not ported: no current Pages caller and Express state is volatile; preserve as compatibility item pending deployed-client evidence |
| `POST /api/game/round/guess` | No caller in current frontend; solo engine is local | Express | Public; round ID only | Not ported: no current Pages caller and Express state is volatile; preserve as compatibility item pending deployed-client evidence |
| `POST /api/game/round/skip` | No caller in current frontend; solo engine is local | Express | Public; round ID only | Not ported: no current Pages caller and Express state is volatile; preserve as compatibility item pending deployed-client evidence |
| `GET /api/leaderboard` | `supabaseClient.ts` | Express + `functions/api/leaderboard.ts` | Public view via Supabase anon key | Pages handler added and maps genuine view rows; not staging/production verified |
| `POST /api/multiplayer/rooms/create` | `multiplayerEngine.ts` | Express | Public | Missing Cloudflare function |
| `POST /api/multiplayer/rooms/join` | `multiplayerEngine.ts` | Express | Public | Missing Cloudflare function |
| `GET /api/multiplayer/rooms/:code` | `multiplayerEngine.ts` | Express | No member authentication | Missing Cloudflare function |
| `POST /api/multiplayer/rooms/:code/host/start` | `multiplayerEngine.ts` | Express | Host token in body | Missing Cloudflare function |
| `POST /api/multiplayer/rooms/:code/host/kick` | `multiplayerEngine.ts` | Express | Host token in body | Missing Cloudflare function |
| `POST /api/multiplayer/rooms/:code/host/settings` | `multiplayerEngine.ts` | Express | Host token in body | Missing Cloudflare function |
| `POST /api/multiplayer/rooms/:code/host/close` | `multiplayerEngine.ts` | Express | Host token in body | Missing Cloudflare function |
| `POST /api/multiplayer/rooms/:code/host/next-round` | Engine route exists; caller not located in the inspected frontend search | Express | Host token in body | Missing Cloudflare function |
| `POST /api/multiplayer/rooms/:code/guess` | `multiplayerEngine.ts` | Express | Client player ID in body | Missing Cloudflare function |
| `POST /api/multiplayer/rooms/:code/skip-level` | `multiplayerEngine.ts` | Express | Client player ID in body | Missing Cloudflare function |
| `POST /api/multiplayer/rooms/:code/heartbeat` | `multiplayerEngine.ts` | Express | Client player ID in body | Missing Cloudflare function |
| `GET /api/admin/metrics` | `AdminPanel.tsx` | Express + Cloudflare | Verified bearer token + active admin role/explicit server allowlist | Both exist; static PIN removed; service-role binding required for full admin reads |
| `GET /api/admin/players` | `AdminPanel.tsx` | Express + Cloudflare | Verified bearer token + active admin role/explicit server allowlist | Both exist; static PIN removed; service-role binding required for full admin reads |
| `POST /api/admin/players/:id/status` | `AdminPanel.tsx` | Express + Cloudflare | Verified bearer token + active admin role/explicit server allowlist | Both exist; static PIN removed; audit logging still needs failure handling review |
| `GET /api/admin/players/export` | `AdminPanel.tsx` | Express + Cloudflare | Verified bearer token + active admin role/explicit server allowlist | Both exist; static PIN removed |
| `GET /api/admin/export` | No direct frontend caller found | Cloudflare re-export of player export | Verified bearer token + active admin role/explicit server allowlist | Cloudflare only; static PIN removed |
| `GET /api/admin/catalogue/stats` | No direct caller found | Express + `functions/api/admin/catalogue/stats.ts` | Verified bearer + active admin | Implemented against checked-in snapshot; not live-verified |
| `GET /api/admin/catalogue/import/status` | `AdminPanel.tsx` | Express + Pages handler | Verified bearer + active admin | Route exists; returns explicit 503 until durable job storage is configured |
| `POST /api/admin/catalogue/import/start` | `AdminPanel.tsx` | Express + Pages handler | Verified bearer + active admin | Validates request; returns 503 and starts no fake job |
| `POST /api/admin/catalogue/import/pause` | `AdminPanel.tsx` | Express + Pages handler | Verified bearer + active admin | Route exists; returns 503 until durable job storage is configured |
| `POST /api/admin/catalogue/import/resume` | `AdminPanel.tsx` | Express + Pages handler | Verified bearer + active admin | Route exists; returns 503 until durable job storage is configured |
| `POST /api/admin/catalogue/import/cancel` | `AdminPanel.tsx` | Express + Pages handler | Verified bearer + active admin | Route exists; returns 503; no job is changed |
| `POST /api/admin/catalogue/backup` | `AdminPanel.tsx` | Express + Pages handler | Verified bearer + active admin | Route exists; returns 503 until durable backup destination exists |
| `GET /api/admin/catalogue/plan` | `AdminPanel.tsx` | Express + `functions/api/admin/catalogue/plan.ts` | Verified bearer + active admin | Plan reports no backup and no mutations; not live-verified |

Cloudflare route coverage is still incomplete for multiplayer, global catalogue mutations, and the unused Express solo-round APIs. Admin import and backup URLs now have Pages handlers, but those handlers fail explicitly until a durable store is configured; they do not pretend to create jobs or backups. Simply deploying static Vite output still does not expose `server.ts` routes.

## SongVerse 2.2 frontend-call audit

This audit distinguishes direct current frontend use from Express-only or compatibility routes. A route present in the Express server is not, by itself, evidence that the current UI calls it.

| Route group | Current source-tree caller status | Audit finding and safe disposition |
|---|---|---|
| Health and Supabase status | No direct caller found in `src/` | Operational diagnostics. Add a Pages health endpoint; status should report configuration/readiness without exposing secrets or claiming a live database test it did not perform. |
| `/api/send-otp` | No direct caller; disabled in 2.1 | Keep disabled. Supabase Auth owns verification and recovery. |
| Telemetry | Direct caller: `src/services/supabaseClient.ts` | Required for existing caller compatibility; sanitize/bound request data, rate-limit, and never trust caller-supplied user IDs. The client also tries direct Supabase inserts. |
| Licensing audit | No direct caller found | Legacy static response; do not prioritize Pages parity absent a confirmed consumer. Keep the Express route for compatibility during this pass. |
| Auth providers | Called during `authService` initialization | Required. In Cloudflare, derive provider availability from server configuration without returning secrets. Current Google sign-in uses Supabase OAuth. |
| Google/Apple token exchange | No call sites found for legacy `signInWithGoogle` / `signInWithApple` methods | Compatibility methods only. The current Google UI path uses Supabase `signInWithOAuth`; Apple direct-token path is not currently wired into the UI. Preserve or deprecate explicitly; do not port the in-memory Express session model. |
| `/api/auth/me`, `/api/auth/link-guest` | No HTTP call sites found; `linkGuestData` is a local no-op | Legacy Express-only routes. Guest migration must be designed around verified identity and untrusted local progress; never award client-supplied scores. Keep guest source data recoverable. |
| Signout and account deletion | Direct callers in `authService.ts` | Required. Supabase is the session source; signout should be idempotent and account deletion requires verified session plus server-side service-role binding. |
| MusicBrainz search | Direct caller in `musicbrainzService.ts`, with direct provider fallback | Required for metadata lookup. Validate query/limit and rate-limit provider requests; do not persist imported records as globally shared data without a durable authorized store. |
| Catalogue GET and stats | Direct callers in catalogue service and admin UI | Required. Current user catalogue is local-storage backed; Pages GET can read the checked-in catalogue snapshot. Pagination/filter contract must match Express. |
| Catalogue POST/DELETE | Direct best-effort calls from `musicCatalogue.ts` | These calls are fire-and-forget; local storage is updated first. Express mutates process-local state, not a durable shared store. Do not return simulated persistence success from Pages; either provide a real authorized durable store or remove the optional remote write calls while preserving local edits. |
| Catalogue clear | No current caller; 2.1 UI explicitly avoids it | Legacy administrative Express route. Do not expose a Pages equivalent without a durable store, confirmed use case, and stronger safeguards. |
| Music search/discovery | Direct callers from discovery and search UI | Required. Existing Pages handlers cover both routes. Discovery currently ignores the request's `language`/`languages` filter, so it is not contract-equivalent to Express. |
| Solo round endpoints | No calls found in current `src/`; gameplay uses local `gameEngine.ts` and local catalogue | Not required by this frontend. Express implementation stores active rounds in a process-local map; a Pages port must not recreate that volatile state. Preserve endpoints only if deployed-client compatibility is required, using a durable/versioned design. |
| Leaderboard | Direct caller from leaderboard view through `supabaseClient.ts` | Required. Pages implementation should query the existing public view, validate period/limit, and return genuine entries or a truthful error/empty result. |
| Multiplayer | Direct caller for room create/join/read, host controls, guesses, skips, and heartbeat | Required and highest risk. Express uses process-local room state and client-supplied player IDs/host tokens. Pages must route through coordinated server-authoritative storage; do not port the Express map. |
| Admin metrics/players/status/export | Direct callers in `AdminPanel.tsx`; matching Pages Functions exist | Required. Existing Pages auth and query behavior needs hardening/contract tests, including service-role requirements, safe search filtering, and audit-write failures. |
| Admin catalogue imports/status/plan/backup | Direct callers in `AdminPanel.tsx` | Required UI surface, but the Express importer and catalogue store are process-local/file-oriented. Cloudflare cannot reproduce those semantics with per-request memory. A durable import job/store or a safe compatibility/error response requires a design decision; no fake success. |
| `/api/admin/catalogue/stats` and `/api/admin/export` | No direct caller found (`AdminPanel` uses `/api/catalogue/stats` and `/api/admin/players/export`) | Compatibility-only routes. Keep documented; avoid expanding API surface without a consumer. |

### Audit environment and blockers

- This checkout contains no `wrangler.toml`, Pages bindings manifest, existing Workers/Pages handler test harness, or project deployment configuration. No production credentials were inspected.
- Current frontend solo gameplay is local, but multiplayer is coupled to the Express room API. Cloudflare parity for multiplayer therefore depends on its separate durable architecture phase.
- The Pages admin handlers use Supabase service-role credentials for broad profile reads/updates. A public anon key is insufficient for their full admin contract; missing server bindings must fail closed.
- The 2.1 security migration has not been tested against a staging database. No staging URL/credentials were present in the reviewed source tree.
- No route was deleted during this audit. Any compatibility removal requires either a proven absence of deployed clients or a versioned/deprecation path.
