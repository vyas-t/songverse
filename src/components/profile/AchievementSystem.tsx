import React, { useState } from 'react';
import {
  Trophy,
  Flame,
  Award,
  Zap,
  Globe,
  Clock,
  Search,
  Calendar,
  Users,
  CheckCircle2,
  Lock,
  Sparkles,
  Compass,
  Star,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Achievement, UserProfile } from '../../types';
import { ACHIEVEMENTS_LIST } from '../../config/gameConfig';

interface AchievementSystemProps {
  userProfile: UserProfile;
}

export const AchievementSystem: React.FC<AchievementSystemProps> = ({ userProfile }) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'unlocked' | 'in-progress' | 'locked'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Calculate dynamic milestone progress for each achievement
  const getProgressForAchievement = (ach: Achievement): { current: number; target: number; percent: number; isUnlocked: boolean } => {
    const isUnlocked = userProfile.unlockedAchievements.includes(ach.id);
    let current = 0;
    const target = ach.targetValue || 1;

    switch (ach.id) {
      case 'first_win':
        current = userProfile.roundsWon > 0 ? 1 : 0;
        break;
      case 'ten_day_streak':
        current = Math.min(10, Math.max(userProfile.currentStreak, userProfile.bestStreak));
        break;
      case 'genre_master':
        current = Math.min(5, Object.keys(userProfile.favoriteGenres || {}).length);
        break;
      case 'streak_master':
        current = Math.min(3, Math.max(userProfile.currentStreak, userProfile.bestStreak));
        break;
      case 'perfect_round':
        current = isUnlocked ? 5 : (userProfile.accuracy === 100 && userProfile.roundsWon >= 5 ? 5 : Math.min(4, userProfile.roundsWon));
        break;
      case 'globe_trotter':
        current = isUnlocked ? 3 : Math.min(3, Object.keys(userProfile.favoriteGenres || {}).length);
        break;
      case 'decade_hopper':
        current = isUnlocked ? 3 : (userProfile.gamesPlayed > 0 ? Math.min(3, userProfile.gamesPlayed) : 0);
        break;
      case 'one_second_wonder':
      case 'clutch_save':
      case 'daily_devotee':
      case 'multiplayer_champion':
      default:
        current = isUnlocked ? 1 : 0;
        break;
    }

    if (isUnlocked) {
      current = target;
    }

    const percent = Math.min(100, Math.round((current / target) * 100));
    return { current, target, percent, isUnlocked };
  };

  const enrichedAchievements = ACHIEVEMENTS_LIST.map(ach => {
    const progress = getProgressForAchievement(ach);
    return {
      ...ach,
      ...progress
    };
  });

  // Calculate total AP
  const totalPossibleAP = enrichedAchievements.reduce((sum, a) => sum + a.points, 0);
  const earnedAP = enrichedAchievements
    .filter(a => a.isUnlocked)
    .reduce((sum, a) => sum + a.points, 0);
  const totalUnlockedCount = enrichedAchievements.filter(a => a.isUnlocked).length;
  const overallPercent = Math.round((totalUnlockedCount / ACHIEVEMENTS_LIST.length) * 100);

  // Filter list
  const filteredAchievements = enrichedAchievements.filter(ach => {
    if (filterStatus === 'unlocked' && !ach.isUnlocked) return false;
    if (filterStatus === 'locked' && (ach.isUnlocked || ach.percent > 0)) return false;
    if (filterStatus === 'in-progress' && (ach.isUnlocked || ach.percent === 0)) return false;
    if (selectedCategory !== 'all' && ach.category !== selectedCategory) return false;
    return true;
  });

  const renderIcon = (name: string) => {
    switch (name) {
      case 'Sparkles': return <Sparkles className="w-5 h-5" />;
      case 'Zap': return <Zap className="w-5 h-5" />;
      case 'Award': return <Award className="w-5 h-5" />;
      case 'Flame': return <Flame className="w-5 h-5" />;
      case 'Globe': return <Globe className="w-5 h-5" />;
      case 'Clock': return <Clock className="w-5 h-5" />;
      case 'Search': return <Search className="w-5 h-5" />;
      case 'Calendar': return <Calendar className="w-5 h-5" />;
      case 'Compass': return <Compass className="w-5 h-5" />;
      case 'Users': return <Users className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  const getTierColor = (tier: Achievement['tier']) => {
    switch (tier) {
      case 'Platinum':
        return 'text-cyan-700 bg-cyan-50 border-cyan-200';
      case 'Gold':
        return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'Silver':
        return 'text-slate-700 bg-slate-100 border-slate-200';
      case 'Bronze':
      default:
        return 'text-orange-800 bg-orange-50 border-orange-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Achievement Hub Overview Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        
        {/* Decorative soft glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          
          <div className="md:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-indigo-300">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>SongVerse Milestone & Recognition Engine</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Trophy Hall & Milestones
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Track your journey from your <strong>First Win</strong> to a legendary <strong>10-Day Streak</strong> and becoming a certified <strong>Genre Master</strong> across international music vaults.
            </p>

            {/* Overall Progress Bar */}
            <div className="space-y-1.5 pt-2 max-w-lg">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">
                  Unlocked: {totalUnlockedCount} of {ACHIEVEMENTS_LIST.length} Milestones ({overallPercent}%)
                </span>
                <span className="text-amber-400 font-mono">
                  {earnedAP} / {totalPossibleAP} AP
                </span>
              </div>
              <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge Strip */}
          <div className="md:col-span-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 grid grid-cols-2 gap-3 text-center">
            <div className="p-2">
              <div className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums">
                {earnedAP}
              </div>
              <div className="text-[11px] text-slate-300">Earned Points</div>
            </div>
            <div className="p-2">
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300 tabular-nums">
                {totalUnlockedCount}
              </div>
              <div className="text-[11px] text-slate-300">Badges Won</div>
            </div>
          </div>

        </div>

      </div>

      {/* Interactive Filter Strip */}
      <div className="bg-white dark:bg-sv-burgundy-deep border border-slate-200/90 dark:border-sv-burgundy rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-sv-navy rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-white dark:bg-sv-burgundy text-sv-red dark:text-sv-gold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({ACHIEVEMENTS_LIST.length})
          </button>
          <button
            onClick={() => setFilterStatus('unlocked')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'unlocked'
                ? 'bg-white dark:bg-sv-burgundy text-sv-red dark:text-sv-gold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Unlocked ({totalUnlockedCount})
          </button>
          <button
            onClick={() => setFilterStatus('in-progress')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'in-progress'
                ? 'bg-white dark:bg-sv-burgundy text-sv-red dark:text-sv-gold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            In Progress ({enrichedAchievements.filter(a => !a.isUnlocked && a.percent > 0).length})
          </button>
          <button
            onClick={() => setFilterStatus('locked')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'locked'
                ? 'bg-white dark:bg-sv-burgundy text-sv-red dark:text-sv-gold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Locked ({enrichedAchievements.filter(a => !a.isUnlocked && a.percent === 0).length})
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 dark:bg-sv-navy border border-slate-200 dark:border-sv-burgundy rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-sv-red cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="milestone">Core Milestones</option>
            <option value="streak">Streak & Dedication</option>
            <option value="discovery">World Discovery</option>
            <option value="speed">Speed & Accuracy</option>
          </select>
        </div>

      </div>

      {/* Achievement Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((ach) => {
          const isHighlightedMilestone = ach.id === 'first_win' || ach.id === 'ten_day_streak' || ach.id === 'genre_master';

          return (
            <div
              key={ach.id}
              className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                ach.isUnlocked
                  ? 'bg-white dark:bg-sv-burgundy-deep border-indigo-200/90 dark:border-sv-burgundy shadow-sm shadow-indigo-950/5'
                  : 'bg-slate-50/80 dark:bg-sv-navy/60 border-slate-200/90 dark:border-sv-burgundy/60 opacity-85'
              } ${isHighlightedMilestone && !ach.isUnlocked ? 'ring-2 ring-sv-red/30' : ''}`}
            >
              
              <div className="space-y-3">
                
                {/* Header: Icon, Points, and Tier */}
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    ach.isUnlocked
                      ? 'bg-sv-red/10 dark:bg-sv-navy text-sv-red dark:text-sv-gold border border-sv-red/20 dark:border-sv-burgundy shadow-xs'
                      : 'bg-slate-200/70 dark:bg-sv-burgundy/40 text-slate-400 dark:text-slate-500'
                  }`}>
                    {renderIcon(ach.iconName)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getTierColor(ach.tier)} font-mono`}>
                      {ach.tier}
                    </span>
                    <span className="text-xs font-bold text-sv-red dark:text-sv-gold bg-sv-red/10 dark:bg-sv-navy border border-sv-red/20 dark:border-sv-burgundy px-2 py-0.5 rounded-md font-mono">
                      +{ach.points} AP
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {ach.title}
                    </h3>
                    {isHighlightedMilestone && (
                      <span className="text-[9px] font-bold text-sv-warm-orange bg-sv-warm-orange/10 dark:bg-sv-warm-orange/20 px-1.5 py-0.2 rounded uppercase">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed mt-1">
                    {ach.description}
                  </p>
                </div>

                {/* Progress Bar & Numerical Target */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">
                      Progress
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {ach.current} / {ach.target} ({ach.percent}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200/80 dark:bg-sv-navy h-2 rounded-full overflow-hidden border border-transparent dark:border-sv-burgundy/40">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        ach.isUnlocked
                          ? 'bg-emerald-500'
                          : ach.percent > 0
                          ? 'bg-sv-red dark:bg-sv-warm-orange'
                          : 'bg-transparent'
                      }`}
                      style={{ width: `${ach.percent}%` }}
                    />
                  </div>
                </div>

              </div>

              {/* Status Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-sv-burgundy/50 flex items-center justify-between text-xs">
                {ach.isUnlocked ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Unlocked & Claimed</span>
                  </span>
                ) : ach.percent > 0 ? (
                  <span className="text-indigo-600 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>In Progress ({ach.target - ach.current} remaining)</span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Locked</span>
                  </span>
                )}

                <span className="text-[11px] text-slate-400 capitalize">
                  {ach.category}
                </span>
              </div>

            </div>
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-400">
          <p className="text-sm font-semibold text-slate-700">No achievements in this view</p>
          <p className="text-xs text-slate-400 mt-1">Try switching to the &quot;All&quot; filter tab.</p>
        </div>
      )}

    </div>
  );
};
