import * as fs from 'fs';
import * as path from 'path';

export interface ServerTrack {
  id: string;
  providerTrackId: string;
  title: string;
  artist: string;
  artistCredits: Array<{ name: string; mbid?: string }>;
  album: string;
  releaseDate?: string;
  releaseYear?: number;
  durationMs?: number;
  source: 'musicbrainz-open-metadata' | 'songverse-authorized' | 'open-music-archive' | 'apple-itunes' | 'community-submission' | string;
  importDate: string;
  language: string;
  country?: string;
  genre: string;
  tags: string[];
  isrcs: string[];
  artworkUrl?: string;
  // Decoupled Rights Architecture
  hasAuthorizedAudio: boolean;
  isAuthorizedForGameplay: boolean;
  playbackStatus: 'verified_audio' | 'metadata_only';
  audioAvailability: 'available' | 'restricted' | 'pending_licensing';
  audioSourceType: 'web_audio_synthesis' | 'licensed_stream' | 'none';
  audioPreset?: 'synthpop' | 'indie-acoustic' | 'city-pop' | 'disco-groove' | 'latin-guitar' | 'lofi-piano' | 'electronic-bass' | 'chanson-strings';
  audioUrl?: string;
  licenceType: string;
  licenceReference: string;
  attributionText: string;
  artworkGradient: string;
  clipStartSeconds: number;
  aliases: string[];
}

export interface CatalogueStats {
  totalUniqueRecords: number;
  playableRecords: number;
  metadataOnlyRecords: number;
  byLanguage: Record<string, { total: number; playable: number; metadataOnly: number }>;
  byGenre: Record<string, number>;
  bySource: Record<string, number>;
  lastUpdated: string;
  backupFileExists: boolean;
}

export interface CatalogueFilterParams {
  searchQuery?: string;
  language?: string;
  genre?: string;
  decade?: string;
  country?: string;
  playbackStatus?: 'all' | 'verified_audio' | 'metadata_only';
  page?: number;
  pageSize?: number;
  sortBy?: 'title' | 'artist' | 'releaseYear' | 'importDate';
  sortOrder?: 'asc' | 'desc';
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CATALOGUE_FILE = path.join(DATA_DIR, 'song_catalogue.json');
const BACKUP_FILE = path.join(DATA_DIR, 'catalogue_backup_pre_migration.json');

export class CatalogueStore {
  private tracks: ServerTrack[] = [];
  private recentTargetTrackIds: string[] = []; // Circular buffer of recently played songs to avoid repeats
  private readonly MAX_RECENT_TRACKS = 20;

  constructor() {
    this.ensureDirectoryExists();
    this.loadCatalogue();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private normalize(str: string): string {
    return (str || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ');
  }

  private loadCatalogue() {
    try {
      if (fs.existsSync(CATALOGUE_FILE)) {
        const raw = fs.readFileSync(CATALOGUE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.tracks = parsed;
          console.log(`[CatalogueStore] Loaded ${this.tracks.length} tracks from ${CATALOGUE_FILE}`);
          return;
        }
      }
    } catch (err) {
      console.error('[CatalogueStore] Failed to load catalogue file:', err);
    }

    // Default to empty catalogue without auto-seeding demo tracks
    this.tracks = [];
    this.saveCatalogue();
  }

  public clearCatalogue() {
    this.tracks = [];
    this.recentTargetTrackIds = [];
    this.saveCatalogue();
  }

  public saveCatalogue() {
    try {
      this.ensureDirectoryExists();
      fs.writeFileSync(CATALOGUE_FILE, JSON.stringify(this.tracks, null, 2), 'utf8');
    } catch (err) {
      console.error('[CatalogueStore] Error writing catalogue file:', err);
    }
  }

  public mapLegacyToTrack(legacy: any): ServerTrack {
    const isPlayable = legacy.playbackStatus === 'verified_audio' && legacy.provider === 'songverse-authorized';
    return {
      id: legacy.id || `trk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      providerTrackId: legacy.providerTrackId || legacy.id,
      title: legacy.title,
      artist: legacy.artist,
      artistCredits: legacy.artistCredit || [{ name: legacy.artist }],
      album: legacy.album || 'Single',
      releaseDate: legacy.releaseYear ? `${legacy.releaseYear}-01-01` : undefined,
      releaseYear: legacy.releaseYear,
      durationMs: (legacy.durationSeconds || 210) * 1000,
      source: legacy.provider || 'songverse-authorized',
      importDate: legacy.importDate || new Date().toISOString(),
      language: legacy.language || 'English',
      country: legacy.country || 'Global',
      genre: legacy.genre || 'General',
      tags: legacy.tags || [],
      isrcs: legacy.isrcs || [],
      hasAuthorizedAudio: isPlayable,
      isAuthorizedForGameplay: isPlayable,
      playbackStatus: legacy.playbackStatus || (isPlayable ? 'verified_audio' : 'metadata_only'),
      audioAvailability: legacy.availabilityStatus || (isPlayable ? 'available' : 'restricted'),
      audioSourceType: isPlayable ? 'web_audio_synthesis' : 'none',
      audioPreset: legacy.audioSynthesizerPreset,
      audioUrl: legacy.audioUrl,
      licenceType: legacy.licenceType || (isPlayable ? 'Creative Commons 0' : 'Metadata Only (MusicBrainz ODbL)'),
      licenceReference: legacy.licenceReference || (isPlayable ? 'SV-LIC-AUTH' : 'ODbL-MUSICBRAINZ'),
      attributionText: legacy.attributionText || 'SongVerse Authorized Catalogue Entry',
      artworkUrl: legacy.artworkUrl,
      artworkGradient: legacy.artworkGradient || 'from-indigo-600 via-purple-600 to-pink-500',
      clipStartSeconds: legacy.clipStartSeconds || 15,
      aliases: legacy.aliases || [legacy.title, `${legacy.artist} ${legacy.title}`]
    };
  }

  /**
   * Safe Multi-Key Insertion & Uniqueness Enforcement:
   * 1. MusicBrainz MBID / providerTrackId
   * 2. Internal track ID
   * 3. Normalized Title + Artist + Album
   */
  public addOrUpdateTrack(track: ServerTrack): { added: boolean; updated: boolean; track: ServerTrack; reason: string } {
    // 1. Check MBID / providerTrackId
    if (track.providerTrackId) {
      const idx = this.tracks.findIndex(
        t => t.providerTrackId && t.providerTrackId.toLowerCase() === track.providerTrackId.toLowerCase()
      );
      if (idx >= 0) {
        // Merge without duplicating
        const existing = this.tracks[idx];
        const merged: ServerTrack = {
          ...existing,
          ...track,
          id: existing.id,
          // Preserve authorized gameplay rights if existing had it
          hasAuthorizedAudio: existing.hasAuthorizedAudio || track.hasAuthorizedAudio,
          isAuthorizedForGameplay: existing.isAuthorizedForGameplay || track.isAuthorizedForGameplay,
          playbackStatus: existing.hasAuthorizedAudio ? 'verified_audio' : track.playbackStatus,
          audioPreset: existing.audioPreset || track.audioPreset,
          artworkUrl: track.artworkUrl || existing.artworkUrl
        };
        this.tracks[idx] = merged;
        this.saveCatalogue();
        return { added: false, updated: true, track: merged, reason: 'Updated existing record by Provider ID' };
      }
    }

    // 2. Check internal ID
    const idIdx = this.tracks.findIndex(t => t.id === track.id);
    if (idIdx >= 0) {
      this.tracks[idIdx] = { ...this.tracks[idIdx], ...track };
      this.saveCatalogue();
      return { added: false, updated: true, track: this.tracks[idIdx], reason: 'Updated existing internal ID' };
    }

    // 3. Check normalized title + artist + album uniqueness
    const normTitle = this.normalize(track.title);
    const normArtist = this.normalize(track.artist);
    const normAlbum = this.normalize(track.album || '');

    const dupIdx = this.tracks.findIndex(t => {
      const tTitle = this.normalize(t.title);
      const tArtist = this.normalize(t.artist);
      const tAlbum = this.normalize(t.album || '');
      return tTitle === normTitle && tArtist === normArtist && (!normAlbum || !tAlbum || normAlbum === tAlbum);
    });

    if (dupIdx >= 0) {
      // Do not duplicate
      return { added: false, updated: false, track: this.tracks[dupIdx], reason: 'Duplicate recording already exists in catalogue' };
    }

    // New unique recording
    this.tracks.push(track);
    this.saveCatalogue();
    return { added: true, updated: false, track, reason: 'Inserted new unique track' };
  }

  public removeTrack(id: string): { removed: boolean; id: string } {
    const initialLen = this.tracks.length;
    this.tracks = this.tracks.filter(t => t.id !== id && t.providerTrackId !== id);
    const removed = this.tracks.length < initialLen;
    if (removed) {
      this.saveCatalogue();
    }
    return { removed, id };
  }

  public getAllTracks(): ServerTrack[] {
    return [...this.tracks];
  }

  public getTrackById(id: string): ServerTrack | undefined {
    return this.tracks.find(t => t.id === id || t.providerTrackId === id);
  }

  public getStats(): CatalogueStats {
    const totalUniqueRecords = this.tracks.length;
    let playableRecords = 0;
    let metadataOnlyRecords = 0;
    const byLanguage: Record<string, { total: number; playable: number; metadataOnly: number }> = {};
    const byGenre: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const t of this.tracks) {
      const isPlayable = t.isAuthorizedForGameplay && t.playbackStatus === 'verified_audio';
      if (isPlayable) {
        playableRecords++;
      } else {
        metadataOnlyRecords++;
      }

      const lang = t.language || 'Unassigned';
      if (!byLanguage[lang]) {
        byLanguage[lang] = { total: 0, playable: 0, metadataOnly: 0 };
      }
      byLanguage[lang].total++;
      if (isPlayable) {
        byLanguage[lang].playable++;
      } else {
        byLanguage[lang].metadataOnly++;
      }

      const genre = t.genre || 'General';
      byGenre[genre] = (byGenre[genre] || 0) + 1;

      const src = t.source || 'unknown';
      bySource[src] = (bySource[src] || 0) + 1;
    }

    return {
      totalUniqueRecords,
      playableRecords,
      metadataOnlyRecords,
      byLanguage,
      byGenre,
      bySource,
      lastUpdated: new Date().toISOString(),
      backupFileExists: fs.existsSync(BACKUP_FILE)
    };
  }

  public searchTracks(params: CatalogueFilterParams) {
    let result = [...this.tracks];

    // Filter by query
    if (params.searchQuery) {
      const q = this.normalize(params.searchQuery);
      result = result.filter(t => {
        const titleMatch = this.normalize(t.title).includes(q);
        const artistMatch = this.normalize(t.artist).includes(q);
        const albumMatch = this.normalize(t.album).includes(q);
        const aliasMatch = (t.aliases || []).some(a => this.normalize(a).includes(q));
        const idMatch = t.providerTrackId?.toLowerCase().includes(q.toLowerCase());
        return titleMatch || artistMatch || albumMatch || aliasMatch || idMatch;
      });
    }

    // Filter by language
    if (params.language && params.language !== 'ALL') {
      result = result.filter(t => t.language.toLowerCase() === params.language!.toLowerCase());
    }

    // Filter by genre
    if (params.genre && params.genre !== 'ALL') {
      result = result.filter(t => t.genre.toLowerCase() === params.genre!.toLowerCase());
    }

    // Filter by decade
    if (params.decade && params.decade !== 'ALL') {
      const decadeNum = parseInt(params.decade.replace(/\D/g, ''), 10);
      result = result.filter(t => {
        if (!t.releaseYear) return false;
        return t.releaseYear >= decadeNum && t.releaseYear < decadeNum + 10;
      });
    }

    // Filter by playback status
    if (params.playbackStatus && params.playbackStatus !== 'all') {
      result = result.filter(t => t.playbackStatus === params.playbackStatus);
    }

    // Sorting
    const sortBy = params.sortBy || 'title';
    const sortOrder = params.sortOrder === 'desc' ? -1 : 1;

    result.sort((a, b) => {
      let valA: any = a[sortBy as keyof ServerTrack] || '';
      let valB: any = b[sortBy as keyof ServerTrack] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const total = result.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;
    const items = result.slice(offset, offset + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages
    };
  }

  /**
   * Fair Random Playable Song Selection:
   * - Only songs with `isAuthorizedForGameplay: true` and `playbackStatus: 'verified_audio'`.
   * - Respects language / genre / decade filter.
   * - Avoids recently played songs when enough eligible songs exist (> 3).
   * - Avoids selecting the same song twice within an active round set.
   * - Returns `{ eligible: false, message: '...' }` if no authorized audio is available for the filter.
   */
  public selectRandomPlayableSong(options: {
    language?: string;
    languages?: string[];
    genre?: string;
    decade?: string;
    excludeTrackIds?: string[];
  }): { eligible: boolean; track?: ServerTrack; message?: string } {
    let eligible = this.tracks.filter(t => t.isAuthorizedForGameplay && t.playbackStatus === 'verified_audio');

    // Multi-Language filter
    if (options.languages && options.languages.length > 0) {
      const matchLangs = options.languages.map(l => l.toLowerCase());
      eligible = eligible.filter(t => matchLangs.includes(t.language.toLowerCase()));
      if (eligible.length === 0) {
        return {
          eligible: false,
          message: `No authorized audio recordings are currently available for the selected languages: ${options.languages.join(', ')}.`
        };
      }
    } else if (options.language && options.language !== 'ALL') {
      const matchLang = options.language.toLowerCase();
      eligible = eligible.filter(t => t.language.toLowerCase() === matchLang);
      if (eligible.length === 0) {
        return {
          eligible: false,
          message: `No authorized audio recordings are currently available for ${options.language}. Under SongVerse's strict copyright and compliance policy, commercial songs without authorized licenses cannot be played in trivia rounds. You can browse ${options.language} metadata in the Catalogue or choose another language for gameplay.`
        };
      }
    }

    // Genre filter
    if (options.genre && options.genre !== 'ALL') {
      const matchGenre = options.genre.toLowerCase();
      eligible = eligible.filter(t => t.genre.toLowerCase() === matchGenre);
      if (eligible.length === 0) {
        return {
          eligible: false,
          message: `No authorized audio recordings available for genre "${options.genre}".`
        };
      }
    }

    // Decade filter
    if (options.decade && options.decade !== 'ALL') {
      const decadeNum = parseInt(options.decade.replace(/\D/g, ''), 10);
      eligible = eligible.filter(t => t.releaseYear && t.releaseYear >= decadeNum && t.releaseYear < decadeNum + 10);
      if (eligible.length === 0) {
        return {
          eligible: false,
          message: `No authorized audio recordings available for decade "${options.decade}".`
        };
      }
    }

    // Exclude tracks in active session
    if (options.excludeTrackIds && options.excludeTrackIds.length > 0) {
      const filtered = eligible.filter(t => !options.excludeTrackIds!.includes(t.id));
      if (filtered.length > 0) {
        eligible = filtered;
      }
    }

    // Avoid recently played songs if enough candidates remain (> 2)
    if (eligible.length > 2) {
      const filteredRecent = eligible.filter(t => !this.recentTargetTrackIds.includes(t.id));
      if (filteredRecent.length > 0) {
        eligible = filteredRecent;
      }
    }

    if (eligible.length === 0) {
      return {
        eligible: false,
        message: 'No eligible playable tracks found matching the specified criteria.'
      };
    }

    // Random choice
    const randomIndex = Math.floor(Math.random() * eligible.length);
    const chosen = eligible[randomIndex];

    // Push to recent tracks buffer
    this.recentTargetTrackIds.push(chosen.id);
    if (this.recentTargetTrackIds.length > this.MAX_RECENT_TRACKS) {
      this.recentTargetTrackIds.shift();
    }

    return {
      eligible: true,
      track: chosen
    };
  }

  public getPlayableTracks(): ServerTrack[] {
    return this.tracks.filter(t => t.isAuthorizedForGameplay && t.playbackStatus === 'verified_audio');
  }

  public backupCatalogue(): { success: boolean; filePath: string; count: number; timestamp: string } {
    this.ensureDirectoryExists();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(DATA_DIR, `catalogue_backup_${timestamp}.json`);
    const backupData = {
      backupDate: new Date().toISOString(),
      recordCount: this.tracks.length,
      tracks: this.tracks
    };
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
    return {
      success: true,
      filePath: backupFilePath,
      count: this.tracks.length,
      timestamp: backupData.backupDate
    };
  }
}

export const catalogueStore = new CatalogueStore();
