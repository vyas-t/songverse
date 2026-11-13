import catalogue from '../../../../data/song_catalogue.json';
import { json, readJson, rateLimit, bearerToken } from '../../../_shared/http';
import { anonKey, createAnonClient, SupabaseEnv, supabaseUrl } from '../../../_shared/supabase';

type Env = SupabaseEnv & { ROOM_COORDINATOR?: { idFromName(name: string): unknown; get(id: unknown): { fetch(request: Request): Promise<Response> } } };

function getPlayableTracks(language: string, mixLanguages: boolean): any[] {
  const records = Array.isArray(catalogue) ? catalogue as any[] : [];
  return records.filter(track => track?.isAuthorizedForGameplay === true && track?.playbackStatus === 'verified_audio' && track?.availabilityStatus === 'available' && typeof track?.id === 'string' && typeof track?.audioUrl === 'string' && (mixLanguages || language === 'ALL' || String(track.language || '').toLowerCase() === language.toLowerCase()));
}

function getPublicTrack(track: any, reveal: boolean): Record<string, unknown> {
  return {
    id: track.id,
    title: reveal ? track.title : undefined,
    artist: reveal ? track.artist : undefined,
    album: reveal ? track.album : undefined,
    aliases: reveal ? track.aliases : undefined,
    language: track.language,
    artworkUrl: track.artworkUrl,
    artworkGradient: track.artworkGradient,
    playbackStatus: track.playbackStatus,
    availabilityStatus: track.availabilityStatus,
    audioUrl: track.audioUrl,
    audioAssetUrl: track.audioAssetUrl,
    durationSeconds: track.durationSeconds,
    clipStartSeconds: track.clipStartSeconds,
    licenceType: track.licenceType,
    attributionText: track.attributionText
  };
}

async function identify(request: Request, env: Env): Promise<{ id: string; error?: Response }> {
  const token = bearerToken(request);
  if (!token) return { id: '', error: json({ error: 'UNAUTHORIZED', message: 'A valid authenticated or guest session is required.' }, 401) };
  const url = supabaseUrl(env), key = anonKey(env);
  if (!url.startsWith('https://') || !key) return { id: '', error: json({ error: 'AUTH_UNAVAILABLE' }, 503) };
  const client = createAnonClient(env, token);
  if (!client) return { id: '', error: json({ error: 'AUTH_UNAVAILABLE' }, 503) };
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { id: '', error: json({ error: 'UNAUTHORIZED', message: 'Session is invalid or expired.' }, 401) };
  // Honor an existing suspended/deleted profile. Anonymous guest sessions do not have a profile row.
  const { data: profile, error: profileError } = await client.from('profiles').select('account_status').eq('id', data.user.id).maybeSingle();
  if (profileError) return { id: '', error: json({ error: 'AUTHORIZATION_UNAVAILABLE' }, 503) };
  if (profile && profile.account_status !== 'active') return { id: '', error: json({ error: 'ACCOUNT_DISABLED' }, 403) };
  if (!profile && !(data.user as any).is_anonymous) return { id: '', error: json({ error: 'PROFILE_REQUIRED' }, 403) };
  return { id: data.user.id };
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const limited = rateLimit(request, 'multiplayer', 120);
  if (limited) return limited;
  if (!env.ROOM_COORDINATOR) return json({ error: 'MULTIPLAYER_UNAVAILABLE', message: 'Multiplayer coordination is not configured.' }, 503);
  const identity = await identify(request, env);
  if (identity.error) return identity.error;

  const path = new URL(request.url).pathname.replace(/^\/api\/multiplayer\/rooms\/?/, '').replace(/\/$/, '');
  const roomAction = path.split('/');
  let code = '';
  let action = '';
  let body: any = {};
  if (path === 'create') {
    if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
    const parsed = await readJson(request);
    if (parsed.error) return parsed.error;
    body = parsed.value;
    code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    const language = typeof body.language === 'string' ? body.language.slice(0, 40) : 'ALL';
    const tracks = getPlayableTracks(language, body.mixLanguages === true);
    if (tracks.length < 3) return json({ error: 'INSUFFICIENT_TRACKS', message: 'There are not enough authorized playable tracks for this room.' }, 422);
    const totalRounds = Math.max(3, Math.min(10, Number(body.totalRounds) || 5));
    const selected = [...tracks].sort(() => Math.random() - 0.5).slice(0, totalRounds);
    action = 'create';
    body = { action, roomCode: code, displayName: body.displayName, languageFilter: language, mode: body.mode, totalRounds, trackIds: selected.map(track => track.id) };
  } else if (path === 'join') {
    if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
    const parsed = await readJson(request); if (parsed.error) return parsed.error;
    code = String(parsed.value.roomCode || ''); action = 'join'; body = { action, displayName: parsed.value.displayName };
  } else {
    code = roomAction[0] || '';
    const suffix = roomAction.slice(1).join('/');
    if (!/^\d{6}$/.test(code)) return json({ error: 'INVALID_ROOM_CODE' }, 400);
    if (!suffix && request.method === 'GET') action = 'read';
    else if (suffix === 'heartbeat' && request.method === 'POST') action = 'heartbeat';
    else {
      if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
      const parsed = await readJson(request); if (parsed.error) return parsed.error;
      body = parsed.value;
      const actions: Record<string, string> = {
        'host/start': 'start', 'host/settings': 'settings', 'host/next-round': 'next', 'host/kick': 'kick', 'host/close': 'close',
        'guess': 'guess', 'skip-level': 'skip', 'ready': 'ready', 'leave': 'leave'
      };
      action = actions[suffix] || '';
      if (!action) return json({ error: 'ROUTE_NOT_FOUND' }, 404);
      if (action === 'settings') {
        const requestedLanguage = typeof body.language === 'string' ? body.language.slice(0, 40) : undefined;
        const tracks = requestedLanguage ? getPlayableTracks(requestedLanguage, body.mixLanguages === true) : [];
        body = { action, languageFilter: requestedLanguage, ...(requestedLanguage ? { trackIds: [...tracks].sort(() => Math.random() - 0.5).slice(0, 10).map(track => track.id) } : {}) };
      } else if (action === 'guess') body = { action, eventId: body.eventId, trackId: body.trackId, guessTitle: body.guessTitle };
      else if (action === 'kick') body = { action, targetUserId: body.targetUserId };
      else if (action === 'ready') body = { action, ready: body.ready === true };
      else if (action === 'settings') body = { ...body, action };
      else body = { action };
    }
  }
  if (!/^\d{6}$/.test(code)) return json({ error: 'INVALID_ROOM_CODE' }, 400);
  const stub = env.ROOM_COORDINATOR.get(env.ROOM_COORDINATOR.idFromName(code));
  const response = await stub.fetch(new Request('https://room.internal/action', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-songverse-user-id': identity.id }, body: JSON.stringify(body)
  }));
  let payload: any;
  try { payload = await response.json(); } catch { return json({ error: 'ROOM_COORDINATOR_ERROR' }, 502); }
  if (payload?.room) {
    const room = payload.room;
    const revealed = room.status === 'round-summary' || room.status === 'completed';
    const trackId = revealed ? room.revealedTrackId : room.currentTrackId;
    const track = getPlayableTracks('ALL', true).find(item => item.id === trackId);
    payload.room = { ...room, currentTrack: track ? getPublicTrack(track, revealed) : undefined, targetTrackRevealed: revealed && track ? getPublicTrack(track, true) : undefined };
  }
  return json(payload, response.status);
}
