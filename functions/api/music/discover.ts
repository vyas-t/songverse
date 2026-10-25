/** Cloudflare Pages Function: GET /api/music/discover
 * Discovers playable previews from Deezer first and Apple iTunes as fallback.
 * Caches per-language results to avoid bursts of upstream requests.
 */
const SEEDS: Record<string, string[]> = {
  English: ["popular English songs", "Billboard hits", "classic rock hits"],
  Telugu: ["Telugu hit songs", "Sid Sriram Telugu", "Tollywood songs"],
  Hindi: ["Hindi hit songs", "Bollywood hits", "Arijit Singh"],
  Tamil: ["Tamil hit songs", "Anirudh Tamil", "A R Rahman Tamil"],
  Malayalam: ["Malayalam hit songs", "Malayalam film songs"],
  Kannada: ["Kannada hit songs", "Kannada film songs"],
  Bengali: ["Bengali hit songs", "Bengali film songs"],
  Punjabi: ["Punjabi hit songs", "Punjabi pop"],
  Spanish: ["Spanish hit songs", "Latin pop hits"],
};

export async function onRequestGet(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const raw = (url.searchParams.get("languages") || url.searchParams.get("language") || "English").trim();
  const languages = [...new Set(raw.split(",").map((s: string) => s.trim()).filter(Boolean))]
    .filter((language) => SEEDS[language])
    .slice(0, 9);
  const selectedLanguages = languages.length ? languages : ["English"];
  const cacheKey = new Request(`https://songverse-cache.invalid/api/music/discover?languages=${encodeURIComponent([...selectedLanguages].sort().join(","))}`);
  const cache = (globalThis as any).caches?.default;

  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    } catch { /* cache is an optimization; continue */ }
  }

  const tracks: any[] = [];
  const failures: string[] = [];

  // One upstream query per selected language; cached requests avoid repeat bursts.
  for (const language of selectedLanguages) {
    const seeds = SEEDS[language] || SEEDS.English;
    const term = seeds[0]; // stable query so the cache key is useful
    let found: any[] = [];

    try {
      const deezerUrl = new URL("https://api.deezer.com/search");
      deezerUrl.searchParams.set("q", term);
      deezerUrl.searchParams.set("limit", "12");
      const response = await fetch(deezerUrl.toString(), { headers: { Accept: "application/json" } });
      if (response.ok) {
        const payload: any = await response.json();
        if (Array.isArray(payload.data)) found = payload.data.map((item: any) => mapDeezerTrack(item, language)).filter(Boolean);
        else failures.push(`${language}: Deezer returned unexpected data`);
      } else {
        failures.push(`${language}: Deezer HTTP ${response.status}`);
      }
    } catch (error: any) {
      failures.push(`${language}: Deezer request failed`);
    }

    // Apple fallback if Deezer failed or had no usable results.
    if (!found.length) {
      try {
        const appleUrl = new URL("https://itunes.apple.com/search");
        appleUrl.searchParams.set("term", term);
        appleUrl.searchParams.set("entity", "song");
        appleUrl.searchParams.set("limit", "12");
        const response = await fetch(appleUrl.toString(), { headers: { Accept: "application/json" } });
        if (response.ok) {
          const payload: any = await response.json();
          found = (Array.isArray(payload.results) ? payload.results : []).map((item: any) => mapAppleTrack(item, language)).filter(Boolean);
        } else {
          failures.push(`${language}: Apple HTTP ${response.status}`);
        }
      } catch {
        failures.push(`${language}: Apple request failed`);
      }
    }

    tracks.push(...found);
  }

  const unique = Array.from(new Map(tracks.map((track) => [track.providerTrackId, track])).values());
  const response = new Response(JSON.stringify({
    count: unique.length,
    tracks: unique,
    ...(unique.length ? {} : { error: "Music providers returned no tracks. Please retry shortly." }),
  }), {
    status: unique.length ? 200 : 502,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": unique.length ? "public, max-age=60, s-maxage=300" : "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(unique.length ? {} : { "Retry-After": "30" }),
    },
  });

  if (cache && unique.length) {
    try { await cache.put(cacheKey, response.clone()); } catch { /* non-fatal */ }
  }
  return response;
}

function mapDeezerTrack(item: any, language: string): any | null {
  if (!item || item.id == null || !item.title) return null;
  const audio = typeof item.preview === "string" && /^https:\/\//i.test(item.preview) ? item.preview : undefined;
  const year = item.release_date ? Number.parseInt(String(item.release_date).slice(0, 4), 10) : 2024;
  return {
    id: `deezer_${item.id}`,
    provider: "deezer",
    providerTrackId: String(item.id),
    title: cleanText(item.title),
    artist: cleanText(item.artist?.name || "Unknown Artist"),
    album: cleanText(item.album?.title || "Single"),
    releaseYear: Number.isFinite(year) ? year : 2024,
    decade: `${Math.floor((Number.isFinite(year) ? year : 2024) / 10) * 10}s`,
    country: "Global",
    language,
    genre: "Pop",
    artworkUrl: item.album?.cover_xl || item.album?.cover_big || item.album?.cover_medium,
    audioUrl: audio,
    audioAssetUrl: audio,
    hasAuthorizedAudio: Boolean(audio),
    playbackStatus: audio ? "verified_audio" : "metadata_only",
    availabilityStatus: audio ? "available" : "restricted",
    audioAvailability: audio ? "available" : "restricted",
    durationSeconds: 30,
    clipStartSeconds: 0,
    licenceReference: `DEEZER-${item.id}`,
    licenceType: audio ? "Deezer promotional preview (30s)" : "Metadata Only",
    attributionText: "Track metadata, artwork and preview provided by Deezer.",
    source: "deezer",
    isrc: item.isrc || undefined,
  };
}

function mapAppleTrack(item: any, language: string): any | null {
  if (!item || item.trackId == null) return null;
  const year = item.releaseDate ? Number.parseInt(String(item.releaseDate).slice(0, 4), 10) : 2024;
  const audio = typeof item.previewUrl === "string" && /^https:\/\//i.test(item.previewUrl) ? item.previewUrl : undefined;
  const artwork = typeof item.artworkUrl100 === "string"
    ? item.artworkUrl100.replace(/100x100bb\.(jpg|png)$/i, "600x600bb.$1")
    : undefined;
  return {
    id: `itunes_${item.trackId}`,
    provider: "apple-itunes",
    providerTrackId: String(item.trackId),
    title: item.trackName || "Unknown Title",
    artist: item.artistName || "Unknown Artist",
    album: item.collectionName || "Single",
    releaseYear: Number.isFinite(year) ? year : 2024,
    decade: `${Math.floor((Number.isFinite(year) ? year : 2024) / 10) * 10}s`,
    country: item.country || "Global",
    language,
    genre: item.primaryGenreName || "Pop",
    artworkUrl: artwork || item.artworkUrl100,
    audioUrl: audio,
    audioAssetUrl: audio,
    hasAuthorizedAudio: Boolean(audio),
    playbackStatus: audio ? "verified_audio" : "metadata_only",
    availabilityStatus: audio ? "available" : "restricted",
    audioAvailability: audio ? "available" : "restricted",
    durationSeconds: 30,
    clipStartSeconds: 0,
    licenceReference: `ITUNES-${item.trackId}`,
    licenceType: audio ? "Apple iTunes Promotional Preview (30s)" : "Metadata Only",
    attributionText: "Artwork and promotional preview courtesy of Apple iTunes Search API.",
    source: "apple-itunes",
    isrc: item.isrc || undefined,
  };
}

function cleanText(value: unknown): string {
  return String(value ?? "").replace(/<[^>]*>/g, "").trim();
}
