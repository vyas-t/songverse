/** Cloudflare Pages Function: GET /api/music/search
 * Uses Deezer first and Apple iTunes as a fallback. Caches successful results
 * to reduce upstream calls and handles provider throttling gracefully.
 */
type Track = Record<string, unknown>;

export async function onRequestGet(context: any): Promise<Response> {
  const requestUrl = new URL(context.request.url);
  const q = (requestUrl.searchParams.get("q") || requestUrl.searchParams.get("query") || "").trim();
  const title = (requestUrl.searchParams.get("title") || "").trim();
  const artist = (requestUrl.searchParams.get("artist") || "").trim();
  const parsedLimit = Number.parseInt(requestUrl.searchParams.get("limit") || "15", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 15;
  const term = title && artist ? `${title} ${artist}` : (q || title || artist);

  if (!term) return json({ error: "Search term required. Provide q, title, or artist.", results: [] }, 400);

  const cacheKey = new Request(`https://songverse-cache.invalid/api/music/search?term=${encodeURIComponent(term.toLowerCase())}&limit=${limit}`);
  const cache = (globalThis as any).caches?.default;

  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) return withCacheHeaders(cached, 300);
    } catch { /* cache is an optimization; continue if unavailable */ }
  }

  let results: Track[] = [];
  let providerError = "";

  // Deezer often provides playable 30-second previews without requiring an API key.
  try {
    const deezerUrl = new URL("https://api.deezer.com/search");
    deezerUrl.searchParams.set("q", term);
    deezerUrl.searchParams.set("limit", String(limit));
    const response = await fetch(deezerUrl.toString(), { headers: { Accept: "application/json" } });
    if (response.ok) {
      const payload: any = await response.json();
      if (Array.isArray(payload.data)) results = payload.data.map(mapDeezerTrack).filter(Boolean);
      else providerError = "Deezer returned an unexpected response";
    } else {
      providerError = `Deezer returned HTTP ${response.status}`;
    }
  } catch (error: any) {
    providerError = error?.message || "Deezer request failed";
  }

  // Fall back to Apple when Deezer is unavailable or has no matching results.
  if (!results.length) {
    try {
      const appleUrl = new URL("https://itunes.apple.com/search");
      appleUrl.searchParams.set("term", term);
      appleUrl.searchParams.set("entity", "song");
      appleUrl.searchParams.set("limit", String(limit));
      const response = await fetch(appleUrl.toString(), { headers: { Accept: "application/json" } });
      if (response.ok) {
        const payload: any = await response.json();
        results = (Array.isArray(payload.results) ? payload.results : []).map(mapAppleTrack).filter(Boolean);
      } else {
        providerError = `Deezer unavailable; Apple returned HTTP ${response.status}`;
      }
    } catch (error: any) {
      providerError = `Music providers unavailable: ${error?.message || providerError}`;
    }
  }

  if (!results.length) {
    return json(
      { error: providerError || "No playable tracks were returned by the music providers.", results: [] },
      502,
      { "Cache-Control": "no-store", "Retry-After": "30" }
    );
  }

  const response = json({ query: term, count: results.length, results }, 200, {
    "Cache-Control": "public, max-age=60, s-maxage=300",
  });

  if (cache) {
    try { await cache.put(cacheKey, response.clone()); } catch { /* non-fatal */ }
  }
  return response;
}

function mapDeezerTrack(item: any): Track | null {
  if (!item || item.id == null || !item.title) return null;
  const audio = typeof item.preview === "string" && /^https:\/\//i.test(item.preview) ? item.preview : undefined;
  const title = cleanText(item.title);
  const artist = cleanText(item.artist?.name || "Unknown Artist");
  const year = item.release_date ? Number.parseInt(String(item.release_date).slice(0, 4), 10) : 2024;
  const artwork = item.album?.cover_xl || item.album?.cover_big || item.album?.cover_medium;
  return {
    id: `deezer_${item.id}`,
    providerTrackId: String(item.id),
    title,
    artist,
    album: cleanText(item.album?.title || "Single"),
    releaseYear: Number.isFinite(year) ? year : 2024,
    country: "Global",
    genre: "Pop",
    language: detectLanguage(`${title} ${artist}`),
    artworkUrl: artwork,
    audioUrl: audio,
    hasAuthorizedAudio: Boolean(audio),
    playbackStatus: audio ? "verified_audio" : "metadata_only",
    audioAvailability: audio ? "available" : "restricted",
    licenceType: audio ? "Deezer promotional preview (30s)" : "Metadata Only",
    licenceReference: `DEEZER-${item.id}`,
    attributionText: "Track metadata, artwork and preview provided by Deezer.",
    source: "deezer",
    isrc: item.isrc || undefined,
  };
}

function mapAppleTrack(item: any): Track | null {
  if (!item || item.trackId == null) return null;
  const year = item.releaseDate ? Number.parseInt(String(item.releaseDate).slice(0, 4), 10) : 2024;
  const audio = typeof item.previewUrl === "string" && /^https:\/\//i.test(item.previewUrl) ? item.previewUrl : undefined;
  const artwork = typeof item.artworkUrl100 === "string"
    ? item.artworkUrl100.replace(/100x100bb\.(jpg|png)$/i, "600x600bb.$1")
    : undefined;
  const title = cleanText(item.trackName || "Unknown Title");
  const artist = cleanText(item.artistName || "Unknown Artist");
  return {
    id: `itunes_${item.trackId}`,
    providerTrackId: String(item.trackId),
    title,
    artist,
    album: cleanText(item.collectionName || "Single"),
    releaseYear: Number.isFinite(year) ? year : 2024,
    country: item.country || "Global",
    genre: item.primaryGenreName || "Pop",
    language: detectLanguage(`${title} ${artist}`, item.country),
    artworkUrl: artwork || item.artworkUrl100,
    audioUrl: audio,
    hasAuthorizedAudio: Boolean(audio),
    playbackStatus: audio ? "verified_audio" : "metadata_only",
    audioAvailability: audio ? "available" : "restricted",
    licenceType: audio ? "Apple iTunes Promotional Preview (30s)" : "Metadata Only",
    licenceReference: `ITUNES-${item.trackId}`,
    attributionText: "Artwork and promotional preview courtesy of Apple iTunes Search API.",
    source: "apple-itunes",
    isrc: item.isrc || undefined,
  };
}

function cleanText(value: unknown): string {
  return String(value ?? "").replace(/<[^>]*>/g, "").trim();
}

function detectLanguage(text: string, country?: string): string {
  if (/[\u0C00-\u0C7F]/.test(text) || /\b(telugu|tollywood|sid sriram|devi sri prasad|thaman)\b/i.test(text)) return "Telugu";
  if (/[\u0B80-\u0BFF]/.test(text) || /\b(tamil|kollywood|ar rahman|ilayaraja|anirudh)\b/i.test(text)) return "Tamil";
  if (/[\u0900-\u097F]/.test(text) || /\b(hindi|bollywood|arijit|shreya)\b/i.test(text)) return "Hindi";
  if (/[\u0D00-\u0D7F]/.test(text) || /\b(malayalam|mollywood|yesudas)\b/i.test(text)) return "Malayalam";
  if (/[\u0C80-\u0CFF]/.test(text) || /\b(kannada|sandalwood)\b/i.test(text)) return "Kannada";
  if (/[\u0980-\u09FF]/.test(text) || /\b(bengali|bangla)\b/i.test(text)) return "Bengali";
  if (/[\u0A00-\u0A7F]/.test(text) || /\b(punjabi|bhangra)\b/i.test(text)) return "Punjabi";
  if (/\b(spanish|español|bad bunny|shakira|despacito|reggaeton)\b/i.test(text) || ["ES", "MX", "CO", "AR"].includes(country || "")) return "Spanish";
  return "English";
}

function withCacheHeaders(response: Response, seconds: number): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=60, s-maxage=${seconds}`);
  return new Response(response.body, { status: response.status, headers });
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", ...extraHeaders },
  });
}
