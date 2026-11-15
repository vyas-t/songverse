// =========================================================================
// SPEEDRUN EVERYTHING — MASTER TYPES
// =========================================================================

export type SpeedrunMode =
  | 'random'
  | 'typing'
  | 'reaction'
  | 'memory'
  | 'brain_glitch'
  | 'wire_defuse'
  | 'math' // legacy alias mapping to brain_glitch
  | 'precision'
  | 'impossible'
  | 'daily'
  | 'endless';

export type ChallengeCategory =
  | 'typing'
  | 'reaction'
  | 'memory'
  | 'brain_glitch'
  | 'wire_defuse'
  | 'precision'
  | 'impossible'
  | 'math'
  | 'misc';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'insane' | 'impossible';

export interface BaseChallenge {
  id: string;
  title: string;
  description: string;
  instructions: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  timeLimitMs: number; // Max time allowed before failure
  parTimeMs: number; // Target speedrun par time for 3 stars / max points
  pointsBase: number;
}

// Challenge Types with specific payloads
export type ChallengeType =
  | 'target_click'
  | 'typing_sentence'
  | 'reaction_light'
  | 'brain_glitch'
  | 'wire_defuse'
  | 'qte_arrows'
  | 'math_equations'
  | 'emoji_sequence'
  | 'find_odd_emoji'
  | 'color_match'
  | 'simon_pattern'
  | 'dodge_cursor'
  | 'count_objects'
  | 'dont_click'
  | 'rapid_click'
  | 'sliding_target'
  | 'impossible_choice';

export interface ActiveChallenge extends BaseChallenge {
  type: ChallengeType;
  payload: any;
}

export interface SpeedrunResult {
  challengeId: string;
  challengeTitle: string;
  category: ChallengeCategory;
  mode: SpeedrunMode;
  success: boolean;
  timeElapsedMs: number;
  timeLimitMs: number;
  pointsEarned: number;
  comboMultiplier: number;
  accuracyPercent: number;
  rating: 'S+' | 'S' | 'A' | 'B' | 'C' | 'F';
  funnyMessage: string;
  timestamp: number;
}

export interface PlayerStats {
  totalRuns: number;
  successfulRuns: number;
  currentStreak: number;
  highestStreak: number;
  totalScore: number;
  totalXp: number;
  level: number;
  levelTitle: string;
  bestReactionMs: number | null;
  bestWpm: number | null;
  fastestRunMs: number | null;
  dailyStreak: number;
  lastDailyDate: string | null;
  unlockedAchievements: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  condition: (stats: PlayerStats, result?: SpeedrunResult) => boolean;
}

export interface LeaderboardRecord {
  id: string;
  rank: number;
  playerName: string;
  score: number;
  timeMs: number;
  mode: SpeedrunMode;
  date: string;
  rating: string;
  isCurrentPlayer?: boolean;
}
