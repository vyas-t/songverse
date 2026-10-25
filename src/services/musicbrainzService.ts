/**
 * MusicBrainz Open Metadata Integration Service
 * 
 * Documentation & Compliance:
 * - Follows https://musicbrainz.org/doc/MusicBrainz_API
 * - Enforces 1 request/second rate limiting and User-Agent compliance.
 * - Proxies via server-side /api/musicbrainz/search endpoint with caching.
 * - MusicBrainz provides open encyclopedic metadata under ODbL, NOT audio files.
 */

export interface MusicBrainzRecording {
  id: string; // MusicBrainz Recording MBID UUID
  title: string;
  artist: string;
  artistCredit?: Array<{ name: string; artist?: { id: string; name: string; country?: string } }>;
  album: string;
  releaseYear?: number;
  country?: string;
  disambiguation?: string;
  score?: number;
  lengthMs?: number;
  isrcs?: string[];
  tags?: string[];
  playbackStatus: 'metadata_only';
  licenceType: string;
  attributionText: string;
}

export interface MusicBrainzSearchResult {
  query: string;
  count: number;
  offset: number;
  limit: number;
  recordings: MusicBrainzRecording[];
}

export interface MusicBrainzSearchOptions {
  query?: string;
  title?: string;
  artist?: string;
  limit?: number;
  offset?: number;
}

class MusicBrainzService {
  private lastDirectRequestTime = 0;
  private readonly rateLimitMs = 1200;
  private readonly userAgent = 'SongVerse/1.0.0 ( https://songverse.app; contact@songverse.app )';
  private queryCache = new Map<string, { timestamp: number; recordings: MusicBrainzRecording[]; count: number }>();
  private readonly cacheTtlMs = 5 * 60 * 1000;

  /**
   * Search MusicBrainz recordings with pagination and duplicate prevention
   */
  public async searchRecordings(
    queryOrOptions: string | MusicBrainzSearchOptions,
    limit: number = 10,
    offset: number = 0
  ): Promise<MusicBrainzSearchResult> {
    let rawQuery = '';
    let title = '';
    let artist = '';
    let reqLimit = limit;
    let reqOffset = offset;

    if (typeof queryOrOptions === 'string') {
      rawQuery = queryOrOptions.trim();
    } else {
      rawQuery = (queryOrOptions.query || '').trim();
      title = (queryOrOptions.title || '').trim();
      artist = (queryOrOptions.artist || '').trim();
      reqLimit = queryOrOptions.limit ?? limit;
      reqOffset = queryOrOptions.offset ?? offset;
    }

    if (!rawQuery && !title && !artist) {
      return {
        query: '',
        count: 0,
        offset: 0,
        limit: reqLimit,
        recordings: []
      };
    }

    const cacheKey = `${rawQuery}::${title}::${artist}`;
    const now = Date.now();
    const cached = this.queryCache.get(cacheKey);
    if (cached && (now - cached.timestamp < this.cacheTtlMs) && cached.recordings.length >= reqOffset + reqLimit) {
      return {
        query: rawQuery || `${title} ${artist}`.trim(),
        count: cached.count,
        offset: reqOffset,
        limit: reqLimit,
        recordings: cached.recordings.slice(reqOffset, reqOffset + reqLimit)
      };
    }

    // Try server-side endpoint first
    try {
      const params = new URLSearchParams();
      if (rawQuery) params.set('q', rawQuery);
      if (title) params.set('title', title);
      if (artist) params.set('artist', artist);
      params.set('limit', String(reqLimit));
      params.set('offset', String(reqOffset));

      const baseUrl = typeof window !== 'undefined'
        ? ''
        : (process.env.APP_URL || 'http://127.0.0.1:3000');

      const res = await fetch(`${baseUrl}/api/musicbrainz/search?${params.toString()}`);
      if (res.ok) {
        const data: MusicBrainzSearchResult = await res.json();
        return {
          query: data.query || rawQuery,
          count: data.count || 0,
          offset: data.offset || reqOffset,
          limit: data.limit || reqLimit,
          recordings: this.deduplicateRecordings(data.recordings || [])
        };
      }
    } catch {
      // In standalone tests or static runs where server is not listening, continue to direct fallback
    }

    // Direct fetch fallback with strict rate limiting and 503 retry
    const result = await this.fetchDirectFromMusicBrainz(rawQuery, title, artist, reqLimit, reqOffset);
    if (result.recordings.length > 0) {
      const existing = this.queryCache.get(cacheKey)?.recordings || [];
      const combined = [...existing];
      for (const r of result.recordings) {
        if (!combined.some(c => c.id === r.id)) {
          combined.push(r);
        }
      }
      this.queryCache.set(cacheKey, {
        timestamp: Date.now(),
        recordings: combined,
        count: Math.max(result.count, combined.length)
      });
      if (reqOffset > 0 && combined.length > reqOffset) {
        return {
          ...result,
          recordings: combined.slice(reqOffset, reqOffset + reqLimit)
        };
      }
    }
    return result;
  }

  /**
   * Fallback: Query MusicBrainz directly respecting 1 req/sec rate limit
   */
  private async fetchDirectFromMusicBrainz(
    rawQuery: string,
    title: string,
    artist: string,
    limit: number,
    offset: number,
    retriesLeft: number = 2
  ): Promise<MusicBrainzSearchResult> {
    const now = Date.now();
    const timeSinceLast = now - this.lastDirectRequestTime;
    if (timeSinceLast < this.rateLimitMs) {
      await new Promise(r => setTimeout(r, this.rateLimitMs - timeSinceLast));
    }
    this.lastDirectRequestTime = Date.now();

    let lucene = '';
    if (title && artist) {
      lucene = `recording:"${title}" AND artist:"${artist}"`;
    } else if (title) {
      lucene = `recording:"${title}"`;
    } else if (artist) {
      lucene = `artist:"${artist}"`;
    } else if (rawQuery.includes(' - ')) {
      const [t, a] = rawQuery.split(' - ');
      lucene = `recording:"${t.trim()}" AND artist:"${a.trim()}"`;
    } else if (/\bby\b/i.test(rawQuery)) {
      const parts = rawQuery.split(/\bby\b/i);
      lucene = `recording:"${parts[0].trim()}" AND artist:"${parts[1].trim()}"`;
    } else {
      lucene = `recording:"${rawQuery}" OR artist:"${rawQuery}" OR "${rawQuery}"`;
    }

    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(lucene)}&fmt=json&limit=${limit}&offset=${offset}`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': this.userAgent
      }
    });

    if (res.status === 503 && retriesLeft > 0) {
      await new Promise(r => setTimeout(r, 2000 * (3 - retriesLeft)));
      return this.fetchDirectFromMusicBrainz(rawQuery, title, artist, limit, offset, retriesLeft - 1);
    }

    if (!res.ok) {
      throw new Error(`MusicBrainz API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const recordings: MusicBrainzRecording[] = (data.recordings || []).map((rec: any) => {
      const artistCredits = rec['artist-credit'] || [];
      const primaryArtist = artistCredits.map((a: any) => a.name || a.artist?.name || '').filter(Boolean).join(', ') || 'Unknown Artist';
      const primaryRelease = rec.releases?.[0];
      const releaseYearStr = rec['first-release-date'] || primaryRelease?.date || '';
      const releaseYear = releaseYearStr ? parseInt(releaseYearStr.substring(0, 4), 10) : undefined;

      return {
        id: rec.id,
        title: rec.title,
        artist: primaryArtist,
        artistCredit: artistCredits,
        album: primaryRelease?.title || 'Single / Unassigned',
        releaseYear: isNaN(releaseYear as number) ? undefined : releaseYear,
        country: primaryRelease?.country || rec.country || 'Global',
        disambiguation: rec.disambiguation || undefined,
        score: rec.score || 100,
        lengthMs: rec.length || undefined,
        isrcs: rec.isrcs || [],
        tags: (rec.tags || []).map((t: any) => t.name).slice(0, 5),
        playbackStatus: 'metadata_only' as const,
        licenceType: 'Metadata Only (MusicBrainz ODbL)',
        attributionText: `Metadata provided by MusicBrainz under Open Database License (ODbL). Commercial audio recording protected by copyright.`
      };
    });

    return {
      query: rawQuery || `${title} ${artist}`.trim(),
      count: data.count || recordings.length,
      offset: data.offset || offset,
      limit,
      recordings: this.deduplicateRecordings(recordings)
    };
  }

  /**
   * Remove identical duplicate entries by MusicBrainz recording ID (MBID)
   */
  public deduplicateRecordings(recordings: MusicBrainzRecording[]): MusicBrainzRecording[] {
    const seenIds = new Set<string>();
    const deduplicated: MusicBrainzRecording[] = [];

    for (const rec of recordings) {
      if (!seenIds.has(rec.id)) {
        seenIds.add(rec.id);
        deduplicated.push(rec);
      }
    }

    return deduplicated;
  }
}

export const musicBrainzService = new MusicBrainzService();
