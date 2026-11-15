// =========================================================================
// SPEEDRUN EVERYTHING — GAME ENGINE & STATS MANAGER
// =========================================================================

import { PlayerStats, SpeedrunResult, Achievement, LeaderboardRecord, SpeedrunMode } from '../types';
import { VICTORY_MESSAGES, FAILURE_MESSAGES } from '../challenges/challengeRegistry';

const STORAGE_KEY_STATS = 'speedrun_everything_stats_v1';
const STORAGE_KEY_LEADERBOARD = 'speedrun_everything_leaderboard_v1';

// Level title thresholds
const LEVEL_TITLES = [
  'Couch Potato',
  'Casual Clicker',
  'Reflex Rookie',
  'Keypad Ninja',
  'Speed Enthusiast',
  'Turbo Demon',
  'Overclocked Human',
  'Neural Link Master',
  'Sub-Second Legend',
  'Any% World Champion',
  'Speedrun Deity',
];

// All Achievements
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Complete your very first speedrun challenge.',
    icon: '⚡',
    category: 'General',
    xpReward: 50,
    condition: (stats) => stats.successfulRuns >= 1,
  },
  {
    id: 'hot_streak_5',
    title: 'Unstoppable Momentum',
    description: 'Achieve a winning streak of 5 challenges.',
    icon: '🔥',
    category: 'Streak',
    xpReward: 100,
    condition: (stats) => stats.highestStreak >= 5,
  },
  {
    id: 'reflex_god',
    title: 'Sub-250ms Reflex',
    description: 'React in under 250 milliseconds in the reaction challenge.',
    icon: '🎯',
    category: 'Reflex',
    xpReward: 150,
    condition: (stats) => stats.bestReactionMs !== null && stats.bestReactionMs <= 250,
  },
  {
    id: 'typing_demon',
    title: 'Keyboard Burner',
    description: 'Clock over 70 WPM in the typing speedrun.',
    icon: '⌨️',
    category: 'Typing',
    xpReward: 120,
    condition: (stats) => stats.bestWpm !== null && stats.bestWpm >= 70,
  },
  {
    id: 'daily_grinder',
    title: 'Daily Devotee',
    description: 'Complete an official Daily Speedrun challenge.',
    icon: '📅',
    category: 'Daily',
    xpReward: 100,
    condition: (stats) => stats.dailyStreak >= 1,
  },
  {
    id: 'centurion',
    title: 'Speedrun Centurion',
    description: 'Complete 25 total speedrun challenges.',
    icon: '👑',
    category: 'Endurance',
    xpReward: 250,
    condition: (stats) => stats.successfulRuns >= 25,
  },
];

class SpeedrunEngine {
  private stats: PlayerStats;
  private currentCombo: number = 0;
  private leaderboard: LeaderboardRecord[] = [];

  constructor() {
    this.stats = this.loadStats();
    this.leaderboard = this.loadLeaderboard();
  }

  private getDefaultStats(): PlayerStats {
    return {
      totalRuns: 0,
      successfulRuns: 0,
      currentStreak: 0,
      highestStreak: 0,
      totalScore: 0,
      totalXp: 0,
      level: 1,
      levelTitle: LEVEL_TITLES[0],
      bestReactionMs: null,
      bestWpm: null,
      fastestRunMs: null,
      dailyStreak: 0,
      lastDailyDate: null,
      unlockedAchievements: [],
    };
  }

  private loadStats(): PlayerStats {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATS);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...this.getDefaultStats(), ...parsed };
      }
    } catch {}
    return this.getDefaultStats();
  }

  private saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(this.stats));
    } catch {}
  }

  private loadLeaderboard(): LeaderboardRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}

    // Initial authentic default seed records
    return [
      { id: '1', rank: 1, playerName: 'Overclocked_Kai', score: 1420, timeMs: 1420, mode: 'random', date: 'Today', rating: 'S+' },
      { id: '2', rank: 2, playerName: 'Nova_Fingers', score: 1280, timeMs: 1650, mode: 'reaction', date: 'Today', rating: 'S' },
      { id: '3', rank: 3, playerName: 'Vyas_Speed', score: 1190, timeMs: 1820, mode: 'daily', date: 'Today', rating: 'S' },
      { id: '4', rank: 4, playerName: 'SubSecondSam', score: 1050, timeMs: 2100, mode: 'typing', date: 'Yesterday', rating: 'A' },
      { id: '5', rank: 5, playerName: 'GlitchMaster', score: 940, timeMs: 2450, mode: 'impossible', date: '2 days ago', rating: 'A' },
    ];
  }

  private saveLeaderboard() {
    try {
      localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(this.leaderboard));
    } catch {}
  }

  public getStats(): PlayerStats {
    return { ...this.stats };
  }

  public getCurrentCombo(): number {
    return this.currentCombo;
  }

  public getLeaderboard(): LeaderboardRecord[] {
    return [...this.leaderboard];
  }

  // Calculate rating based on speed and time limit
  public calculateRating(success: boolean, timeElapsedMs: number, parTimeMs: number): 'S+' | 'S' | 'A' | 'B' | 'C' | 'F' {
    if (!success) return 'F';
    const ratio = timeElapsedMs / parTimeMs;
    if (ratio <= 0.85) return 'S+';
    if (ratio <= 1.1) return 'S';
    if (ratio <= 1.4) return 'A';
    if (ratio <= 1.8) return 'B';
    return 'C';
  }

  // Record completed result
  public recordResult(resultData: {
    challengeId: string;
    challengeTitle: string;
    category: any;
    mode: SpeedrunMode;
    success: boolean;
    timeElapsedMs: number;
    timeLimitMs: number;
    pointsBase: number;
    parTimeMs: number;
    accuracyPercent?: number;
    wpm?: number;
    reactionMs?: number;
  }): SpeedrunResult {
    const { success, timeElapsedMs, timeLimitMs, pointsBase, parTimeMs } = resultData;

    this.stats.totalRuns++;

    let pointsEarned = 0;
    let comboMultiplier = 1.0;
    let rating: 'S+' | 'S' | 'A' | 'B' | 'C' | 'F' = 'F';
    let funnyMessage = '';

    if (success) {
      this.stats.successfulRuns++;
      this.currentCombo++;
      this.stats.currentStreak++;
      if (this.stats.currentStreak > this.stats.highestStreak) {
        this.stats.highestStreak = this.stats.currentStreak;
      }

      // Combo multiplier: up to 2.5x
      comboMultiplier = Math.min(2.5, 1.0 + (this.currentCombo - 1) * 0.2);

      // Speed bonus: faster than par gets bonus!
      const speedRatio = Math.max(0.2, (parTimeMs / Math.max(100, timeElapsedMs)));
      const speedBonus = Math.floor(pointsBase * Math.min(1.5, speedRatio));
      pointsEarned = Math.floor((pointsBase + speedBonus) * comboMultiplier);

      this.stats.totalScore += pointsEarned;
      this.stats.totalXp += Math.floor(pointsEarned * 0.8);

      rating = this.calculateRating(true, timeElapsedMs, parTimeMs);
      funnyMessage = VICTORY_MESSAGES[Math.floor(Math.random() * VICTORY_MESSAGES.length)];

      // Best reaction time
      if (resultData.reactionMs && (!this.stats.bestReactionMs || resultData.reactionMs < this.stats.bestReactionMs)) {
        this.stats.bestReactionMs = resultData.reactionMs;
      }

      // Best WPM
      if (resultData.wpm && (!this.stats.bestWpm || resultData.wpm > this.stats.bestWpm)) {
        this.stats.bestWpm = Math.floor(resultData.wpm);
      }

      // Fastest run overall
      if (!this.stats.fastestRunMs || timeElapsedMs < this.stats.fastestRunMs) {
        this.stats.fastestRunMs = timeElapsedMs;
      }

      // Daily streak
      if (resultData.mode === 'daily') {
        const today = new Date().toISOString().slice(0, 10);
        if (this.stats.lastDailyDate !== today) {
          this.stats.dailyStreak++;
          this.stats.lastDailyDate = today;
        }
      }

      // Level progression (100 XP per level)
      const newLevel = Math.max(1, Math.floor(this.stats.totalXp / 120) + 1);
      this.stats.level = newLevel;
      const titleIndex = Math.min(LEVEL_TITLES.length - 1, newLevel - 1);
      this.stats.levelTitle = LEVEL_TITLES[titleIndex];

      // Add to local leaderboard
      this.leaderboard.push({
        id: `rec_${Date.now()}`,
        rank: 0,
        playerName: 'You (Speedrunner)',
        score: pointsEarned,
        timeMs: timeElapsedMs,
        mode: resultData.mode,
        date: 'Just now',
        rating,
        isCurrentPlayer: true,
      });

      // Sort and rerank top 15
      this.leaderboard.sort((a, b) => b.score - a.score || a.timeMs - b.timeMs);
      this.leaderboard = this.leaderboard.slice(0, 15).map((item, idx) => ({ ...item, rank: idx + 1 }));
      this.saveLeaderboard();
    } else {
      // Fail resets combo & streak
      this.currentCombo = 0;
      this.stats.currentStreak = 0;
      rating = 'F';
      funnyMessage = FAILURE_MESSAGES[Math.floor(Math.random() * FAILURE_MESSAGES.length)];
    }

    // Check achievement unlocks
    ACHIEVEMENTS.forEach((ach) => {
      if (!this.stats.unlockedAchievements.includes(ach.id)) {
        if (ach.condition(this.stats)) {
          this.stats.unlockedAchievements.push(ach.id);
          this.stats.totalXp += ach.xpReward;
        }
      }
    });

    this.saveStats();

    return {
      challengeId: resultData.challengeId,
      challengeTitle: resultData.challengeTitle,
      category: resultData.category,
      mode: resultData.mode,
      success,
      timeElapsedMs,
      timeLimitMs,
      pointsEarned,
      comboMultiplier,
      accuracyPercent: resultData.accuracyPercent ?? (success ? 100 : 0),
      rating,
      funnyMessage,
      timestamp: Date.now(),
    };
  }

  public resetStreak() {
    this.currentCombo = 0;
    this.stats.currentStreak = 0;
    this.saveStats();
  }
}

export const speedrunEngine = new SpeedrunEngine();
