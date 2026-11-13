import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet as health } from '../functions/api/health';
import { onRequestGet as status } from '../functions/api/supabase/status';
import { onRequestPost as telemetry } from '../functions/api/telemetry/error';
import { onRequestGet as providers } from '../functions/api/auth/providers';
import { onRequestPost as google } from '../functions/api/auth/google';
import { onRequestPost as apple } from '../functions/api/auth/apple';
import { onRequestGet as authMe } from '../functions/api/auth/me';
import { onRequestPost as guestLink } from '../functions/api/auth/link-guest';
import { onRequestPost as signout } from '../functions/api/auth/signout';
import { onRequestDelete as accountDelete } from '../functions/api/auth/account';
import { onRequestGet as musicSearch } from '../functions/api/music/search';
import { onRequestGet as musicDiscover } from '../functions/api/music/discover';
import { onRequestGet as musicBrainz } from '../functions/api/musicbrainz/search';
import { onRequestGet as catalogueTracks, onRequestPost as catalogueWrite } from '../functions/api/catalogue/tracks';
import { onRequestGet as catalogueStats } from '../functions/api/catalogue/stats';
import { onRequestGet as leaderboard } from '../functions/api/leaderboard';
import { onRequestGet as adminMetrics } from '../functions/api/admin/metrics';
import { onRequestGet as adminPlayers } from '../functions/api/admin/players';
import { onRequestPost as adminStatus } from '../functions/api/admin/players/[id]/status';
import { onRequestGet as adminExport } from '../functions/api/admin/players/export';
import { onRequestGet as adminCatalogueStats } from '../functions/api/admin/catalogue/stats';
import { onRequestGet as adminCataloguePlan } from '../functions/api/admin/catalogue/plan';
import { onRequestGet as adminImportStatus } from '../functions/api/admin/catalogue/import/status';
import { onRequestPost as adminImportStart } from '../functions/api/admin/catalogue/import/start';
import { onRequestPost as adminBackup } from '../functions/api/admin/catalogue/backup';

const env = {};
const request = (url: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) => new Request(`https://songverse.test${url}`, {
  method,
  headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
  body: body === undefined ? undefined : JSON.stringify(body)
});
const context = (url: string, method = 'GET', body?: unknown) => ({ request: request(url, method, body), env });

test('health handler returns a real service health response', async () => {
  const response = health();
  assert.equal(response.status, 200);
  assert.equal((await response.json() as any).service, 'SongVerse API');
});

test('Supabase status reports missing configuration without claiming live', async () => {
  const response = await status({ env });
  const body = await response.json() as any;
  assert.equal(response.status, 200);
  assert.equal(body.configured, false);
  assert.equal(body.live, false);
  assert.equal(body.url, null);
});

test('telemetry rejects malformed payloads and missing storage without fake success', async () => {
  const malformed = await telemetry(context('/api/telemetry/error', 'POST', { errorCode: '', errorMessage: '' }));
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json() as any).logged, false);
  const unconfigured = await telemetry(context('/api/telemetry/error', 'POST', { errorCode: 'E', errorMessage: 'failed' }));
  assert.equal(unconfigured.status, 503);
  assert.equal((await unconfigured.json() as any).logged, false);
});

test('provider status only exposes public configuration state', async () => {
  const response = providers({ env: { GOOGLE_CLIENT_ID: 'public-client-id', APPLE_CLIENT_ID: 'apple-public', APPLE_TEAM_ID: 'team', APPLE_KEY_ID: 'key' } });
  const body = await response.json() as any;
  assert.equal(body.google.configured, true);
  assert.equal(body.apple.configured, true);
  assert.equal(JSON.stringify(body).includes('SUPABASE_SERVICE_ROLE_KEY'), false);
});

test('legacy identity endpoints reject invalid or unavailable credentials truthfully', async () => {
  assert.equal((await authMe(context('/api/auth/me'))).status, 401);
  assert.equal((await signout(context('/api/auth/signout', 'POST'))).status, 401);
  assert.equal((await google(context('/api/auth/google', 'POST', {}))).status, 400);
  assert.equal((await apple(context('/api/auth/apple', 'POST', {}))).status, 400);
  assert.equal((await guestLink({ request: request('/api/auth/link-guest', 'POST', {}, { Authorization: 'Bearer valid-looking-token' }), env })).status, 503);
  const deletion = await accountDelete(context('/api/auth/account', 'DELETE', { confirmation: 'DELETE' }));
  assert.equal(deletion.status, 401);
});

test('music search handler maps provider response and validates query', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ results: [{ trackId: 42, trackName: 'Song', artistName: 'Artist', previewUrl: 'https://audio.test/preview.mp3' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  try {
    const response = await musicSearch(context('/api/music/search?q=song'));
    const body = await response.json() as any;
    assert.equal(response.status, 200);
    assert.equal(body.results[0].id, 'itunes_42');
    assert.equal(body.results[0].playbackStatus, 'verified_audio');
    const invalid = await musicSearch(context('/api/music/search'));
    assert.equal(invalid.status, 400);
  } finally { globalThis.fetch = originalFetch; }
});

test('discovery rejects unsupported requested language instead of returning unrelated songs', async () => {
  const response = await musicDiscover(context('/api/music/discover?languages=Klingon'));
  assert.equal(response.status, 400);
  assert.deepEqual((await response.json() as any).tracks, []);
});

test('MusicBrainz handler validates empty query', async () => {
  const response = await musicBrainz(context('/api/musicbrainz/search'));
  assert.equal(response.status, 400);
  assert.deepEqual((await response.json() as any).recordings, []);
});

test('catalogue handlers return the checked-in snapshot with Express-compatible pagination', async () => {
  const response = await catalogueTracks(context('/api/catalogue/tracks?page=1&pageSize=2'));
  const body = await response.json() as any;
  assert.equal(response.status, 200);
  assert.equal(body.items.length, 2);
  assert.equal(body.pageSize, 2);
  assert.equal(body.total > 2, true);
  assert.equal((await catalogueStats().json() as any).totalUniqueRecords, body.total);
  const write = await catalogueWrite(context('/api/catalogue/tracks', 'POST', { title: 'New', artist: 'Artist' }));
  assert.equal(write.status, 401);
});

test('leaderboard requires valid periods and configured Supabase', async () => {
  assert.equal((await leaderboard(context('/api/leaderboard?period=unknown'))).status, 400);
  assert.equal((await leaderboard(context('/api/leaderboard'))).status, 503);
});

test('leaderboard handler maps rows returned by Supabase without fabricated entries', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.match(String(input), /leaderboard_public/);
    return Response.json([{ user_id: 'user-1', display_name: 'Player', avatar_seed: 'seed', total_score: 42, current_streak: 3, accuracy_percentage: 80, last_played_at: '2026-11-12T12:00:00.000Z' }]);
  };
  try {
    const response = await leaderboard({ request: request('/api/leaderboard?period=all-time'), env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'test-anon-key-123456' } });
    const body = await response.json() as any;
    assert.equal(response.status, 200);
    assert.equal(body.count, 1);
    assert.equal(body.entries[0].score, 42);
  } finally { globalThis.fetch = originalFetch; }
});

test('admin metrics handler verifies Supabase identity, active profile, and admin role', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes('/auth/v1/user')) return Response.json({ id: 'admin-1', email: 'admin@example.test', user_metadata: {} });
    if (url.includes('/rest/v1/profiles') && url.includes('account_type')) return Response.json({ account_type: 'admin', account_status: 'active' });
    if (url.includes('/rest/v1/profiles')) return Response.json([{ email_verified: true, account_status: 'active', auth_provider: 'email', games_played: 7, created_at: new Date().toISOString() }]);
    throw new Error(`Unexpected Supabase request: ${url}`);
  };
  try {
    const response = await adminMetrics({
      request: request('/api/admin/metrics', 'GET', undefined, { Authorization: 'Bearer signed-session-token' }),
      env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'test-anon-key-123456', SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-secret' }
    });
    const body = await response.json() as any;
    assert.equal(response.status, 200);
    assert.equal(body.totalRegisteredUsers, 1);
    assert.equal(body.totalGamesPlayed, 7);
    assert.equal(body.totalGuestPlayers, null);
  } finally { globalThis.fetch = originalFetch; }
});

test('account deletion handler validates identity then uses the server-side admin endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let deleteCalled = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/auth/v1/user')) return Response.json({ id: '123e4567-e89b-12d3-a456-426614174000', email: 'user@example.test' });
    if (url.includes('/auth/v1/admin/users/123e4567-e89b-12d3-a456-426614174000') && init?.method === 'DELETE') {
      deleteCalled = true;
      return Response.json({ id: '123e4567-e89b-12d3-a456-426614174000' });
    }
    throw new Error(`Unexpected Supabase request: ${url}`);
  };
  try {
    const response = await accountDelete({
      request: request('/api/auth/account', 'DELETE', { confirmation: 'DELETE' }, { Authorization: 'Bearer signed-session-token' }),
      env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'test-anon-key-123456', SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-secret' }
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as any).status, 'account_deleted');
    assert.equal(deleteCalled, true);
  } finally { globalThis.fetch = originalFetch; }
});

test('admin Pages handlers fail closed without verified admin credentials', async () => {
  assert.equal((await adminMetrics(context('/api/admin/metrics'))).status, 401);
  assert.equal((await adminPlayers(context('/api/admin/players'))).status, 401);
  assert.equal((await adminStatus({ ...context('/api/admin/players/id/status', 'POST', { status: 'suspended' }), params: { id: 'bad-id' } })).status, 401);
  assert.equal((await adminExport(context('/api/admin/players/export'))).status, 401);
  assert.equal((await adminCatalogueStats(context('/api/admin/catalogue/stats'))).status, 401);
  assert.equal((await adminCataloguePlan(context('/api/admin/catalogue/plan'))).status, 401);
  assert.equal((await adminImportStatus(context('/api/admin/catalogue/import/status'))).status, 401);
  assert.equal((await adminImportStart(context('/api/admin/catalogue/import/start', 'POST', { query: 'artist' }))).status, 401);
  assert.equal((await adminBackup(context('/api/admin/catalogue/backup', 'POST'))).status, 401);
});
