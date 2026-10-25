export type GameMode = 'classic' | 'daily' | 'practice' | 'category' | 'multiplayer';

export type GameLevelNumber = 1 | 2 | 3 | 4;

// 1. Decoupled Song Metadata
export interface TrackMetadata {
  id: string;
  providerTrackId: string;
  title: string;
  artist: string;
  album: string;
  language: string;
  genre: string;
  releaseYear: number;
  decade: string;
  country?: string; // Country/region of origin
  artworkUrl?: string; // Real high-resolution album artwork URL from music catalogue API
  artworkGradient: string; // Tailored CSS gradient for cover art
  aliases?: string[];
  musicBrainzId?: string;
  isrc?: string;
}

// 2. Decoupled Playable Audio Stream Source
export interface AudioStreamSource {
  playbackStatus: 'verified_audio' | 'metadata_only'; // Clear distinction between playable audio and metadata-only
  audioUrl?: string; // Optional external authorized URL
  audioAssetUrl?: string; // Authorized audio asset URL
  audioSynthesizerPreset?: 'synthpop' | 'indie-acoustic' | 'city-pop' | 'disco-groove' | 'latin-guitar' | 'lofi-piano' | 'electronic-bass' | 'chanson-strings';
  durationSeconds: number;
  clipStartSeconds: number;
  availabilityStatus: 'available' | 'restricted' | 'maintenance';
}

// 3. Decoupled Legal & Licensing Compliance Record
export interface LicensingRecord {
  licenceReference: string;
  licenceType: 'Creative Commons 0' | 'CC-BY-4.0' | 'Public Domain Dedication' | 'Open Audio Project' | 'Metadata Only (MusicBrainz ODbL)' | 'B2B Pre-Cleared (Feed.fm / 7digital)' | 'Apple iTunes Promotional Preview (30s)' | 'Jamendo Creative Commons' | 'Direct Authorized Stream' | string;
  attributionText: string;
  regionRestrictions: string[];
  rightsTier?: 'b2b_commercial_cleared' | 'open_commons' | 'public_domain' | 'metadata_only';
  commercialUsePermitted?: boolean;
  requiresUserSubscription?: boolean; // Strictly false for SongVerse players
}

// Complete Unified Track (Composite interface preserving 100% backwards-compatibility)
export interface Track extends TrackMetadata, AudioStreamSource, LicensingRecord {
  provider: 'songverse-authorized' | 'open-music-archive' | 'musicbrainz-open-metadata' | 'community-submission' | 'b2b-licensed-cleared' | 'apple-itunes';
}


export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CatalogueFilterOptions {
  searchQuery?: string;
  language?: string;
  genre?: string;
  decade?: string;
  country?: string;
  playbackStatus?: 'all' | 'verified_audio' | 'metadata_only';
  alphabetLetter?: string; // 'A' through 'Z', or '#' for numbers/symbols, or 'ALL'
  page?: number;
  pageSize?: number;
  sortBy?: 'title' | 'artist' | 'releaseYear';
  sortOrder?: 'asc' | 'desc';
}

export interface CSVImportValidationResult {
  validRows: Track[];
  invalidRows: { rowNumber: number; data: Record<string, string>; errors: string[] }[];
  duplicateCount: number;
  importedCount: number;
}

export interface GuessRecord {
  level: GameLevelNumber;
  selectedTrackId: string;
  selectedTrackTitle: string;
  selectedTrackArtist: string;
  isCorrect: boolean;
  pointsAwarded: number;
  timestamp: number;
}

export interface GameRound {
  id: string;
  roundNumber: number;
  targetTrackId: string; // Kept private during gameplay!
  currentLevel: GameLevelNumber;
  status: 'playing' | 'won' | 'lost';
  pointsAwarded: number;
  guesses: GuessRecord[];
  startedAt: number;
  completedAt?: number;
  targetTrack?: Track; // Only populated once round is completed!
}

export interface GameSession {
  sessionId: string;
  userId: string;
  mode: GameMode;
  rounds: GameRound[];
  currentRoundIndex: number;
  totalScore: number;
  status: 'in-progress' | 'completed';
  startedAt: number;
  completedAt?: number;
  categoryFilter?: {
    type: 'genre' | 'decade' | 'language';
    value: string;
  };
  selectedLanguages?: string[];
}

export interface LevelConfig {
  level: GameLevelNumber;
  durationSeconds: number;
  points: number;
  label: string;
  description: string;
  difficultyBadge: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarSeed: string;
  isGuest: boolean;
  authProvider?: 'guest' | 'google' | 'apple';
  email?: string;
  preferredLanguages?: string[];
  linkedAt?: number;
  gamesPlayed: number;
  roundsPlayed: number;
  roundsWon: number;
  accuracy: number;
  totalScore: number;
  bestScore: number;
  currentStreak: number;
  bestStreak: number;
  favoriteGenres: Record<string, number>;
  unlockedAchievements: string[];
  createdAt: number;
  lastPlayedAt: number;
}

export interface AuthProviderConfig {
  id: 'google' | 'apple';
  name: string;
  configured: boolean;
  clientId?: string;
  missingEnvVars: string[];
  setupInstructions: string[];
}


export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: 'speed' | 'accuracy' | 'streak' | 'discovery' | 'milestone';
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  points: number;
  targetValue: number;
  currentValue?: number;
  isUnlocked?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarSeed: string;
  score: number;
  accuracy: number;
  streak: number;
  dateAchieved: string;
  gameMode: GameMode;
}

export interface DailyChallenge {
  dateString: string; // YYYY-MM-DD
  version: string;
  trackIds: string[];
  totalRounds: number;
}

export interface MultiplayerPlayer {
  id: string;
  displayName: string;
  avatarSeed: string;
  isReady: boolean;
  isHost: boolean;
  score: number;
  currentLevel: GameLevelNumber;
  hasGuessedThisRound: boolean;
  lastGuessCorrect?: boolean;
  status?: 'connected' | 'idle' | 'disconnected';
}

export interface MultiplayerRoom {
  roomCode: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'round-summary' | 'finished' | 'completed';
  trackIds: string[];
  currentRoundIndex: number;
  players: MultiplayerPlayer[];
  roundStartedAt: number;
  createdAt: number;
  currentTrack?: Track;
}

export interface CookiePreferences {
  strictlyNecessary: true;
  functional: boolean;
  analytics: boolean;
  hasChosen: boolean;
  updatedAt: number;
}

export interface AutomatedTestResult {
  id: string;
  scenarioNumber: number;
  title: string;
  expected: string;
  passed: boolean;
  details: string;
  durationMs: number;
}
