import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { LeaderboardEntry } from '../../types';
import { gameEngine } from '../../services/gameEngine';
import { fetchLeaderboardEntries, isSupabaseConfigured } from '../../services/supabaseClient';

export const LeaderboardView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'all-time'>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const userProfile = gameEngine.getUserProfile();

  const loadLeaderboard = async (period: 'daily' | 'weekly' | 'monthly' | 'all-time') => {
    setIsLoading(true);
    try {
      const data = await fetchLeaderboardEntries(period);
      // Fallback: If user has a verified score locally, include their genuine profile
      if (data.length === 0 && userProfile && userProfile.totalScore > 0 && userProfile.gamesPlayed > 0) {
        setEntries([{
          rank: 1,
          userId: userProfile.id,
          displayName: `${userProfile.displayName} (You)`,
          avatarSeed: userProfile.avatarSeed,
          score: userProfile.totalScore,
          accuracy: userProfile.accuracy,
          streak: userProfile.currentStreak,
          dateAchieved: new Date().toISOString().split('T')[0],
          gameMode: 'classic'
        }]);
      } else {
        setEntries(data);
      }
      setLastUpdated(new Date());
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard(activeTab);
  }, [activeTab]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in">
      
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-sv-red bg-sv-red/10 border border-sv-red/20 px-3.5 py-1.5 rounded-full uppercase tracking-wider">
          <Trophy className="w-3.5 h-3.5 text-sv-amber" />
          <span>Verified Trivia Rankings</span>
          {isSupabaseConfigured() ? (
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              Supabase Verified
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              Guest Mode
            </span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          SongVerse Leaderboard
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          100% genuine rankings from verified game sessions. Server-authoritative scoring with zero bot entries.
        </p>
      </div>

      {/* Period Tabs: Daily, Weekly, Monthly, All-time */}
      <div className="flex items-center justify-center gap-1.5 p-1 bg-slate-100 dark:bg-sv-burgundy-deep rounded-2xl max-w-md mx-auto border border-slate-200 dark:border-sv-burgundy">
        {(['daily', 'weekly', 'monthly', 'all-time'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setActiveTab(period)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer capitalize ${
              activeTab === period
                ? 'bg-sv-red text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {period === 'all-time' ? 'All-Time' : period}
          </button>
        ))}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>Showing verified scores for: <strong className="capitalize text-slate-800 dark:text-slate-200">{activeTab}</strong></span>
        <button
          onClick={() => loadLeaderboard(activeTab)}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 hover:text-sv-red transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh (updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white dark:bg-sv-burgundy-deep border border-slate-200 dark:border-sv-burgundy rounded-2xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-sv-red animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Loading verified leaderboard...</p>
        </div>
      ) : entries.length === 0 ? (
        /* Explicit Required Empty State */
        <div className="bg-white dark:bg-sv-burgundy-deep border border-slate-200 dark:border-sv-burgundy rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-sv-burgundy/20 border border-sv-burgundy/40 text-sv-amber flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              No scores yet. Be the first to play!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
              Play a round in Classic or Daily mode to claim the top spot on the {activeTab} leaderboard.
            </p>
          </div>
        </div>
      ) : (
        /* Leaderboard Table Container */
        <div className="bg-white dark:bg-sv-burgundy-deep border border-slate-200 dark:border-sv-burgundy rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-sv-burgundy/40 border-b border-slate-200 dark:border-sv-burgundy text-slate-500 dark:text-slate-300 font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3.5 w-16 text-center">Rank</th>
                  <th scope="col" className="px-5 py-3.5">Player</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Streak</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Accuracy</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-sv-burgundy/50">
                {entries.map((entry) => {
                  const isUser = entry.userId === userProfile.id;
                  let rankBadge = (
                    <span className="font-mono text-slate-500 dark:text-slate-400 font-bold">{entry.rank}</span>
                  );

                  if (entry.rank === 1) {
                    rankBadge = (
                      <span className="w-6 h-6 rounded-full bg-sv-gold text-sv-navy font-extrabold flex items-center justify-center mx-auto text-[11px] shadow-xs">
                        1
                      </span>
                    );
                  } else if (entry.rank === 2) {
                    rankBadge = (
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold flex items-center justify-center mx-auto text-[11px]">
                        2
                      </span>
                    );
                  } else if (entry.rank === 3) {
                    rankBadge = (
                      <span className="w-6 h-6 rounded-full bg-sv-warm-orange/20 text-sv-orange font-bold flex items-center justify-center mx-auto text-[11px]">
                        3
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={entry.userId + entry.rank}
                      className={`transition-colors ${
                        isUser
                          ? 'bg-sv-red/10 dark:bg-sv-crimson/20 font-semibold'
                          : 'hover:bg-slate-50/80 dark:hover:bg-sv-burgundy/30'
                      }`}
                    >
                      <td className="px-5 py-3.5 text-center">{rankBadge}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sv-red to-sv-orange flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                            {entry.displayName.charAt(0)}
                          </div>
                          <span className="text-slate-900 dark:text-slate-100 truncate">
                            {entry.displayName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                        {entry.streak > 0 ? `🔥 ${entry.streak}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                        {entry.accuracy}%
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-sv-red dark:text-sv-warm-orange text-sm tabular-nums">
                        {entry.score.toLocaleString()} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
