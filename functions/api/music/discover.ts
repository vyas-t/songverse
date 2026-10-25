
/** Cloudflare Pages Function: GET /api/music/discover
 * Discovers playable hit previews from the user's chosen artists.
 * Uses Deezer first and Apple iTunes as fallback.
 * Returns up to 10 playable songs per artist.
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

const SONGS_PER_ARTIST = 10;

export async function onRequestGet(context: any): Promise<Response> {
  const cacheKey = new Request(
    "https://songverse-cache.invalid/api/music/discover/artist-hits-v1"
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
      // Continue if cache is unavailable.
    }
  }

  const results = await Promise.all(
    ARTISTS.map(async (artist) => {
      try {
        const deezerUrl = new URL("https://api.deezer.com/search");
        deezerUrl.searchParams.set("q", `artist:"${artist.name}"`);
        deezerUrl.searchParams.set("limit", "25");

        const response = await fetch(deezerUrl.toString(), {
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          const payload: any = await response.json();

          if (Array.isArray(payload.data)) {
            const tracks = payload.data
              .map((item: any) => mapDeezerTrack(item, artist.name, artist.language))
              .filter(Boolean)
              .slice(0, SONGS_PER_ARTIST);

            if (tracks.length > 0) return tracks;
          }
        }
      } catch {
        // Try Apple below.
      }

      try {
        const appleUrl = new URL("https://itunes.apple.com/search");
        appleUrl.searchParams.set("term", artist.name);
        appleUrl.searchParams.set("entity", "song");
        appleUrl.searchParams.set("limit", "50");

        const response = await fetch(appleUrl.toString(), {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) return [];

        const payload: any = await response.json();
        if (!Array.isArray(payload.results)) return [];

        return payload.results
          .filter((item: any) =>
            String(item.artistName || "")
              .toLowerCase()
              .includes(artist.name.toLowerCase())
          )
          .map((item: any) =>
            mapAppleTrack(item, artist.name, artist.language)
          )
          .filter(Boolean)
          .slice(0, SONGS_PER_ARTIST);
      } catch {
        return [];
      }
    })
  );

  const unique = Array.from(
    new Map(
      results
        .flat()
        .filter(Boolean)
        .map((track: any) => [track.id, track])
    ).values()
  );

  const response = new Response(
    JSON.stringify({
      count: unique.length,
      artists: ARTISTS.map((artist) => artist.name),
      tracks: unique,
      ...(unique.length === 0
        ? { error: "No playable artist previews were found. Please retry." }
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
      // Caching is optional.
    }
  }

  return response;
}

function cleanText(value: unknown): string {
  return String(value ?? "").replace(/<[^>]*>/g, "").trim();
}

function mapDeezerTrack(
  item: any,
  requestedArtist: string,
  language: string
): any | null {
  if (!item || item.id == null || !item.title) return null;

  const actualArtist = cleanText(item.artist?.name || "");
  const audio =
    typeof item.preview === "string" &&
    /^https:\/\//i.test(item.preview)
      ? item.preview
      : undefined;

  // Don't include tracks without preview audio.
  if (!audio || !actualArtist) return null;

  const year = item.release_date
    ? Number.parseInt(String(item.release_date).slice(0, 4), 10)
    : 2024;

  const validYear = Number.isFinite(year) ? year : 2024;

  return {
    id: `deezer_${item.id}`,
    provider: "deezer",
    providerTrackId: String(item.id),
    title: cleanText(item.title),
    artist: actualArtist,
    album: cleanText(item.album?.title || "Single"),
    releaseYear: validYear,
    decade: `${Math.floor(validYear / 10) * 10}s`,
    country: "Global",
    language,
    genre: "Pop",
    artworkUrl:
      item.album?.cover_xl ||
      item.album?.cover_big ||
      item.album?.cover_medium,
    audioUrl: audio,
    audioAssetUrl: audio,
    hasAuthorizedAudio: true,
    playbackStatus: "verified_audio",
    availabilityStatus: "available",
    audioAvailability: "available",
    durationSeconds: 30,
    clipStartSeconds: 0,
    licenceReference: `DEEZER-${item.id}`,
    licenceType: "Deezer promotional preview (30s)",
    attributionText: "Track metadata, artwork and preview provided by Deezer.",
    source: "deezer",
    requestedArtist,
    isrc: item.isrc || undefined,
  };
}

function mapAppleTrack(
  item: any,
  requestedArtist: string,
  language: string
): any | null {
  if (!item || item.trackId == null || !item.trackName) return null;

  const audio =
    typeof item.previewUrl === "string" &&
    /^https:\/\//i.test(item.previewUrl)
      ? item.previewUrl
      : undefined;

  if (!audio || !item.artistName) return null;

  const year = item.releaseDate
    ? Number.parseInt(String(item.releaseDate).slice(0, 4), 10)
    : 2024;

  const validYear = Number.isFinite(year) ? year : 2024;

  const artwork =
    typeof item.artworkUrl100 === "string"
      ? item.artworkUrl100.replace(
          /100x100bb\.(jpg|png)$/i,
          "600x600bb.$1"
        )
      : undefined;

  return {
    id: `itunes_${item.trackId}`,
    provider: "apple-itunes",
    providerTrackId: String(item.trackId),
    title: cleanText(item.trackName),
    artist: cleanText(item.artistName),
    album: cleanText(item.collectionName || "Single"),
    releaseYear: validYear,
    decade: `${Math.floor(validYear / 10) * 10}s`,
    country: item.country || "Global",
    language,
    genre: item.primaryGenreName || "Pop",
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
    requestedArtist,
    isrc: item.isrc || undefined,
  };
}
