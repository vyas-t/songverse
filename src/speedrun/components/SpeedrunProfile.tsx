import React from 'react';
import { User, Award, Flame, Zap, Target, Timer, Trophy, Check, Lock } from 'lucide-react';
import { speedrunEngine, ACHIEVEMENTS } from '../engine/speedrunEngine';

export const SpeedrunProfile: React.FC = () => {
  const stats = speedrunEngine.getStats();

  const xpCurrentLevel = stats.totalXp % 120;
  const xpNeeded = 120;
  const xpProgressPercent = Math.min(100, Math.floor((xpCurrentLevel / xpNeeded) * 100));
  const winRate = stats.totalRuns > 0 ? Math.floor((stats.successfulRuns / stats.totalRuns) * 100) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 select-none space-y-8">
      
      {/* -----------------------------------------------------------------
          PLAYER BANNER & IDENTITY CARD
          ----------------------------------------------------------------- */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-black/70 backdrop-blur-2xl border-2 border-purple-500/40 shadow-[0_0_50px_rgba(155,92,235,0.2)] flex flex-col sm:flex-row items-center sm:items-start gap-6">
        
        {/* Avatar / Level Crest */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white text-4xl shadow-[0_0_30px_rgba(245,158,66,0.5)] border-2 border-white/20">
            ⚡
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black font-mono text-xs shadow-md">
            Lv.{stats.level}
          </span>
        </div>

        {/* Identity & Level Progress */}
        <div className="flex-1 text-center sm:text-left space-y-3 w-full">
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-black text-white font-cinzel">
                Speedrunner #1
              </h2>
              <span className="px-3 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-200 text-xs font-mono font-bold">
                {stats.levelTitle}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Reflex Specialist · Competitive Speedrunning Division
            </p>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-slate-300">
              <span>Experience (XP)</span>
              <span>{xpCurrentLevel} / {xpNeeded} XP</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 transition-all duration-300"
                style={{ width: `${xpProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* -----------------------------------------------------------------
          CORE SPEEDRUN METRICS GRID
          ----------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-2xl bg-black/50 border border-purple-500/30 text-center">
          <p className="text-xs font-mono text-slate-400 uppercase">Fastest Reflex</p>
          <p className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-1">
            {stats.bestReactionMs ? `${stats.bestReactionMs}ms` : '--'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-black/50 border border-purple-500/30 text-center">
          <p className="text-xs font-mono text-slate-400 uppercase">Max Typing Speed</p>
          <p className="text-xl sm:text-2xl font-black text-cyan-300 font-mono mt-1">
            {stats.bestWpm ? `${stats.bestWpm} WPM` : '--'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-black/50 border border-purple-500/30 text-center">
          <p className="text-xs font-mono text-slate-400 uppercase">Highest Streak</p>
          <p className="text-xl sm:text-2xl font-black text-rose-400 font-mono flex items-center justify-center gap-1 mt-1">
            <Flame className="w-5 h-5 fill-current" />
            <span>{stats.highestStreak}x</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-black/50 border border-purple-500/30 text-center">
          <p className="text-xs font-mono text-slate-400 uppercase">Win Rate</p>
          <p className="text-xl sm:text-2xl font-black text-emerald-300 font-mono mt-1">
            {winRate}% ({stats.successfulRuns}/{stats.totalRuns})
          </p>
        </div>

      </div>

      {/* -----------------------------------------------------------------
          ACHIEVEMENTS & BADGES
          ----------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-cinzel text-xl font-black uppercase text-white tracking-wider flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>ACHIEVEMENTS & BADGES</span>
          </h3>
          <span className="text-xs font-mono text-amber-400 font-bold">
            {stats.unlockedAchievements.length} / {ACHIEVEMENTS.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = stats.unlockedAchievements.includes(ach.id);

            return (
              <div
                key={ach.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                  isUnlocked
                    ? 'bg-black/60 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,66,0.15)]'
                    : 'bg-black/40 border-white/5 opacity-50'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    isUnlocked
                      ? 'bg-amber-500/20 border border-amber-400/40 text-white'
                      : 'bg-white/5 border border-white/10 text-slate-500'
                  }`}
                >
                  {isUnlocked ? ach.icon : <Lock className="w-5 h-5 text-slate-500" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-white truncate">{ach.title}</h4>
                    {isUnlocked && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                    {ach.description}
                  </p>
                  <span className="text-[10px] font-mono text-amber-300 font-bold mt-1 inline-block">
                    +{ach.xpReward} XP
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
