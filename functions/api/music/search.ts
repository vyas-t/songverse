
/** Cloudflare Pages Function: GET /api/music/search */
type Track = Record<string, unknown>;

export async function onRequestGet(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const q = (
    url.searchParams.get("q") ||
    url.searchParams.get("query") ||
    url.searchParams.get("title") ||
    ""
  ).trim();
  const artist = (url.searchParams.get("artist") || "").trim();
  const term = [q, artist].filter(Boolean).join(" ");
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") || "15", 10);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 50)
    : 15;

  if (!term) {
    return json({ error: "Search term required.", results: [] }, 400);
  }

  try {
    const appleUrl = new URL("https://itunes.apple.com/search");
    appleUrl.searchParams.set("term", term);
    appleUrl.searchParams.set("entity", "song");
    appleUrl.searchParams.set("limit", String(limit));

    const response = await fetch(appleUrl.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 SongVerse/1.0",
      },
    });

    if (!response.ok) {
      return json(
        {
          error: `Apple search returned HTTP ${response.status}`,
          results: [],
          provider: "apple-itunes",
          retryAfter: response.headers.get("Retry-After"),
        },
        502,
        { "Cache-Control": "no-store" }
      );
    }

    const payload: any = await response.json();
    const results: Track[] = (
      Array.isArray(payload.results) ? payload.results : []
    )
      .map(mapAppleTrack)
      .filter(Boolean);

    if (!results.length) {
      return json(
        { query: term, count: 0, results: [], message: "Apple returned no playable tracks." },
        200,
        { "Cache-Control": "no-store" }
      );
    }

    return json(
      { query: term, count: results.length, results },
      200,
      { "Cache-Control": "public, max-age=60, s-maxage=300" }
    );
  } catch (error: any) {
    return json(
      {
        error: "Apple search request failed.",
        detail: String(error?.message || "Unknown fetch error"),
        results: [],
      },
      502,
      { "Cache-Control": "no-store" }
    );
  }
}

function mapAppleTrack(item: any): Track | null {
  if (!item || item.trackId == null) return null;

  const year = item.releaseDate
    ? Number.parseInt(String(item.releaseDate).slice(0, 4), 10)
    : 2024;
  const audio =
    typeof item.previewUrl === "string" &&
    /^https:\/\//i.test(item.previewUrl)
      ? item.previewUrl
      : undefined;
  const artwork =
    typeof item.artworkUrl100 === "string"
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

function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

