/** Cloudflare Pages Function: GET /api/music/search
 * Replaces the Express-only route when SongVerse is deployed as a static Pages app.
 */
export async function onRequestGet(context: any): Promise<Response> {
  const requestUrl = new URL(context.request.url);
  const q = (requestUrl.searchParams.get('q') || requestUrl.searchParams.get('query') || '').trim();
  const title = (requestUrl.searchParams.get('title') || '').trim();
  const artist = (requestUrl.searchParams.get('artist') || '').trim();
  const parsedLimit = Number.parseInt(requestUrl.searchParams.get('limit') || '15', 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 15;
  const term = title && artist ? `${title} ${artist}` : (q || title || artist);

  if (!term) return json({ error: 'Search term required. Provide q, title, or artist.', results: [] }, 400);

  try {
    const appleUrl = new URL('https://itunes.apple.com/search');
    appleUrl.searchParams.set('term', term);
    appleUrl.searchParams.set('entity', 'song');
    appleUrl.searchParams.set('limit', String(limit));
    const response = await fetch(appleUrl.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) return json({ error: `Music provider returned HTTP ${response.status}`, results: [] }, 502);

    const payload: any = await response.json();
    const results = (Array.isArray(payload.results) ? payload.results : []).map((item: any) => {
      const year = item.releaseDate ? Number.parseInt(String(item.releaseDate).slice(0, 4), 10) : 2020;
      const hasAudio = typeof item.previewUrl === 'string' && /^https:\/\//i.test(item.previewUrl);
      const artwork = typeof item.artworkUrl100 === 'string' ? item.artworkUrl100.replace(/100x100bb\.(jpg|png)$/i, '600x600bb.$1') : undefined;
      return {
        id: `itunes_${item.trackId}`,
        providerTrackId: String(item.trackId ?? ''),
        title: item.trackName || 'Unknown Title',
        artist: item.artistName || 'Unknown Artist',
        album: item.collectionName || 'Single',
        releaseYear: Number.isFinite(year) ? year : 2020,
        country: item.country || 'Global',
        genre: item.primaryGenreName || 'Pop',
        language: detectLanguage(`${item.trackName || ''} ${item.artistName || ''}`, item.country),
        artworkUrl: artwork || item.artworkUrl100,
        audioUrl: hasAudio ? item.previewUrl : undefined,
        hasAuthorizedAudio: hasAudio,
        playbackStatus: hasAudio ? 'verified_audio' : 'metadata_only',
        audioAvailability: hasAudio ? 'available' : 'restricted',
        licenceType: hasAudio ? 'Apple iTunes Promotional Preview (30s)' : 'Metadata Only',
        licenceReference: `ITUNES-${item.trackId}`,
        attributionText: 'Artwork and promotional preview courtesy of Apple iTunes Search API.',
        source: 'apple-itunes',
        isrc: item.isrc || undefined
      };
    });
    return json({ query: term, count: results.length, results }, 200, { 'Cache-Control': 'public, max-age=60' });
  } catch (error: any) {
    return json({ error: error?.message || 'Music search failed', results: [] }, 502);
  }
}

function detectLanguage(text: string, country?: string): string {
  if (/[\u0C00-\u0C7F]/.test(text) || /\b(telugu|tollywood|sid sriram|devi sri prasad|thaman)\b/i.test(text)) return 'Telugu';
  if (/[\u0B80-\u0BFF]/.test(text) || /\b(tamil|kollywood|ar rahman|ilayaraja|anirudh)\b/i.test(text)) return 'Tamil';
  if (/[\u0900-\u097F]/.test(text) || /\b(hindi|bollywood|arijit|shreya)\b/i.test(text)) return 'Hindi';
  if (/[\u0D00-\u0D7F]/.test(text) || /\b(malayalam|mollywood|yesudas)\b/i.test(text)) return 'Malayalam';
  if (/[\u0C80-\u0CFF]/.test(text) || /\b(kannada|sandalwood)\b/i.test(text)) return 'Kannada';
  if (/[\u0980-\u09FF]/.test(text) || /\b(bengali|bangla)\b/i.test(text)) return 'Bengali';
  if (/[\u0A00-\u0A7F]/.test(text) || /\b(punjabi|bhangra)\b/i.test(text)) return 'Punjabi';
  if (/\b(spanish|español|bad bunny|shakira|despacito|reggaeton)\b/i.test(text) || ['ES','MX','CO','AR'].includes(country || '')) return 'Spanish';
  return 'English';
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...extraHeaders }
  });
}
