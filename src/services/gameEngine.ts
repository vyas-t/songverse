import {
  Track,
  GameRound,
  GameSession,
  GameLevelNumber,
  GameMode,
  GuessRecord,
  UserProfile
} from '../types';
import { GAME_LEVELS, DEFAULT_ROUNDS_PER_GAME, DAILY_CHALLENGE_ROUNDS, ACHIEVEMENTS_LIST } from '../config/gameConfig';
import { musicCatalogue } from './musicCatalogue';

const STORAGE_KEY_USER_PROFILE = 'songverse_user_profile_v1';
const STORAGE_KEY_ACTIVE_SESSION = 'songverse_active_session_v1';
const STORAGE_KEY_COMPLETED_GAMES = 'songverse_completed_games_v1';
const STORAGE_KEY_DAILY_ATTEMPTS = 'songverse_daily_attempts_v1';

class GameEngineService {
  private activeSession: GameSession | null = null;
  private userProfile: UserProfile;

  constructor() {
    this.userProfile = this.loadOrCreateUserProfile();
    this.restoreActiveSession();
  }

  // --- Profile Management ---
  private loadOrCreateUserProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }

    const randId = Math.random().toString(36).substring(2, 8);
    const defaultProfile: UserProfile = {
      id: 'usr_' + randId,
      displayName: `Guest_${randId.substring(0, 4).toUpperCase()}`,
      avatarSeed: 'seed_' + randId,
      isGuest: true,
      gamesPlayed: 0,
      roundsPlayed: 0,
      roundsWon: 0,
      accuracy: 0,
      totalScore: 0,
      bestScore: 0,
      currentStreak: 0,
      bestStreak: 0,
      favoriteGenres: {},
      unlockedAchievements: [],
      createdAt: Date.now(),
      lastPlayedAt: Date.now()
    };
    this.saveUserProfile(defaultProfile);
    return defaultProfile;
  }

  public getUserProfile(): UserProfile {
    return { ...this.userProfile };
  }

  public updateUserProfile(updates: Partial<UserProfile>): UserProfile {
    this.userProfile = {
      ...this.userProfile,
      ...updates
    };
    this.saveUserProfile(this.userProfile);
    return this.getUserProfile();
  }

  private saveUserProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(profile));
    } catch {
      // Storage failure
    }
  }

  // --- Session Lifecycle ---
  private restoreActiveSession(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION);
      if (stored) {
        const session: GameSession = JSON.parse(stored);
        if (session.status === 'in-progress') {
          this.activeSession = session;
        }
      }
    } catch {
      this.activeSession = null;
    }
  }

  private persistActiveSession(): void {
    try {
      if (this.activeSession) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, JSON.stringify(this.activeSession));
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
      }
    } catch {
      // Ignore
    }
  }

  public getActiveSession(): GameSession | null {
    return this.activeSession;
  }

  /**
   * Start a new Game Session
   */
  public startSession(options: {
    mode: GameMode;
    totalRounds?: number;
    categoryFilter?: { type: 'genre' | 'decade' | 'language'; value: string };
    selectedLanguages?: string[];
    dateString?: string;
  }): GameSession {
    const { mode, categoryFilter, selectedLanguages, dateString } = options;
    const totalRounds = options.totalRounds || (mode === 'daily' ? DAILY_CHALLENGE_ROUNDS : DEFAULT_ROUNDS_PER_GAME);

    let eligibleTracks: Track[];

    if (mode === 'daily') {
      const dateKey = dateString || new Date().toISOString().split('T')[0];
      eligibleTracks = this.getDailyChallengeTracks(dateKey, totalRounds);
    } else if (selectedLanguages && selectedLanguages.length > 0) {
      eligibleTracks = musicCatalogue.getPlayableTracksByLanguages(selectedLanguages);
    } else if (mode === 'category' && categoryFilter) {
      const filtered = musicCatalogue.getTracksByFilter({
        genre: categoryFilter.type === 'genre' ? categoryFilter.value : undefined,
        decade: categoryFilter.type === 'decade' ? categoryFilter.value : undefined,
        language: categoryFilter.type === 'language' ? categoryFilter.value : undefined
      });
      eligibleTracks = filtered.filter(t => t.playbackStatus === 'verified_audio' && t.availabilityStatus === 'available');
    } else {
      eligibleTracks = musicCatalogue.getAvailableTracks();
    }

    // If no eligible playable tracks exist for this filter, do not inject fake or unrelated songs
    if (eligibleTracks.length === 0) {
      const emptySession: GameSession = {
        sessionId: `ses_${Date.now()}`,
        userId: this.userProfile.id,
        mode,
        rounds: [],
        currentRoundIndex: 0,
        totalScore: 0,
        status: 'completed',
        startedAt: Date.now(),
        categoryFilter
      };
      this.activeSession = emptySession;
      this.persistActiveSession();
      return emptySession;
    }

    // Shuffle and pick unique tracks
    const shuffled = this.shuffleArray([...eligibleTracks]);
    const numRounds = Math.min(totalRounds, shuffled.length);
    const selectedTracks = mode === 'daily'
      ? eligibleTracks.slice(0, numRounds)
      : shuffled.slice(0, numRounds);

    const rounds: GameRound[] = selectedTracks.map((track, index) => ({
      id: `rnd_${Date.now()}_${index}`,
      roundNumber: index + 1,
      targetTrackId: track.id,
      currentLevel: 1,
      status: 'playing',
      pointsAwarded: 0,
      guesses: [],
      startedAt: Date.now()
    }));

    const session: GameSession = {
      sessionId: `ses_${Date.now()}`,
      userId: this.userProfile.id,
      mode,
      rounds,
      currentRoundIndex: 0,
      totalScore: 0,
      status: 'in-progress',
      startedAt: Date.now(),
      categoryFilter,
      selectedLanguages
    };

    this.activeSession = session;
    this.persistActiveSession();
    return session;
  }

  /**
   * Get target track for current round safely.
   * If round is 'playing', client gets track without revealing identity (for audio preset synthesis).
   * If round is completed ('won' or 'lost'), full metadata is revealed.
   */
  public getCurrentTargetTrack(round: GameRound): Track | undefined {
    return musicCatalogue.getTrackById(round.targetTrackId);
  }

  /**
   * Submit an authoritative guess for the current round
   */
  public submitGuess(guessTrackId: string): {
    isCorrect: boolean;
    pointsAwarded: number;
    roundCompleted: boolean;
    nextLevel?: GameLevelNumber;
    round: GameRound;
    session: GameSession;
  } {
    if (!this.activeSession || this.activeSession.status !== 'in-progress') {
      throw new Error('No active game session found.');
    }

    const currentRound = this.activeSession.rounds[this.activeSession.currentRoundIndex];
    if (!currentRound || currentRound.status !== 'playing') {
      throw new Error('Current round is already completed or invalid.');
    }

    const currentLevel = currentRound.currentLevel;

    // Verify user has not already guessed at this level
    const existingGuess = currentRound.guesses.find(g => g.level === currentLevel);
    if (existingGuess) {
      throw new Error(`A guess for Level ${currentLevel} has already been submitted.`);
    }

    const selectedTrack = musicCatalogue.getTrackById(guessTrackId);
    if (!selectedTrack) {
      throw new Error('Selected track was not found in catalogue.');
    }

    const isCorrect = guessTrackId === currentRound.targetTrackId;
    let pointsAwarded = 0;
    let roundCompleted = false;
    let nextLevel: GameLevelNumber | undefined;

    const guessRecord: GuessRecord = {
      level: currentLevel,
      selectedTrackId: guessTrackId,
      selectedTrackTitle: selectedTrack.title,
      selectedTrackArtist: selectedTrack.artist,
      isCorrect,
      pointsAwarded: 0,
      timestamp: Date.now()
    };

    if (isCorrect) {
      // Award base points for this level
      pointsAwarded = GAME_LEVELS[currentLevel].points;
      guessRecord.pointsAwarded = pointsAwarded;
      currentRound.pointsAwarded = pointsAwarded;
      currentRound.status = 'won';
      currentRound.completedAt = Date.now();
      currentRound.targetTrack = musicCatalogue.getTrackById(currentRound.targetTrackId);
      roundCompleted = true;

      // Update session total
      this.activeSession.totalScore += pointsAwarded;
    } else {
      // Incorrect answer
      if (currentLevel < 4) {
        nextLevel = (currentLevel + 1) as GameLevelNumber;
        currentRound.currentLevel = nextLevel;
      } else {
        // Level 4 incorrect: round is lost, 0 points, reveal target track
        currentRound.status = 'lost';
        currentRound.pointsAwarded = 0;
        currentRound.completedAt = Date.now();
        currentRound.targetTrack = musicCatalogue.getTrackById(currentRound.targetTrackId);
        roundCompleted = true;
      }
    }

    currentRound.guesses.push(guessRecord);

    // If round completed, check if session is done
    if (roundCompleted) {
      if (this.activeSession.currentRoundIndex >= this.activeSession.rounds.length - 1) {
        this.activeSession.status = 'completed';
        this.activeSession.completedAt = Date.now();
        this.onSessionCompleted(this.activeSession);
      }
    }

    this.persistActiveSession();

    return {
      isCorrect,
      pointsAwarded,
      roundCompleted,
      nextLevel,
      round: currentRound,
      session: this.activeSession
    };
  }

  /**
   * Skip current level without guessing.
   * Forfeits the current level's points, unlocking the next level with longer audio,
   * or ending the round with 0 points if skipped at Level 4.
   */
  public skipCurrentLevel(): {
    roundCompleted: boolean;
    nextLevel?: GameLevelNumber;
    round: GameRound;
    session: GameSession;
  } {
    if (!this.activeSession || this.activeSession.status !== 'in-progress') {
      throw new Error('No active game session found.');
    }

    const currentRound = this.activeSession.rounds[this.activeSession.currentRoundIndex];
    if (!currentRound || currentRound.status !== 'playing') {
      throw new Error('Current round is already completed or invalid.');
    }

    const currentLevel = currentRound.currentLevel;

    const skipRecord: GuessRecord = {
      level: currentLevel,
      selectedTrackId: 'skipped_level',
      selectedTrackTitle: `Skipped Level ${currentLevel}`,
      selectedTrackArtist: '—',
      isCorrect: false,
      pointsAwarded: 0,
      timestamp: Date.now()
    };

    let nextLevel: GameLevelNumber | undefined;
    let roundCompleted = false;

    if (currentLevel < 4) {
      nextLevel = (currentLevel + 1) as GameLevelNumber;
      currentRound.currentLevel = nextLevel;
    } else {
      // Skipped final level: round is lost, 0 points, reveal target track
      currentRound.status = 'lost';
      currentRound.pointsAwarded = 0;
      currentRound.completedAt = Date.now();
      currentRound.targetTrack = musicCatalogue.getTrackById(currentRound.targetTrackId);
      roundCompleted = true;
    }

    currentRound.guesses.push(skipRecord);

    if (roundCompleted) {
      if (this.activeSession.currentRoundIndex >= this.activeSession.rounds.length - 1) {
        this.activeSession.status = 'completed';
        this.activeSession.completedAt = Date.now();
        this.onSessionCompleted(this.activeSession);
      }
    }

    this.persistActiveSession();

    return {
      roundCompleted,
      nextLevel,
      round: currentRound,
      session: this.activeSession
    };
  }

  /**
   * Skip the entire round immediately.
   * Deducts/awards 0 points for this round, reveals the target track, and concludes the round.
   */
  public skipRound(): {
    round: GameRound;
    session: GameSession;
  } {
    if (!this.activeSession || this.activeSession.status !== 'in-progress') {
      throw new Error('No active game session found.');
    }

    const currentRound = this.activeSession.rounds[this.activeSession.currentRoundIndex];
    if (!currentRound || currentRound.status !== 'playing') {
      throw new Error('Current round is already completed or invalid.');
    }

    const skipRecord: GuessRecord = {
      level: currentRound.currentLevel,
      selectedTrackId: 'skipped_round',
      selectedTrackTitle: 'Skipped Round (0 pts)',
      selectedTrackArtist: '—',
      isCorrect: false,
      pointsAwarded: 0,
      timestamp: Date.now()
    };

    currentRound.guesses.push(skipRecord);
    currentRound.status = 'lost';
    currentRound.pointsAwarded = 0;
    currentRound.completedAt = Date.now();
    currentRound.targetTrack = musicCatalogue.getTrackById(currentRound.targetTrackId);

    if (this.activeSession.currentRoundIndex >= this.activeSession.rounds.length - 1) {
      this.activeSession.status = 'completed';
      this.activeSession.completedAt = Date.now();
      this.onSessionCompleted(this.activeSession);
    }

    this.persistActiveSession();

    return {
      round: currentRound,
      session: this.activeSession
    };
  }

  /**
   * Advance to the next round in active session
   */
  public advanceToNextRound(): GameRound | null {
    if (!this.activeSession || this.activeSession.status !== 'in-progress') return null;

    const currentRound = this.activeSession.rounds[this.activeSession.currentRoundIndex];
    if (currentRound && currentRound.status === 'playing') {
      throw new Error('Cannot advance: Current round is still active.');
    }

    if (this.activeSession.currentRoundIndex < this.activeSession.rounds.length - 1) {
      this.activeSession.currentRoundIndex += 1;
      this.persistActiveSession();
      return this.activeSession.rounds[this.activeSession.currentRoundIndex];
    } else {
      this.activeSession.status = 'completed';
      this.activeSession.completedAt = Date.now();
      this.onSessionCompleted(this.activeSession);
      this.persistActiveSession();
      return null;
    }
  }

  /**
   * End or abandon active game session
   */
  public abandonActiveSession(): void {
    this.activeSession = null;
    this.persistActiveSession();
  }

  // --- Statistics and Achievements on Completion ---
  private onSessionCompleted(session: GameSession): void {
    const roundsWon = session.rounds.filter(r => r.status === 'won').length;
    const totalRounds = session.rounds.length;
    const sessionScore = session.totalScore;

    this.userProfile.gamesPlayed += 1;
    this.userProfile.roundsPlayed += totalRounds;
    this.userProfile.roundsWon += roundsWon;
    this.userProfile.totalScore += sessionScore;
    this.userProfile.accuracy = Math.round((this.userProfile.roundsWon / this.userProfile.roundsPlayed) * 100);

    if (sessionScore > this.userProfile.bestScore) {
      this.userProfile.bestScore = sessionScore;
    }

    if (roundsWon === totalRounds) {
      this.userProfile.currentStreak += 1;
      if (this.userProfile.currentStreak > this.userProfile.bestStreak) {
        this.userProfile.bestStreak = this.userProfile.currentStreak;
      }
    } else {
      this.userProfile.currentStreak = 0;
    }

    // Genre count updates
    session.rounds.forEach(r => {
      const track = musicCatalogue.getTrackById(r.targetTrackId);
      if (track && r.status === 'won') {
        this.userProfile.favoriteGenres[track.genre] = (this.userProfile.favoriteGenres[track.genre] || 0) + 1;
      }
    });

    // Check achievement unlocks
    this.checkAchievementUnlocks(session);

    this.userProfile.lastPlayedAt = Date.now();
    this.saveUserProfile(this.userProfile);

    // Save completed game log
    try {
      const historyStr = localStorage.getItem(STORAGE_KEY_COMPLETED_GAMES) || '[]';
      const history: GameSession[] = JSON.parse(historyStr);
      history.unshift(session);
      localStorage.setItem(STORAGE_KEY_COMPLETED_GAMES, JSON.stringify(history.slice(0, 30)));
    } catch {
      // Storage error
    }

    // Mark daily challenge attempt if applicable
    if (session.mode === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      try {
        const attemptsStr = localStorage.getItem(STORAGE_KEY_DAILY_ATTEMPTS) || '{}';
        const attempts = JSON.parse(attemptsStr);
        attempts[today] = {
          score: sessionScore,
          roundsWon,
          completedAt: Date.now()
        };
        localStorage.setItem(STORAGE_KEY_DAILY_ATTEMPTS, JSON.stringify(attempts));
      } catch {
        // Storage error
      }
    }
  }

  private checkAchievementUnlocks(session: GameSession): void {
    const unlocked = new Set(this.userProfile.unlockedAchievements);

    // 0. First win
    if (this.userProfile.roundsWon >= 1) {
      unlocked.add('first_win');
    }

    // 1. One second wonder: Won at level 1
    const wonAtLevel1 = session.rounds.some(r => r.status === 'won' && r.guesses.some(g => g.level === 1 && g.isCorrect));
    if (wonAtLevel1) unlocked.add('one_second_wonder');

    // 2. Perfect round: All won
    if (session.rounds.length >= 5 && session.rounds.every(r => r.status === 'won')) {
      unlocked.add('perfect_round');
    }

    // 3. Streak master: streak >= 3
    if (this.userProfile.currentStreak >= 3 || this.userProfile.bestStreak >= 3) {
      unlocked.add('streak_master');
    }

    // 4. 10-Day Streak: streak >= 10
    if (this.userProfile.currentStreak >= 10 || this.userProfile.bestStreak >= 10) {
      unlocked.add('ten_day_streak');
    }

    // 5. Genre Master: at least 5 distinct genres correctly guessed
    if (Object.keys(this.userProfile.favoriteGenres).length >= 5) {
      unlocked.add('genre_master');
    }

    // 6. Globe Trotter: check languages across won rounds
    const wonLanguages = new Set<string>();
    const wonDecades = new Set<string>();
    session.rounds.forEach(r => {
      if (r.status === 'won') {
        const track = musicCatalogue.getTrackById(r.targetTrackId);
        if (track) {
          wonLanguages.add(track.language);
          wonDecades.add(track.decade);
        }
      }
    });

    if (wonLanguages.size >= 3) {
      unlocked.add('globe_trotter');
    }

    if (wonDecades.size >= 3) {
      unlocked.add('decade_hopper');
    }

    // 7. Clutch save: Won at Level 4
    const wonAtLevel4 = session.rounds.some(r => r.status === 'won' && r.guesses.some(g => g.level === 4 && g.isCorrect));
    if (wonAtLevel4) unlocked.add('clutch_save');

    // 8. Daily devotee
    if (session.mode === 'daily') {
      unlocked.add('daily_devotee');
    }

    // 9. Multiplayer champion
    if (session.mode === 'multiplayer') {
      unlocked.add('multiplayer_champion');
    }

    this.userProfile.unlockedAchievements = Array.from(unlocked);
  }

  public getCompletedGames(): GameSession[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COMPLETED_GAMES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public getDailyChallengeStatus(dateKey?: string): { completed: boolean; score?: number; roundsWon?: number } {
    const key = dateKey || new Date().toISOString().split('T')[0];
    try {
      const attemptsStr = localStorage.getItem(STORAGE_KEY_DAILY_ATTEMPTS) || '{}';
      const attempts = JSON.parse(attemptsStr);
      if (attempts[key]) {
        return { completed: true, ...attempts[key] };
      }
    } catch {
      // Ignore
    }
    return { completed: false };
  }

  /**
   * Deterministic Daily Challenge track selection based on date string
   * Ensures identical challenge across all players worldwide for that calendar day
   */
  public getDailyChallengeTracks(dateString: string, count: number = DAILY_CHALLENGE_ROUNDS): Track[] {
    const all = musicCatalogue.getAvailableTracks();
    if (all.length <= count) return all;

    // Hash seed from dateString (e.g. "2026-10-19")
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      hash = (hash << 5) - hash + dateString.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash);

    // Pseudorandom deterministic shuffle
    const pool = [...all];
    const result: Track[] = [];

    for (let i = 0; i < count; i++) {
      const index = (seed + i * 37) % pool.length;
      result.push(pool[index]);
      pool.splice(index, 1);
    }

    return result;
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Reset / Delete user account and profile data (GDPR / DPDP Compliance)
   */
  public clearAllUserData(): void {
    localStorage.removeItem(STORAGE_KEY_USER_PROFILE);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
    localStorage.removeItem(STORAGE_KEY_COMPLETED_GAMES);
    localStorage.removeItem(STORAGE_KEY_DAILY_ATTEMPTS);
    this.userProfile = this.loadOrCreateUserProfile();
    this.activeSession = null;
  }
}

export const gameEngine = new GameEngineService();
