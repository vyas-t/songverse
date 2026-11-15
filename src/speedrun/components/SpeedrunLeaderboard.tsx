import React, { useState } from 'react';
import { Trophy, Medal, Crown, Timer, Zap, User } from 'lucide-react';
import { speedrunEngine } from '../engine/speedrunEngine';
import { SpeedrunMode } from '../types';

export const SpeedrunLeaderboard: React.FC = () => {
  const [filterMode, setFilterMode] = useState<string>('all');
  const records = speedrunEngine.getLeaderboard();

  const filteredRecords = filterMode === 'all'
    ? records
    : records.filter((r) => r.mode === filterMode);

  const topThree = filteredRecords.slice(0, 3);
  const remaining = filteredRecords.slice(3);

  const formatTime = (ms: number) => {
    return `${(ms / 1000).toFixed(3)}s`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 select-none">
      
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#84cc16]/20 border border-[#a3e635]/40 text-[#a3e635] text-xs font-mono font-bold">
          <Trophy className="w-3.5 h-3.5 text-[#a3e635]" />
          <span>HALL OF FAME</span>
        </div>
        <h2 className="font-cinzel text-3xl sm:text-5xl font-black uppercase text-white tracking-wider">
          SPEEDRUN RANKINGS
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          The fastest reflexes on the planet. Can you claim the #1 world record?
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        {['all', 'random', 'brain_glitch', 'wire_defuse', 'reaction', 'typing', 'daily', 'impossible'].map((m) => (
          <button
            key={m}
            onClick={() => setFilterMode(m)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
              filterMode === m
                ? 'bg-[#a3e635] text-black font-black shadow-[0_0_15px_rgba(163,230,53,0.6)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            {m.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* PODIUM TOP 3 */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {topThree.map((rec, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;

            return (
              <div
                key={rec.id}
                className={`p-6 rounded-3xl backdrop-blur-xl border-2 text-center space-y-3 relative overflow-hidden transition-transform hover:-translate-y-1 ${
                  isFirst
                    ? 'bg-gradient-to-b from-[#84cc16]/20 to-[#0e1117] border-[#a3e635] shadow-[0_0_35px_rgba(163,230,53,0.35)] order-1 sm:order-2 -mt-2'
                    : isSecond
                    ? 'bg-[#0e1117] border-slate-400/40 shadow-md order-2 sm:order-1'
                    : 'bg-[#0e1117] border-[#ef4444]/40 shadow-md order-3'
                }`}
              >
                {/* Crown / Rank Icon */}
                <div className="flex justify-center">
                  {isFirst && <Crown className="w-8 h-8 text-[#a3e635] animate-bounce" />}
                  {isSecond && <Medal className="w-7 h-7 text-slate-300" />}
                  {isThird && <Medal className="w-6 h-6 text-[#ef4444]" />}
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-[#a3e635] font-bold">
                    RANK #{idx + 1}
                  </span>
                  <h4 className="text-base font-black text-white truncate mt-1">
                    {rec.playerName}
                  </h4>
                  <p className="text-[11px] font-mono text-[#bef264]/80 uppercase">
                    {rec.mode} Mode
                  </p>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <p className="text-xl font-black text-[#a3e635] font-mono">
                    {rec.score} pts
                  </p>
                  <p className="text-xs font-mono text-slate-400">
                    Time: {formatTime(rec.timeMs)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REMAINING LEADERBOARD TABLE */}
      <div className="rounded-3xl bg-[#0e1117] border border-[#84cc16]/30 overflow-hidden shadow-xl">
        <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-mono text-slate-400 border-b border-white/10 uppercase tracking-wider font-bold">
          <span className="col-span-2">Rank</span>
          <span className="col-span-4 sm:col-span-5">Speedrunner</span>
          <span className="col-span-3 sm:col-span-3 text-right">Score</span>
          <span className="col-span-3 sm:col-span-2 text-right">Time</span>
        </div>

        <div className="divide-y divide-white/5">
          {filteredRecords.map((rec, idx) => (
            <div
              key={rec.id}
              className={`grid grid-cols-12 px-5 py-3.5 items-center text-xs font-mono transition-colors ${
                rec.isCurrentPlayer
                  ? 'bg-[#84cc16]/15 border-l-4 border-[#a3e635]'
                  : 'hover:bg-white/5'
              }`}
            >
              <span className="col-span-2 font-black text-[#a3e635]">
                #{rec.rank || idx + 1}
              </span>
              <span className="col-span-4 sm:col-span-5 font-bold text-white truncate flex items-center gap-1.5">
                {rec.isCurrentPlayer && <User className="w-3.5 h-3.5 text-[#a3e635]" />}
                {rec.playerName}
              </span>
              <span className="col-span-3 sm:col-span-3 text-right font-black text-[#bef264]">
                {rec.score} pts
              </span>
              <span className="col-span-3 sm:col-span-2 text-right text-slate-400">
                {formatTime(rec.timeMs)}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
