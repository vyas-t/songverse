
/** GET /api/music/discover
 * SongVerse's default artist-focused catalogue.
 * Searches Apple iTunes one artist at a time to reduce request bursts.
 * Returns up to 5 playable previews per requested artist.
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
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function matchesArtist(actual: string, requested: string): boolean {
  const a = normalize(actual);
  const r = normalize(requested);

  if (!a || !r) return false;
  if (a === r || a.includes(r) || r.includes(a)) return true;

  // Common alternative spelling for The Weeknd.
  if (r === "theweeknd" && a === "weeknd") return true;

  return false;
}

function mapAppleTrack(item: any, artist: typeof ARTISTS[number]) {
  if (!item?.trackId || !item?.trackName || !item?.artistName) {
    return null;
  }

  const audio = item.previewUrl;
  if (typeof audio !== "string" || !/^https:\/\//i.test(audio)) {
    return null;
  }

  if (!matchesArtist(item.artistName, artist.name)) {
    return null;
  }

  const parsedYear = item.releaseDate
    ? Number.parseInt(String(item.releaseDate).slice(0, 4), 10)
    : NaN;
  const year = Number.isFinite(parsedYear) ? parsedYear : undefined;

  const artwork = typeof item.artworkUrl100 === "string"
    ? item.artworkUrl100.replace(
        /100x100bb\.(jpg|png)$/i,
        "600x600bb.$1"
      )
    : undefined;

  return {
    id: `itunes_${item.trackId}`,
    provider: "apple-itunes",
    providerTrackId: String(item.trackId),
    title: String(item.trackName),
    artist: String(item.artistName),
    album: String(item.collectionName || "Single"),
    releaseYear: year ?? 2024,
    decade: `${Math.floor((year ?? 2024) / 10) * 10}s`,
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

  // Retry once after a short wait if Apple rate-limits the request.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 700));
          continue;
        }
        return [];
      }

      if (!response.ok) return [];

      const payload: any = await response.json();
      if (!Array.isArray(payload.results)) return [];

      return payload.results
        .map((item: any) => mapAppleTrack(item, artist))
        .filter(Boolean)
        .slice(0, SONGS_PER_ARTIST);
    } catch {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        continue;
      }
      return [];
    }
  }

  return [];
}

export async function onRequestGet(): Promise<Response> {
  const cacheKey = new Request(
    "https://songverse-cache.invalid/api/music/discover/artist-hits-v2"
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
      // Continue without cache.
    }
  }

  const tracks: any[] = [];
  const artistCounts: Record<string, number> = {};
  const errors: string[] = [];

  // Sequential requests reduce provider rate-limit pressure.
  for (const artist of ARTISTS) {
    const found = await searchArtist(artist);
    artistCounts[artist.name] = found.length;
    tracks.push(...found);

    // Small pause between artists.
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  const unique = Array.from(
    new Map(tracks.map((track) => [track.id, track])).values()
  );

  const body = {
    count: unique.length,
    targetCount: ARTISTS.length * SONGS_PER_ARTIST,
    artists: ARTISTS.map((artist) => artist.name),
    artistCounts,
    tracks: unique,
    ...(unique.length === 0
      ? {
          error:
            "No playable previews were returned. The provider may be rate-limiting requests.",
          details: errors,
        }
      : {}),
  };

  const response = new Response(JSON.stringify(body), {
    status: unique.length > 0 ? 200 : 502,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control":
        unique.length > 0 ? "public, max-age=60, s-maxage=300" : "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(unique.length === 0 ? { "Retry-After": "30" } : {}),
    },
  });

  if (cache && unique.length > 0) {
    try {
      await cache.put(cacheKey, response.clone());
    } catch {
      // Cache failure does not affect the response.
    }
  }

  return response;
}
