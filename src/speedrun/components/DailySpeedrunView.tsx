import React, { useState, useEffect } from 'react';
import { Calendar, Flame, Play, Trophy, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { speedrunEngine } from '../engine/speedrunEngine';
import { ChallengeGenerator } from '../challenges/challengeRegistry';
import { speedrunAudio } from '../audio';

interface DailySpeedrunViewProps {
  onStartDaily: () => void;
}

export const DailySpeedrunView: React.FC<DailySpeedrunViewProps> = ({ onStartDaily }) => {
  const stats = speedrunEngine.getStats();
  const today = new Date().toISOString().slice(0, 10);
  const isCompletedToday = stats.lastDailyDate === today;

  // Time until next midnight UTC
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diffMs = nextUtcMidnight.getTime() - now.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const sampleDaily = ChallengeGenerator.createDailyChallenge();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 select-none">
      
      {/* Title Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
          <Calendar className="w-3.5 h-3.5" />
          <span>OFFICIAL DAILY DROP</span>
        </div>
        <h2 className="font-cinzel text-3xl sm:text-5xl font-black uppercase text-white tracking-wider">
          DAILY SPEEDRUN
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          One unique challenge every 24 hours. Everyone on Earth gets the exact same seed.
        </p>
      </div>

      {/* Main Daily Challenge Showcase Card */}
      <div className="relative p-7 sm:p-9 rounded-3xl bg-black/70 backdrop-blur-2xl border-2 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,66,0.25)] space-y-6">
        
        {/* Top Bar: Date & Countdown */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                Challenge Date
              </p>
              <h3 className="text-base sm:text-lg font-black text-white font-mono">
                {today}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Next Drop In
              </p>
              <p className="text-base sm:text-lg font-black font-mono text-rose-400 flex items-center gap-1.5 justify-end">
                <Clock className="w-4 h-4" />
                <span>{timeLeft || '00:00:00'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Challenge Preview */}
        <div className="space-y-3 text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 font-bold">
              {sampleDaily.category.toUpperCase()}
            </span>
            <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 font-bold">
              +{sampleDaily.pointsBase} PTS BONUS
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white">
            {sampleDaily.title}
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed font-light">
            {sampleDaily.description}
          </p>
        </div>

        {/* Streak Stats & Status */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
          <div>
            <p className="text-xs font-mono uppercase text-slate-400">Your Daily Streak</p>
            <p className="text-2xl font-black text-rose-400 font-mono flex items-center justify-center gap-1 mt-1">
              <Flame className="w-5 h-5 fill-current" />
              <span>{stats.dailyStreak} Days</span>
            </p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase text-slate-400">Status Today</p>
            <p className="text-sm font-black font-mono mt-2">
              {isCompletedToday ? (
                <span className="text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Completed
                </span>
              ) : (
                <span className="text-amber-400">Ready To Speedrun</span>
              )}
            </p>
          </div>
        </div>

        {/* Launch CTA */}
        <div className="pt-2 flex justify-center">
          <button
            onClick={() => {
              speedrunAudio.playClick();
              onStartDaily();
            }}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:via-rose-400 hover:to-purple-500 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_35px_rgba(245,158,66,0.5)] hover:shadow-[0_0_50px_rgba(245,158,66,0.8)] transition-all transform hover:scale-105 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>PLAY TODAY'S SPEEDRUN</span>
          </button>
        </div>

      </div>

    </div>
  );
};
