
/** Cloudflare Pages Function: GET /api/music/discover
 * SongVerse artist-focused discovery with diagnostic logging.
 * Searches Apple iTunes for up to 5 playable previews per artist.
 */

const ARTISTS = [
  { name: "Taylor Swift", language: "English" },
  { name: "The Weeknd", language: "English" },
  { name: "Eminem", language: "English" },
  { name: "Tame Impala", language: "English" },
  { name: "Chase Atlantic", language: "English" },
  { name: "Travis Scott", language: "English" },
  { name: "Bad Bunny", language: "Spanish" },
  { name: "Karan Aujla", language: "Punjabi" },
  { name: "Arijit Singh", language: "Hindi" },
  { name: "Bruno Mars", language: "English" },
  { name: "Ariana Grande", language: "English" },
  { name: "Dua Lipa", language: "English" },
  { name: "Playboi Carti", language: "English" },
  { name: "Michael Jackson", language: "English" },
  { name: "Arpit Bala", language: "Hindi" },
  { name: "Yo Yo Honey Singh", language: "Punjabi" },
] as const;

const SONGS_PER_ARTIST = 5;

function normalize(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesArtist(actual: string, requested: string): boolean {
  const a = normalize(actual);
  const r = normalize(requested);

  if (!a || !r) return false;
  if (a === r || a.includes(r) || r.includes(a)) return true;

  if (r === "theweeknd" && a === "weeknd") return true;

  return false;
}

function mapAppleTrack(item: any, artist: typeof ARTISTS[number]): any | null {
  if (!item?.trackId || !item?.trackName || !item?.artistName) return null;

  const audio = item.previewUrl;
  if (typeof audio !== "string" || !/^https:\/\//i.test(audio)) return null;
  if (!matchesArtist(item.artistName, artist.name)) return null;

  const parsedYear = item.releaseDate
    ? Number.parseInt(String(item.releaseDate).slice(0, 4), 10)
    : NaN;
  const year = Number.isFinite(parsedYear) ? parsedYear : 2024;

  const artwork = typeof item.artworkUrl100 === "string"
    ? item.artworkUrl100.replace(/100x100bb\.(jpg|png)$/i, "600x600bb.$1")
    : undefined;

  return {
    id: `itunes_${item.trackId}`,
    provider: "apple-itunes",
    providerTrackId: String(item.trackId),
    title: String(item.trackName),
    artist: String(item.artistName),
    album: String(item.collectionName || "Single"),
    releaseYear: year,
    decade: `${Math.floor(year / 10) * 10}s`,
    country: "Global",
    language: artist.language,
    genre: String(item.primaryGenreName || "Pop"),
    artworkUrl: artwork || item.artworkUrl100,
    audioUrl: audio,
    audioAssetUrl: audio,
    hasAuthorizedAudio: true,
    playbackStatus: "verified_audio",
    availabilityStatus: "available",
    audioAvailability: "available",
    durationSeconds: 30,
    clipStartSeconds: 0,
    licenceReference: `ITUNES-${item.trackId}`,
    licenceType: "Apple iTunes Promotional Preview (30s)",
    attributionText:
      "Artwork and promotional preview courtesy of Apple iTunes Search API.",
    source: "apple-itunes",
    requestedArtist: artist.name,
    isrc: item.isrc || undefined,
  };
}

async function searchArtist(artist: typeof ARTISTS[number]) {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", artist.name);
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "50");

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      console.log(
        `[SongVerse discovery] Apple status for ${artist.name}: ${response.status}`
      );

      if (response.status === 429 || response.status >= 500) {
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 700));
          continue;
        }
        return { tracks: [], error: `${artist.name}: Apple HTTP ${response.status}` };
      }

      if (!response.ok) {
        return { tracks: [], error: `${artist.name}: Apple HTTP ${response.status}` };
      }

      const payload: any = await response.json();

      if (!Array.isArray(payload.results)) {
        console.error(`[SongVerse discovery] Unexpected response for ${artist.name}`);
        return { tracks: [], error: `${artist.name}: unexpected Apple response` };
      }

      const tracks = payload.results
        .map((item: any) => mapAppleTrack(item, artist))
        .filter(Boolean)
        .slice(0, SONGS_PER_ARTIST);

      console.log(
        `[SongVerse discovery] ${artist.name}: ${tracks.length} playable matches from ${payload.results.length} Apple results`
      );

      return { tracks, error: tracks.length ? undefined : `${artist.name}: no matching playable previews` };
    } catch (error) {
      console.error(
        `[SongVerse discovery] Apple request failed for ${artist.name}:`,
        String(error)
      );

      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        continue;
      }

      return { tracks: [], error: `${artist.name}: Apple request failed` };
    }
  }

  return { tracks: [], error: `${artist.name}: request attempts exhausted` };
}

export async function onRequestGet(): Promise<Response> {
  const cacheKey = new Request(
    "https://songverse-cache.invalid/api/music/discover/artist-hits-v3"
  );
  const cache = (globalThis as any).caches?.default;

  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        return new Response(cached.body, {
          status: cached.status,
          headers: cached.headers,
        });
      }
    } catch {
      console.log("[SongVerse discovery] Cache read failed; continuing.");
    }
  }

  const tracks: any[] = [];
  const errors: string[] = [];
  const artistCounts: Record<string, number> = {};

  for (const artist of ARTISTS) {
    const result = await searchArtist(artist);
    artistCounts[artist.name] = result.tracks.length;
    tracks.push(...result.tracks);

    if (result.error) errors.push(result.error);

    // Small pause between requests to reduce rate limiting.
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  const unique = Array.from(
    new Map(tracks.map((track: any) => [track.id, track])).values()
  );

  const response = new Response(
    JSON.stringify({
      count: unique.length,
      targetCount: ARTISTS.length * SONGS_PER_ARTIST,
      artists: ARTISTS.map((artist) => artist.name),
      artistCounts,
      tracks: unique,
      ...(unique.length === 0
        ? {
            error: "No playable previews were returned.",
            details: errors,
          }
        : {}),
    }),
    {
      status: unique.length > 0 ? 200 : 502,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control":
          unique.length > 0 ? "public, max-age=60, s-maxage=300" : "no-store",
        "X-Content-Type-Options": "nosniff",
        ...(unique.length === 0 ? { "Retry-After": "30" } : {}),
      },
    }
  );

  if (cache && unique.length > 0) {
    try {
      await cache.put(cacheKey, response.clone());
    } catch {
      console.log("[SongVerse discovery] Cache write failed.");
    }
  }

  return response;
}
