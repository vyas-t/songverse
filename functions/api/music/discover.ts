/** Cloudflare Pages Function: GET /api/music/discover */
const SEEDS: Record<string, string[]> = {
  English: ['popular English songs', 'Billboard hits', 'classic rock hits'],
  Telugu: ['Telugu hit songs', 'Sid Sriram Telugu', 'Tollywood songs'],
  Hindi: ['Hindi hit songs', 'Bollywood hits', 'Arijit Singh'],
  Tamil: ['Tamil hit songs', 'Anirudh Tamil', 'A R Rahman Tamil'],
  Malayalam: ['Malayalam hit songs', 'Malayalam film songs'],
  Kannada: ['Kannada hit songs', 'Kannada film songs'],
  Bengali: ['Bengali hit songs', 'Bengali film songs'],
  Punjabi: ['Punjabi hit songs', 'Punjabi pop'],
  Spanish: ['Spanish hit songs', 'Latin pop hits']
};

export async function onRequestGet(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const raw = (url.searchParams.get('languages') || url.searchParams.get('language') || 'English').trim();
  const languages = [...new Set(raw.split(',').map((s: string) => s.trim()).filter(Boolean))].slice(0, 9);
  const tracks: any[] = [];
  try {
    for (const language of languages.length ? languages : ['English']) {
      const seeds = SEEDS[language] || SEEDS.English;
      const term = seeds[Math.floor(Math.random() * seeds.length)];
      const appleUrl = new URL('https://itunes.apple.com/search');
      appleUrl.searchParams.set('term', term);
      appleUrl.searchParams.set('entity', 'song');
      appleUrl.searchParams.set('limit', '12');
      const response = await fetch(appleUrl.toString(), { headers: { Accept: 'application/json' } });
      if (!response.ok) continue;
      const payload: any = await response.json();
      for (const item of Array.isArray(payload.results) ? payload.results : []) {
        if (typeof item.previewUrl !== 'string' || !/^https:\/\//i.test(item.previewUrl)) continue;
        const year = item.releaseDate ? Number.parseInt(String(item.releaseDate).slice(0, 4), 10) : 2024;
        const artwork = typeof item.artworkUrl100 === 'string' ? item.artworkUrl100.replace(/100x100bb\.(jpg|png)$/i, '600x600bb.$1') : undefined;
        tracks.push({
          id: `itunes_${item.trackId}`,
          provider: 'apple-itunes',
          providerTrackId: String(item.trackId ?? ''),
          title: item.trackName || 'Unknown Title',
          artist: item.artistName || 'Unknown Artist',
          album: item.collectionName || 'Single',
          releaseYear: Number.isFinite(year) ? year : 2024,
          decade: `${Math.floor((Number.isFinite(year) ? year : 2024) / 10) * 10}s`,
          country: item.country || 'Global',
          language,
          genre: item.primaryGenreName || 'Pop',
          artworkUrl: artwork || item.artworkUrl100,
          audioUrl: item.previewUrl,
          audioAssetUrl: item.previewUrl,
          hasAuthorizedAudio: true,
          playbackStatus: 'verified_audio',
          availabilityStatus: 'available',
          audioAvailability: 'available',
          durationSeconds: 30,
          clipStartSeconds: 0,
          licenceReference: `ITUNES-${item.trackId}`,
          licenceType: 'Apple iTunes Promotional Preview (30s)',
          attributionText: 'Artwork and promotional preview courtesy of Apple iTunes Search API.',
          source: 'apple-itunes'
        });
      }
    }
    const unique = Array.from(new Map(tracks.map((t) => [t.providerTrackId, t])).values());
    return new Response(JSON.stringify({ count: unique.length, tracks: unique }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Music discovery failed', tracks: [] }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }
    });
  }
}
