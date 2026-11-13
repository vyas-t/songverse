import catalogueJson from '../../../data/song_catalogue.json';
import { authorizeAdmin } from '../../_shared/admin';
import { json } from '../../_shared/http';
import { SupabaseEnv } from '../../_shared/supabase';

type CatalogueTrack = Record<string, any>;
const TRACKS = catalogueJson as CatalogueTrack[];

function normalize(value: unknown): string {
  return String(value || '').toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
}

function selectedTracks(params: URLSearchParams): CatalogueTrack[] {
  let result = [...TRACKS];
  const query = params.get('q') || params.get('query') || '';
  if (query) {
    const normalized = normalize(query);
    result = result.filter(track => [track.title, track.artist, track.album, ...(track.aliases || []), track.providerTrackId]
      .some(value => normalize(value).includes(normalized)));
  }
  const language = params.get('language');
  if (language && language !== 'ALL') result = result.filter(track => String(track.language).toLowerCase() === language.toLowerCase());
  const genre = params.get('genre');
  if (genre && genre !== 'ALL') result = result.filter(track => String(track.genre).toLowerCase() === genre.toLowerCase());
  const playbackStatus = params.get('playbackStatus');
  if (playbackStatus && playbackStatus !== 'all') result = result.filter(track => track.playbackStatus === playbackStatus);
  const decade = params.get('decade');
  if (decade && decade !== 'ALL') {
    const start = Number.parseInt(decade.replace(/\D/g, ''), 10);
    result = result.filter(track => Number.isFinite(start) && track.releaseYear >= start && track.releaseYear < start + 10);
  }
  const allowedSorts = new Set(['title', 'artist', 'releaseYear', 'importDate']);
  const sortBy = params.get('sortBy') || 'title';
  const sortOrder = params.get('sortOrder') === 'desc' ? -1 : 1;
  if (allowedSorts.has(sortBy)) result.sort((a, b) => String(a[sortBy] ?? '').localeCompare(String(b[sortBy] ?? ''), undefined, { numeric: true }) * sortOrder);
  return result;
}

export function onRequestGet(context: { request: Request }): Response {
  const params = new URL(context.request.url).searchParams;
  const result = selectedTracks(params);
  const pageParam = Number.parseInt(params.get('page') || '1', 10);
  const sizeParam = Number.parseInt(params.get('pageSize') || '20', 10);
  const page = Number.isFinite(pageParam) ? Math.max(1, pageParam) : 1;
  const pageSize = Number.isFinite(sizeParam) ? Math.min(100, Math.max(1, sizeParam)) : 20;
  const total = result.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const items = result.slice((page - 1) * pageSize, page * pageSize);
  return json({ items, total, page, pageSize, totalPages, hasMore: page < totalPages }, 200, {
    'Cache-Control': 'public, max-age=30, s-maxage=120'
  });
}

/** Shared catalogue mutations require a durable authorized store; never report volatile writes as persisted. */
export async function onRequestPost(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const auth = await authorizeAdmin(context.request, context.env, 'catalogue-write');
  if (!auth.ok) return auth.response;
  return json({ error: 'DURABLE_CATALOGUE_UNAVAILABLE', message: 'Shared catalogue writes are not configured for this deployment; no catalogue change was saved.' }, 503);
}

export async function onRequestDelete(context: { request: Request; env: SupabaseEnv }): Promise<Response> {
  const auth = await authorizeAdmin(context.request, context.env, 'catalogue-write');
  if (!auth.ok) return auth.response;
  return json({ error: 'DURABLE_CATALOGUE_UNAVAILABLE', message: 'Shared catalogue writes are not configured for this deployment; no catalogue change was saved.' }, 503);
}
