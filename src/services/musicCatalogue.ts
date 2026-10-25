import { Track, PaginatedResult, CatalogueFilterOptions, CSVImportValidationResult } from '../types';

export const INITIAL_TRACK_CATALOGUE: Track[] = [];
const STORAGE_KEY_USER_CATALOGUE = 'songverse_user_catalogue_v2';

class MusicCatalogueService {
  private tracks: Track[] = [];
  private listeners: Set<() => void> = new Set();
  private hasInitialized: boolean = false;

  constructor() {
    this.loadFromStorage();
    this.syncWithServer();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error('Error in musicCatalogue listener:', err);
      }
    });
  }

  private getStorage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        return (globalThis as any).localStorage;
      }
    } catch {
      // Ignored
    }
    return null;
  }

  private loadFromStorage() {
    try {
      const storage = this.getStorage();
      if (storage) {
        const stored = storage.getItem(STORAGE_KEY_USER_CATALOGUE);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.tracks = parsed;
            this.hasInitialized = true;
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load catalogue from localStorage:', err);
    }
    this.tracks = [...INITIAL_TRACK_CATALOGUE];
    this.hasInitialized = true;
  }

  private saveToStorage() {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.setItem(STORAGE_KEY_USER_CATALOGUE, JSON.stringify(this.tracks));
      }
    } catch (err) {
      console.warn('Failed to save catalogue to localStorage:', err);
    }
  }

  public async syncWithServer(): Promise<void> {
    try {
      if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
      const res = await fetch('/api/catalogue/tracks?pageSize=1000');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          let updated = false;
          // Reconcile server tracks with local catalogue
          for (const serverTrack of data.items) {
            const exists = this.tracks.some(
              t => t.id === serverTrack.id || t.providerTrackId === serverTrack.providerTrackId
            );
            if (!exists) {
              const mapped: Track = {
                id: serverTrack.id,
                provider: serverTrack.source || 'songverse-authorized',
                providerTrackId: serverTrack.providerTrackId || serverTrack.id,
                title: serverTrack.title,
                artist: serverTrack.artist,
                album: serverTrack.album || 'Single',
                language: serverTrack.language || 'English',
                genre: serverTrack.genre || 'General',
                releaseYear: serverTrack.releaseYear || 2024,
                decade: serverTrack.releaseYear ? `${Math.floor(serverTrack.releaseYear / 10) * 10}s` : '2020s',
                country: serverTrack.country || 'Global',
                artworkUrl: serverTrack.artworkUrl,
                artworkGradient: serverTrack.artworkGradient || 'from-indigo-600 to-purple-600',
                audioUrl: serverTrack.audioUrl,
                audioAssetUrl: serverTrack.audioUrl,
                audioSynthesizerPreset: serverTrack.audioPreset,
                playbackStatus: serverTrack.playbackStatus || 'metadata_only',
                availabilityStatus: serverTrack.audioAvailability || 'restricted',
                durationSeconds: Math.round((serverTrack.durationMs || 210000) / 1000),
                clipStartSeconds: serverTrack.clipStartSeconds || 15,
                licenceReference: serverTrack.licenceReference || 'SV-AUTH',
                licenceType: serverTrack.licenceType || 'Metadata Only',
                attributionText: serverTrack.attributionText || 'SongVerse Catalogue Entry',
                regionRestrictions: []
              };
              this.tracks.push(mapped);
              updated = true;
            }
          }
          if (updated) {
            this.saveToStorage();
            this.notify();
          }
        }
      }
    } catch {
      // Offline or dev server starting
    }
  }

  public getAllTracks(): Track[] {
    return [...this.tracks];
  }

  public clearCatalogue(): void {
    this.tracks = [];
    this.saveToStorage();
    this.notify();
    try {
      if (typeof window !== 'undefined' && typeof fetch === 'undefined') {
        fetch('/api/catalogue/clear', { method: 'POST' }).catch(() => {});
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Only returns tracks approved with VERIFIED AUDIO for active gameplay rounds.
   * Guarantees gameplay never encounters unauthorized audio.
   */
  public getPlayableTracks(): Track[] {
    return this.tracks.filter(
      t => t.availabilityStatus === 'available' && t.playbackStatus === 'verified_audio'
    );
  }

  // Alias for backward compatibility with gameEngine
  public getAvailableTracks(): Track[] {
    return this.getPlayableTracks();
  }

  public getWishlistTracks(): Track[] {
    return this.tracks.filter(t => t.playbackStatus === 'metadata_only');
  }

  public getMetadataOnlyTracks(): Track[] {
    return this.getWishlistTracks();
  }

  public getTrackById(id: string): Track | undefined {
    return this.tracks.find(t => t.id === id || t.providerTrackId === id);
  }

  /**
   * Real playable track counts per language (9 supported languages)
   */
  public getPlayableCountsByLanguage(): Record<string, number> {
    const counts: Record<string, number> = {
      English: 0,
      Telugu: 0,
      Hindi: 0,
      Tamil: 0,
      Malayalam: 0,
      Kannada: 0,
      Bengali: 0,
      Punjabi: 0,
      Spanish: 0
    };
    for (const t of this.getPlayableTracks()) {
      const lang = t.language;
      if (counts[lang] !== undefined) {
        counts[lang]++;
      } else {
        counts[lang] = 1;
      }
    }
    return counts;
  }

  /**
   * Filter playable tracks by multiple selected languages
   */
  public getPlayableTracksByLanguages(languages: string[]): Track[] {
    if (!languages || languages.length === 0) return [];
    const lower = languages.map(l => l.toLowerCase());
    return this.getPlayableTracks().filter(t => lower.includes(t.language.toLowerCase()));
  }

  /**
   * Auto-discover playable tracks from Apple iTunes API for requested languages
   */
  public async autoDiscoverSongs(languages: string[]): Promise<number> {
    try {
      const langParam = languages.join(',');
      const res = await fetch(`/api/music/discover?languages=${encodeURIComponent(langParam)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tracks)) {
          let addedCount = 0;
          for (const raw of data.tracks) {
            const track: Track = {
              id: raw.id,
              provider: 'apple-itunes',
              providerTrackId: raw.providerTrackId || raw.id,
              title: raw.title,
              artist: raw.artist,
              album: raw.album || 'Single',
              releaseYear: raw.releaseYear || 2024,
              decade: raw.decade || '2020s',
              country: raw.country || 'Global',
              language: raw.language || 'English',
              genre: raw.genre || 'Pop',
              artworkUrl: raw.artworkUrl,
              artworkGradient: 'from-sv-red to-sv-orange',
              audioUrl: raw.audioUrl,
              audioAssetUrl: raw.audioUrl,
              playbackStatus: 'verified_audio',
              availabilityStatus: 'available',
              durationSeconds: 210,
              clipStartSeconds: 15,
              licenceReference: raw.licenceReference || `ITUNES-${raw.providerTrackId}`,
              licenceType: raw.licenceType || 'Apple iTunes Promotional Preview',
              attributionText: raw.attributionText || 'Preview via Apple iTunes API',
              regionRestrictions: [],
              aliases: [raw.title, `${raw.artist} ${raw.title}`]
            };
            const r = this.addTrack(track);
            if (r.added) addedCount++;
          }
          if (addedCount > 0) {
            this.saveToStorage();
            this.notify();
          }
          return addedCount;
        }
      }
    } catch {
      // Ignored
    }
    return 0;
  }

  /**
   * Fast, paginated query engine with multi-language, genre, alphabet, and status filters.
   */
  public getPaginatedTracks(options: CatalogueFilterOptions = {}): PaginatedResult<Track> {
    const {
      searchQuery = '',
      language = 'All',
      genre = 'All',
      decade = 'All',
      country = 'All',
      playbackStatus = 'all',
      alphabetLetter = 'ALL',
      page = 1,
      pageSize = 9,
      sortBy = 'title',
      sortOrder = 'asc'
    } = options;

    let filtered = [...this.tracks];

    // Playback status filter
    if (playbackStatus !== 'all') {
      filtered = filtered.filter(t => t.playbackStatus === playbackStatus);
    }

    // Language filter
    if (language !== 'All') {
      filtered = filtered.filter(t => t.language.toLowerCase() === language.toLowerCase());
    }

    // Genre filter
    if (genre !== 'All') {
      filtered = filtered.filter(t => t.genre.toLowerCase() === genre.toLowerCase());
    }

    // Decade filter
    if (decade !== 'All') {
      filtered = filtered.filter(t => t.decade === decade);
    }

    // Country filter
    if (country !== 'All') {
      filtered = filtered.filter(t => (t.country || '').toLowerCase() === country.toLowerCase());
    }

    // Alphabetical Letter Filter (A-Z or # for numbers/symbols)
    if (alphabetLetter !== 'ALL') {
      if (alphabetLetter === '#') {
        filtered = filtered.filter(t => {
          const firstChar = t.title.trim().charAt(0).toUpperCase();
          return !/[A-Z]/.test(firstChar);
        });
      } else {
        filtered = filtered.filter(t => {
          const firstChar = t.title.trim().charAt(0).toUpperCase();
          return firstChar === alphabetLetter.toUpperCase();
        });
      }
    }

    // Search query with tokenized normalization
    if (searchQuery.trim().length > 0) {
      filtered = this.searchTracksInternal(searchQuery, filtered);
    } else {
      filtered.sort((a, b) => {
        const valA = (a[sortBy] || '').toString().toLowerCase();
        const valB = (b[sortBy] || '').toString().toLowerCase();
        if (sortBy === 'releaseYear') {
          return sortOrder === 'asc' ? a.releaseYear - b.releaseYear : b.releaseYear - a.releaseYear;
        }
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const startIdx = (safePage - 1) * pageSize;
    const items = filtered.slice(startIdx, startIdx + pageSize);

    return {
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
      hasMore: safePage < totalPages
    };
  }

  public getTracksByFilter(filter?: {
    genre?: string;
    decade?: string;
    language?: string;
    searchQuery?: string;
  }): Track[] {
    const res = this.getPaginatedTracks({
      genre: filter?.genre,
      decade: filter?.decade,
      language: filter?.language,
      searchQuery: filter?.searchQuery,
      pageSize: 100
    });
    return res.items;
  }

  public searchTracks(query: string, limit: number = 8): Track[] {
    const scored = this.searchTracksInternal(query, this.tracks);
    return scored.slice(0, limit);
  }

  private searchTracksInternal(query: string, pool: Track[]): Track[] {
    const cleanQuery = this.normalizeString(query);
    if (!cleanQuery) return pool;

    const queryTokens = cleanQuery.split(' ').filter(t => t.length > 1 && t !== 'and' && t !== 'the');

    return pool
      .map(track => {
        let score = 0;
        const normTitle = this.normalizeString(track.title);
        const normArtist = this.normalizeString(track.artist);
        const normAlbum = this.normalizeString(track.album);
        const combined = `${normTitle} ${normArtist} ${normAlbum}`;

        if (normTitle === cleanQuery) score += 100;
        else if (normTitle.startsWith(cleanQuery)) score += 60;
        else if (normTitle.includes(cleanQuery)) score += 40;

        if (normArtist === cleanQuery) score += 80;
        else if (normArtist.startsWith(cleanQuery)) score += 50;
        else if (normArtist.includes(cleanQuery)) score += 30;

        if (normAlbum.includes(cleanQuery)) score += 20;

        let matchedTokens = 0;
        for (const token of queryTokens) {
          if (combined.includes(token)) {
            matchedTokens++;
          }
        }
        if (matchedTokens > 0) {
          score += matchedTokens * 25;
        }

        if (track.aliases) {
          for (const alias of track.aliases) {
            const normAlias = this.normalizeString(alias);
            if (normAlias.includes(cleanQuery)) {
              score += 35;
              break;
            }
          }
        }

        return { track, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.track);
  }

  public exportToCSV(): string {
    const headers = [
      'id',
      'title',
      'artist',
      'album',
      'language',
      'genre',
      'releaseYear',
      'country',
      'playbackStatus',
      'audioUrl',
      'duration',
      'clipStart',
      'licenceRef',
      'licenceType'
    ];
    const escapeCsv = (str: string | number | undefined) => {
      if (str === undefined || str === null) return '';
      const s = String(str);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const rows = this.tracks.map(t => [
      escapeCsv(t.id),
      escapeCsv(t.title),
      escapeCsv(t.artist),
      escapeCsv(t.album),
      escapeCsv(t.language),
      escapeCsv(t.genre),
      escapeCsv(t.releaseYear),
      escapeCsv(t.country || ''),
      escapeCsv(t.playbackStatus),
      escapeCsv(t.audioUrl || ''),
      escapeCsv(t.durationSeconds),
      escapeCsv(t.clipStartSeconds),
      escapeCsv(t.licenceReference),
      escapeCsv(t.licenceType)
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  public importFromCSV(csvText: string, isDryRun: boolean = false): CSVImportValidationResult {
    return this.importTracksFromCSV(csvText, isDryRun);
  }

  public addTrack(newTrack: Track): { added: boolean; track: Track; reason?: string } {
    const normTitle = this.normalizeString(newTrack.title);
    const normArtist = this.normalizeString(newTrack.artist);
    const existing = this.tracks.find(
      t => (t.id && t.id === newTrack.id) ||
           (t.providerTrackId && t.providerTrackId === newTrack.providerTrackId) ||
           (this.normalizeString(t.title) === normTitle && this.normalizeString(t.artist) === normArtist)
    );
    if (existing) {
      return { added: false, track: existing, reason: 'Duplicate or already exists in catalogue' };
    }

    this.tracks.push(newTrack);
    this.saveToStorage();
    this.notify();

    // Async sync with server
    try {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        fetch('/api/catalogue/tracks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTrack)
        }).catch(() => {});
      }
    } catch {
      // Ignored
    }

    return { added: true, track: newTrack };
  }

  public removeTrack(id: string): { removed: boolean; id: string } {
    const initialLen = this.tracks.length;
    this.tracks = this.tracks.filter(t => t.id !== id && t.providerTrackId !== id);
    const removed = this.tracks.length < initialLen;
    if (removed) {
      this.saveToStorage();
      this.notify();

      // Async sync with server
      try {
        if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
          fetch(`/api/catalogue/tracks/${encodeURIComponent(id)}`, {
            method: 'DELETE'
          }).catch(() => {});
        }
      } catch {
        // Ignored
      }
    }
    return { removed, id };
  }

  public addMusicBrainzTrack(data: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    releaseYear?: number;
    country?: string;
    disambiguation?: string;
    isrcs?: string[];
  }): Track {
    const existing = this.tracks.find(
      t => t.providerTrackId === data.id || t.musicBrainzId === data.id
    );
    if (existing) {
      return existing;
    }

    const year = data.releaseYear || 2020;
    const decade = `${Math.floor(year / 10) * 10}s`;
    const albumName = data.album || 'Single';

    const newTrack: Track = {
      id: `mb_${data.id}`,
      provider: 'musicbrainz-open-metadata',
      providerTrackId: data.id,
      musicBrainzId: data.id,
      isrc: data.isrcs && data.isrcs.length > 0 ? data.isrcs[0] : undefined,
      title: data.title,
      artist: data.artist,
      album: albumName,
      language: 'English',
      genre: 'General',
      releaseYear: year,
      decade,
      country: data.country || 'Global',
      playbackStatus: 'metadata_only',
      artworkGradient: 'from-slate-700 via-indigo-950 to-slate-900',
      durationSeconds: 210,
      clipStartSeconds: 0,
      licenceReference: `MBID-${data.id}`,
      licenceType: 'Metadata Only (MusicBrainz ODbL)',
      attributionText: `${data.artist} - "${data.title}" indexed via MusicBrainz Open Database Licence (ODbL). Metadata-only; no audio stream attached.`,
      availabilityStatus: 'restricted',
      regionRestrictions: [],
      aliases: [data.title, `${data.artist} ${data.title}`]
    };

    this.addTrack(newTrack);
    return newTrack;
  }

  public importTracksFromCSV(csvText: string, isDryRun: boolean = false): CSVImportValidationResult {
    const lines = csvText.trim().split('\n');
    const validRows: Track[] = [];
    const invalidRows: { rowNumber: number; data: Record<string, string>; errors: string[] }[] = [];
    let duplicateCount = 0;

    if (lines.length < 2) {
      return { validRows: [], invalidRows: [], duplicateCount: 0, importedCount: 0 };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;

      const cols = rawLine.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      const rowData: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowData[h] = cols[idx] || '';
      });

      const errors: string[] = [];
      if (!rowData['title']) errors.push('Missing required column: title');
      if (!rowData['artist']) errors.push('Missing required column: artist');

      if (errors.length > 0) {
        invalidRows.push({ rowNumber: i + 1, data: rowData, errors });
        continue;
      }

      const title = rowData['title'];
      const artist = rowData['artist'];
      const album = rowData['album'] || 'Single';
      const language = rowData['language'] || 'English';
      const genre = rowData['genre'] || 'General';
      const year = parseInt(rowData['year'] || '2024', 10);
      const isPlayable = rowData['playbackstatus'] === 'verified_audio' && !!rowData['audiourl'];

      const isDuplicate = this.tracks.some(
        t => this.normalizeString(t.title) === this.normalizeString(title) &&
             this.normalizeString(t.artist) === this.normalizeString(artist)
      );

      if (isDuplicate) {
        duplicateCount++;
        continue;
      }

      const newTrack: Track = {
        id: 'trk_import_' + Math.random().toString(36).substring(2, 9),
        provider: 'community-submission',
        providerTrackId: 'COMM-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        title,
        artist,
        album,
        language,
        genre,
        releaseYear: isNaN(year) ? 2024 : year,
        decade: isNaN(year) ? '2020s' : `${Math.floor(year / 10) * 10}s`,
        country: rowData['country'] || 'Global',
        playbackStatus: isPlayable ? 'verified_audio' : 'metadata_only',
        artworkGradient: 'from-indigo-600 via-purple-600 to-pink-500',
        audioSynthesizerPreset: 'synthpop',
        audioUrl: rowData['audiourl'] || undefined,
        audioAssetUrl: rowData['audiourl'] || undefined,
        durationSeconds: parseInt(rowData['duration'] || '210', 10),
        clipStartSeconds: parseInt(rowData['clipstart'] || '0', 10),
        licenceReference: rowData['licenceref'] || 'CC-BY-4.0',
        licenceType: 'CC-BY-4.0',
        attributionText: `${artist} - ${title} (Imported track).`,
        availabilityStatus: isPlayable ? 'available' : 'restricted',
        regionRestrictions: [],
        aliases: [title, `${artist} ${title}`]
      };

      validRows.push(newTrack);
      if (!isDryRun) {
        this.tracks.push(newTrack);
      }
    }

    return {
      validRows,
      invalidRows,
      duplicateCount,
      importedCount: validRows.length
    };
  }

  private normalizeString(str: string): string {
    return (str || '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ');
  }
}

export const musicCatalogue = new MusicCatalogueService();
