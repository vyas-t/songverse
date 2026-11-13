import { json, rateLimit } from '../../_shared/http';

function escapeLucene(value: string): string {
  return value.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, '\\$1');
}

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const { request } = context;
  const limited = rateLimit(request, 'musicbrainz-search', 4, 60_000);
  if (limited) return limited;
  const params = new URL(request.url).searchParams;
  const rawQuery = (params.get('q') || '').trim().slice(0, 160);
  const title = (params.get('title') || '').trim().slice(0, 100);
  const artist = (params.get('artist') || '').trim().slice(0, 100);
  const limitValue = Number.parseInt(params.get('limit') || '10', 10);
  const offsetValue = Number.parseInt(params.get('offset') || '0', 10);
  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 30) : 10;
  const offset = Number.isFinite(offsetValue) ? Math.min(Math.max(offsetValue, 0), 10_000) : 0;
  if (!rawQuery && !title && !artist) return json({ error: 'Missing search query. Provide q, title, or artist query parameters.', recordings: [], count: 0 }, 400);

  let lucene: string;
  if (title && artist) lucene = `recording:"${escapeLucene(title)}" AND artist:"${escapeLucene(artist)}"`;
  else if (title) lucene = `recording:"${escapeLucene(title)}"`;
  else if (artist) lucene = `artist:"${escapeLucene(artist)}"`;
  else if (rawQuery.includes(' - ')) {
    const [songTitle, songArtist] = rawQuery.split(' - ', 2);
    lucene = `recording:"${escapeLucene(songTitle.trim())}" AND artist:"${escapeLucene(songArtist.trim())}"`;
  } else {
    const escaped = escapeLucene(rawQuery);
    lucene = `recording:"${escaped}" OR artist:"${escaped}" OR "${escaped}"`;
  }

  const providerUrl = new URL('https://musicbrainz.org/ws/2/recording/');
  providerUrl.searchParams.set('query', lucene);
  providerUrl.searchParams.set('fmt', 'json');
  providerUrl.searchParams.set('limit', String(limit));
  providerUrl.searchParams.set('offset', String(offset));
  try {
    const response = await fetch(providerUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'SongVerse/2.2 (contact@songverse.app)' },
      signal: AbortSignal.timeout(8_000)
    });
    if (!response.ok) return json({ error: `MusicBrainz API returned HTTP ${response.status}`, recordings: [], count: 0 }, 502, {
      ...(response.headers.get('Retry-After') ? { 'Retry-After': response.headers.get('Retry-After')! } : {})
    });
    const payload: any = await response.json();
    const recordings = (Array.isArray(payload.recordings) ? payload.recordings : []).map((rec: any) => {
      const credits = Array.isArray(rec['artist-credit']) ? rec['artist-credit'] : [];
      const primaryArtist = credits.map((entry: any) => entry.name || entry.artist?.name || '').filter(Boolean).join(', ') || 'Unknown Artist';
      const release = Array.isArray(rec.releases) ? rec.releases[0] : undefined;
      const releaseDate = String(rec['first-release-date'] || release?.date || '');
      const year = Number.parseInt(releaseDate.slice(0, 4), 10);
      return {
        id: rec.id, title: rec.title, artist: primaryArtist, artistCredit: credits,
        album: release?.title || 'Single / Unassigned', releaseYear: Number.isFinite(year) ? year : undefined,
        country: release?.country || rec.country || undefined, disambiguation: rec.disambiguation || undefined,
        score: rec.score ?? undefined, lengthMs: rec.length || undefined,
        isrcs: Array.isArray(rec.isrcs) ? rec.isrcs : [],
        tags: (Array.isArray(rec.tags) ? rec.tags : []).map((tag: any) => tag.name).filter(Boolean).slice(0, 5),
        playbackStatus: 'metadata_only', licenceType: 'Metadata Only (MusicBrainz ODbL)',
        attributionText: 'Metadata provided by MusicBrainz under Open Database License (ODbL). Commercial audio recording protected by copyright.'
      };
    });
    return json({ query: rawQuery || `${title} ${artist}`.trim(), lucene, count: payload.count || 0, offset: payload.offset || offset, limit, recordings }, 200, {
      'Cache-Control': 'public, max-age=60, s-maxage=600'
    });
  } catch {
    return json({ error: 'MusicBrainz search is temporarily unavailable.', recordings: [], count: 0 }, 502, { 'Retry-After': '5' });
  }
}
