import React, { useState } from 'react';
import { Calendar, Play, Trophy, Sparkles, CheckCircle2, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { gameEngine } from '../../services/gameEngine';
import { GameMode } from '../../types';

interface DailyChallengeViewProps {
  onStartDaily: () => void;
  onNavigateLeaderboard: () => void;
}

export const DailyChallengeView: React.FC<DailyChallengeViewProps> = ({
  onStartDaily,
  onNavigateLeaderboard
}) => {
  const today = new Date().toISOString().split('T')[0];
  const dailyStatus = gameEngine.getDailyChallengeStatus(today);
  const userProfile = gameEngine.getUserProfile();

  // Format date nicely
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in">
      
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-sv-red dark:text-sv-warm-orange bg-sv-red/10 dark:bg-sv-burgundy border border-sv-red/20 dark:border-sv-burgundy px-3.5 py-1.5 rounded-full">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formattedDate}</span>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Today’s Global Daily Challenge
        </h1>
        
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          5 songs selected from a single date-based seed. Every player worldwide gets the exact same tracks in the exact same sequence today.
        </p>
      </div>

      {/* Main Challenge Card */}
      <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200/90 dark:border-sv-burgundy rounded-3xl p-8 sm:p-10 shadow-sm mb-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-sv-red dark:text-sv-warm-orange font-mono">
                Challenge Ver. 2026.1 · 5 Tracks
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Official Daily Round
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Rules: 4 levels per track (1s, 3s, 5s, 10s). You have 1 official attempt per day that counts toward your global daily leaderboard rank.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs font-medium text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Synchronized worldwide at 00:00 UTC</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Deterministic date seed — zero answer leaks</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Streak multiplies your profile prestige</span>
              </div>
            </div>
          </div>

          {/* Action Box */}
          <div className="bg-slate-50/90 dark:bg-sv-midnight/80 border border-slate-200/80 dark:border-sv-burgundy rounded-3xl p-6 text-center space-y-4 shadow-xs">
            {dailyStatus.completed ? (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800 shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Challenge Completed!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    You scored <strong className="text-sv-red dark:text-sv-gold font-mono text-sm font-black">{dailyStatus.score} pts</strong> ({dailyStatus.roundsWon} / 5 correct).
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={onNavigateLeaderboard}
                    className="w-full py-3 text-xs font-black text-white bg-sv-red hover:bg-sv-crimson rounded-2xl transition-all cursor-pointer shadow-sm shadow-sv-red/25"
                  >
                    View Daily Leaderboard Rank
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sv-amber/20 to-sv-gold/30 text-sv-orange dark:text-sv-gold flex items-center justify-center mx-auto border border-sv-warm-orange/30 shadow-xs">
                  <Trophy className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Ready for Today’s Test?
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                    Current Streak: <strong className="text-sv-orange dark:text-sv-gold font-mono font-black">{userProfile.currentStreak}</strong> days
                  </p>
                </div>
                <button
                  onClick={onStartDaily}
                  className="w-full py-4 text-xs font-black text-white bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-amber hover:from-sv-crimson hover:to-sv-red active:scale-95 rounded-2xl transition-all cursor-pointer shadow-md shadow-sv-red/25 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Official Challenge</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
