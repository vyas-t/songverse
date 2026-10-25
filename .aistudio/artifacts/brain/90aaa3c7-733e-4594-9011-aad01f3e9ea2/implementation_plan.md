# Fix: Multiplayer Room Audio Playback & Private Admin Access Code

## Root Causes Identified & Fixed

### 1. Multiplayer Room Audio Playback Bug
- **Root Cause**:
  1. In `server.ts`, `/api/multiplayer/rooms/:code/host/start` attempted to draw from `catalogueStore.getPlayableTracks()`, which starts empty (`[]`) until tracks are added or discovered. When empty, `room.tracks` became `[]` (0 tracks).
  2. In `server.ts`, `GET /api/multiplayer/rooms/:code` did not return `trackIds` and only sent incomplete track metadata without `playbackStatus: 'verified_audio'`.
  3. In `multiplayerEngine.ts`, polling discarded `data.currentTrack`, and `this.activeRoom.trackIds` was left as `[]`. Because `this.activeRoom.trackIds.length === 0`, `getCurrentTrack()` returned `undefined`.
  4. In `MultiplayerView.tsx`, `handlePlayMultiplayerAudio()` called `audioEngine.playClip(track, 2)` directly on the `undefined` track, silently aborting with no error feedback. It also lacked the 4 difficulty levels (1s, 3s, 5s, 10s) and skip level controls.
- **Fix Implemented**:
  1. `server.ts` `host/start` now dynamically fetches authentic 30s preview tracks (or falls back to verified preview tracks) so `room.tracks` always has 3 valid, verified playable tracks with authentic preview audio URLs (`.m4a`).
  2. `server.ts` `GET /api/multiplayer/rooms/:code` now serializes `trackIds` and the authoritative `currentTrack` (including `audioUrl`, `audioAssetUrl`, `playbackStatus: 'verified_audio'`, `clipStartSeconds: 0`, and synthesizer presets).
  3. Added server endpoints `POST /api/multiplayer/rooms/:code/skip-level` and `POST /api/multiplayer/rooms/:code/host/next-round`.
  4. `multiplayerEngine.ts` stores `currentTrack` and `trackIds` on room poll; `getCurrentTrack()` prioritizes `this.activeRoom.currentTrack` so every player receives the exact same track.
  5. `MultiplayerView.tsx` now supports full 4-level progression (Level 1: 1s, Level 2: 3s, Level 3: 5s, Level 4: 10s), skip-level actions, live waveform visualizer, progress bar, error handling with retry, and match completion summary.
  6. `audioEngine.ts` added an `audio.onerror` listener to ensure failed audio URLs gracefully fall back to synthesis without freezing playback state.

### 2. Private Admin & 18-Test Runner Access Code ("ABHI0810")
- **Root Cause**:
  Under "Preferences & System" in `Footer.tsx`, the "Admin & 18-Test Runner" button opened `AdminPanel` directly without restricting access.
- **Fix Implemented**:
  1. Updated `Footer.tsx` with a `Lock` icon and labeled it `Admin & 18-Test Runner (Private)`.
  2. `AdminPanel.tsx` now checks `sessionStorage.getItem('songverse_admin_auth') === 'ABHI0810'`. If unauthenticated, it presents a private access code challenge modal requiring code `"ABHI0810"`.
  3. Added a "Lock" button in the admin header to revoke authentication.
  4. Updated `server.ts` `checkAdminAuth` to accept `'ABHI0810'` as the admin API key.

## Verification
- Automated multi-client test: Host created room (`525410`), Player 2 joined, Host started match, both received `currentTrack` with verified audio preview URLs, Player 2 skipped level to Level 2 (3s audio), Host submitted correct guess for 100 points.
- Admin code test: verified `403 Forbidden` without key or with wrong key, `200 OK` with code `ABHI0810`.
- Applet compilation: `compile_applet` passed.
- Applet linting: `lint_applet` passed (`tsc --noEmit` zero errors).
- Test suite: `npm test` passed **42 / 42** test scenarios.
