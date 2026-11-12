/**
 * SongVerse Ranked 1v1 Blitz & Matchmaking Engine
 * Manages competitive Elo ratings, tier brackets, and instant 1v1 duels.
 */

import { gameEngine } from './gameEngine';
import { soundEffectsService } from './soundEffectsService';

export type BlitzTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Maestro';

export function getRankTier(elo: number): BlitzTier {
  if (elo >= 1700) return 'Maestro';
  if (elo >= 1500) return 'Platinum';
  if (elo >= 1300) return 'Gold';
  if (elo >= 1100) return 'Silver';
  return 'Bronze';
}

export function calculateEloDelta(playerElo: number, opponentElo: number, won: boolean, streak: number = 0): { delta: number; newRating: number } {
  if (won) {
    const streakBonus = Math.min(10, streak * 2);
    const delta = 28 + streakBonus;
    return { delta, newRating: playerElo + delta };
  } else {
    const delta = -18;
    return { delta, newRating: Math.max(500, playerElo + delta) };
  }
}

export interface BlitzRankInfo {
  tier: BlitzTier;
  elo: number;
  badge: string;
  color: string;
  minElo: number;
  nextTierMinElo?: number;
}

export interface BlitzOpponent {
  id: string;
  displayName: string;
  username: string;
  avatarSeed: string;
  elo: number;
  tier: BlitzTier;
  isBot?: boolean;
}

export interface BlitzMatchState {
  matchId: string;
  playerScore: number;
  opponentScore: number;
  currentRound: number;
  totalRounds: number;
  isCompleted: boolean;
  winnerId: string | null;
  eloChange: number;
  opponent: BlitzOpponent;
}

const STORAGE_KEY_BLITZ_STATS = 'songverse_blitz_stats_v1';

const BOT_OPPONENTS: Omit<BlitzOpponent, 'elo' | 'tier'>[] = [
  { id: 'bot_maestro_leo', displayName: 'Leo Bass', username: 'beatmaster_leo', avatarSeed: 'leo' },
  { id: 'bot_luna_melody', displayName: 'Luna Harmony', username: 'melody_luna', avatarSeed: 'luna' },
  { id: 'bot_axel_groove', displayName: 'Axel Sonic', username: 'axel_groove', avatarSeed: 'axel' },
  { id: 'bot_maya_beats', displayName: 'Maya Rhythm', username: 'maya_beats', avatarSeed: 'maya' }
];

class RankedBlitzService {
  private elo: number = 1000;
  private wins: number = 0;
  private losses: number = 0;
  private currentStreak: number = 0;
  private activeMatch: BlitzMatchState | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadStats();
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  private loadStats(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BLITZ_STATS);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.elo = parsed.elo || 1000;
        this.wins = parsed.wins || 0;
        this.losses = parsed.losses || 0;
        this.currentStreak = parsed.currentStreak || 0;
      }
    } catch {}
  }

  private saveStats(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        STORAGE_KEY_BLITZ_STATS,
        JSON.stringify({
          elo: this.elo,
          wins: this.wins,
          losses: this.losses,
          currentStreak: this.currentStreak
        })
      );
    } catch {}
  }

  public getElo(): number {
    return this.elo;
  }

  public getStats() {
    const tierInfo = this.getTierInfo();
    return {
      elo: this.elo,
      rating: this.elo,
      tier: tierInfo.tier,
      tierInfo,
      wins: this.wins,
      losses: this.losses,
      currentStreak: this.currentStreak,
      streak: this.currentStreak
    };
  }

  public getTierInfo(customElo?: number): BlitzRankInfo {
    const score = customElo ?? this.elo;
    if (score >= 1700) {
      return {
        tier: 'Maestro',
        elo: score,
        badge: '👑',
        color: 'from-amber-400 via-sv-gold to-yellow-500',
        minElo: 1700
      };
    }
    if (score >= 1500) {
      return {
        tier: 'Platinum',
        elo: score,
        badge: '💎',
        color: 'from-cyan-400 via-sky-500 to-indigo-600',
        minElo: 1500,
        nextTierMinElo: 1700
      };
    }
    if (score >= 1300) {
      return {
        tier: 'Gold',
        elo: score,
        badge: '🥇',
        color: 'from-amber-500 via-yellow-500 to-amber-600',
        minElo: 1300,
        nextTierMinElo: 1500
      };
    }
    if (score >= 1100) {
      return {
        tier: 'Silver',
        elo: score,
        badge: '🥈',
        color: 'from-slate-300 via-zinc-400 to-slate-500',
        minElo: 1100,
        nextTierMinElo: 1300
      };
    }
    return {
      tier: 'Bronze',
      elo: score,
      badge: '🥉',
      color: 'from-amber-700 via-orange-800 to-amber-900',
      minElo: 0,
      nextTierMinElo: 1100
    };
  }

  /**
   * Matchmaking: Matches with an online player or nearby challenger
   */
  public async findMatch(onStatusUpdate?: (status: string) => void): Promise<BlitzMatchState> {
    onStatusUpdate?.('Searching for opponent in your Elo bracket...');
    await new Promise(r => setTimeout(r, 1200));

    onStatusUpdate?.('Found challenger! Synchronizing live audio feed...');
    await new Promise(r => setTimeout(r, 800));

    // Pick dynamic challenger near user's Elo
    const botTemplate = BOT_OPPONENTS[Math.floor(Math.random() * BOT_OPPONENTS.length)];
    const eloOffset = Math.floor((Math.random() - 0.5) * 60);
    const opponentElo = Math.max(800, this.elo + eloOffset);

    const opponent: BlitzOpponent = {
      ...botTemplate,
      elo: opponentElo,
      tier: this.getTierInfo(opponentElo).tier,
      isBot: true
    };

    const match: BlitzMatchState = {
      matchId: `blitz_${Date.now()}`,
      playerScore: 0,
      opponentScore: 0,
      currentRound: 1,
      totalRounds: 3,
      isCompleted: false,
      winnerId: null,
      eloChange: 0,
      opponent
    };

    this.activeMatch = match;
    this.notify();
    return match;
  }

  public getActiveMatch(): BlitzMatchState | null {
    return this.activeMatch;
  }

  /**
   * Submit round points for player & simulate opponent guess
   */
  public recordRound(playerPointsAwarded: number): BlitzMatchState {
    if (!this.activeMatch) throw new Error('No active blitz match');

    this.activeMatch.playerScore += playerPointsAwarded;

    // Simulate opponent guess (skilled based on opponent Elo)
    const opponentChance = Math.min(0.85, 0.5 + (this.activeMatch.opponent.elo / 2500));
    const opponentGuessedCorrect = Math.random() < opponentChance;
    const opponentPoints = opponentGuessedCorrect
      ? (Math.random() > 0.4 ? 100 : 70)
      : 0;

    this.activeMatch.opponentScore += opponentPoints;

    if (this.activeMatch.currentRound < this.activeMatch.totalRounds) {
      this.activeMatch.currentRound += 1;
    } else {
      // Finalize Match
      this.activeMatch.isCompleted = true;
      const isWinner = this.activeMatch.playerScore > this.activeMatch.opponentScore;
      const isTie = this.activeMatch.playerScore === this.activeMatch.opponentScore;

      let deltaElo = 0;
      if (isWinner) {
        this.wins += 1;
        this.currentStreak += 1;
        const streakBonus = Math.min(10, this.currentStreak * 2);
        deltaElo = 28 + streakBonus;
        this.elo += deltaElo;
        soundEffectsService.playGameVictoryFanfare();
      } else if (isTie) {
        deltaElo = 5;
        this.elo += deltaElo;
      } else {
        this.losses += 1;
        this.currentStreak = 0;
        deltaElo = -18;
        this.elo = Math.max(500, this.elo + deltaElo);
      }

      this.activeMatch.eloChange = deltaElo;
      this.activeMatch.winnerId = isWinner
        ? 'player'
        : isTie
        ? 'tie'
        : this.activeMatch.opponent.id;

      this.saveStats();
    }

    this.notify();
    return { ...this.activeMatch };
  }

  public clearMatch(): void {
    this.activeMatch = null;
    this.notify();
  }
}

export const rankedBlitzService = new RankedBlitzService();
