import React, { useState } from 'react';
import {
  Shield,
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
  Trash2,
  Edit2,
  Check,
  Disc3,
  AlertTriangle,
  Lock,
  LogOut,
  LogIn,
  Mail,
  Info,
  Sparkles,
  Swords,
  AtSign,
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { MatchHistoryItem } from '../../types';
import { gameEngine } from '../../services/gameEngine';
import { authService } from '../../services/authService';
import { socialService } from '../../services/socialService';
import { AchievementSystem } from './AchievementSystem';
import { AuthModal } from '../auth/AuthModal';
import { rankedBlitzService } from '../../services/rankedBlitzService';

interface ProfileViewProps {
  onDataReset: () => void;
  onOpenAuth?: () => void;
}

const AVAILABLE_LANGUAGES = [
  'English',
  'Hindi',
  'Telugu',
  'Tamil',
  'Korean',
  'Japanese',
  'Spanish',
  'French'
];

export const ProfileView: React.FC<ProfileViewProps> = ({ onDataReset, onOpenAuth }) => {
  const [profile, setProfile] = useState(gameEngine.getUserProfile());
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.displayName);

  // Username editing state
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(profile.username || '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);
  
  // Account deletion requires an authenticated session and explicit typed confirmation.
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionSuccessNotice, setDeletionSuccessNotice] = useState<{
    message: string;
    designatedAccount?: string;
    dispatchId?: string;
  } | null>(null);

  // Sign out confirmation modal state
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);

  // Ranked 1v1 Blitz Stats
  const [blitzStats, setBlitzStats] = useState(rankedBlitzService.getStats());

  React.useEffect(() => {
    return rankedBlitzService.subscribe(() => {
      setBlitzStats(rankedBlitzService.getStats());
    });
  }, []);

  // Local auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Match History state & filtering
  const [historyFilter, setHistoryFilter] = useState<'all' | 'solo' | 'competitive' | 'casual'>('all');
  const rawHistory = gameEngine.getMatchHistory();
  const completedGames = gameEngine.getCompletedGames();

  // If match history empty, fallback-map completedGames
  const matchHistory: MatchHistoryItem[] = rawHistory.length > 0
    ? rawHistory
    : completedGames.map(g => ({
        id: g.sessionId,
        gameMode: 'solo',
        playedAt: new Date(g.startedAt).toISOString(),
        score: g.totalScore,
        totalRounds: g.rounds.length,
        roundsWon: g.rounds.filter(r => r.status === 'won').length,
        correctGuesses: g.rounds.filter(r => r.status === 'won').length,
        details: `${g.mode.toUpperCase()} Solo Game`
      }));

  const filteredHistory = matchHistory.filter(m => {
    if (historyFilter === 'all') return true;
    return (m.gameMode || m.mode) === historyFilter;
  });

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    try {
      const updated = await authService.updateDisplayName(nameInput.trim());
      setProfile(updated);
    } catch {
      const updated = gameEngine.updateUserProfile({ displayName: nameInput.trim() });
      setProfile(updated);
    }
    setIsEditingName(false);
  };

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    const clean = usernameInput.trim();
    if (!clean) {
      setUsernameError('Please enter a username.');
      return;
    }

    setUsernameSaving(true);
    try {
      const res = await socialService.updateUsername(clean);
      if (res.success && res.username) {
        setProfile(gameEngine.getUserProfile());
        setIsEditingUsername(false);
      } else {
        setUsernameError(res.error || 'Failed to update username.');
      }
    } catch (err: any) {
      setUsernameError(err.message || 'Error updating username.');
    } finally {
      setUsernameSaving(false);
    }
  };

  const handleToggleLanguage = (lang: string) => {
    const currentLangs = profile.preferredLanguages || ['English'];
    let updatedLangs: string[];
    if (currentLangs.includes(lang)) {
      if (currentLangs.length === 1) return; // Keep at least one
      updatedLangs = currentLangs.filter(l => l !== lang);
    } else {
      updatedLangs = [...currentLangs, lang];
    }

    const updated = gameEngine.updateUserProfile({ preferredLanguages: updatedLangs });
    setProfile(updated);
  };

  const handleSignOut = () => {
    setSignOutModalOpen(true);
  };

  const handleConfirmSignOut = async () => {
    setSignOutModalOpen(false);
    await authService.signOut();
    const fresh = gameEngine.getUserProfile();
    setProfile(fresh);
    onDataReset();
  };

  const handleOpenDeleteModal = () => {
    setDeletionError(null);
    setDeleteInput('');
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteAccount = async () => {
    setDeletionError(null);
    if (deleteInput.trim() !== 'DELETE') {
      setDeletionError('Please type "DELETE" exactly to confirm.');
      return;
    }

    setIsDeleting(true);
    try {
      const result = await authService.deleteAccount('DELETE');
      setDeletionSuccessNotice({
        message: result.message,
        designatedAccount: result.designatedAccount,
        dispatchId: result.confirmationDispatchId
      });
      setDeleteModalOpen(false);
      setDeleteInput('');
      const fresh = gameEngine.getUserProfile();
      setProfile(fresh);
      onDataReset();
    } catch (err: any) {
      setDeletionError(err.message || 'Error deleting account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Deletion Success Banner */}
      {deletionSuccessNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-emerald-900">
              Account Deletion Processed
            </h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {deletionSuccessNotice.message}
            </p>
            {deletionSuccessNotice.designatedAccount && (
              <p className="text-[11px] text-emerald-700 font-mono">
                Confirmation Notice: Sent to {deletionSuccessNotice.designatedAccount} · Ref: {deletionSuccessNotice.dispatchId}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Guest Mode Warning Banner if Guest */}
      {profile.isGuest && (
        <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-900 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0 shadow-xs">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <span>Guest Player Account (Local Storage Only)</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed max-w-xl font-medium">
                Your high scores, streak, and unlocked achievements are saved only on this browser. If you clear cookies, browser history, or switch devices, your data may be lost.
              </p>
            </div>
          </div>

          <button
            onClick={() => setAuthModalOpen(true)}
            className="w-full sm:w-auto px-5 py-3 text-xs font-black text-white bg-sv-red hover:bg-sv-crimson active:bg-sv-burgundy rounded-2xl shadow-md shadow-sv-red/25 transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Link / Sign In Account</span>
          </button>
        </div>
      )}

      {/* Profile Card Header */}
      <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200/90 dark:border-sv-burgundy rounded-3xl p-6 sm:p-9 shadow-sm">
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sv-red via-sv-red-orange to-sv-gold flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-sv-red/10">
              {profile.displayName.charAt(0)}
            </div>

            <div className="space-y-1">
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-sv-navy border border-slate-300 dark:border-sv-burgundy rounded-lg focus:outline-none focus:border-sv-red"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-sv-red text-white rounded-lg hover:bg-sv-crimson"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {profile.displayName}
                  </h1>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                    title="Edit Name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Unique Username Row */}
              <div className="pt-0.5">
                {isEditingUsername ? (
                  <form onSubmit={handleSaveUsername} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs font-mono text-slate-400">@</span>
                        <input
                          type="text"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                          className="pl-6 pr-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-sv-navy border border-slate-300 dark:border-sv-burgundy rounded-lg focus:outline-none focus:border-sv-red"
                          placeholder="username"
                          autoFocus
                          disabled={usernameSaving}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={usernameSaving}
                        className="px-2.5 py-1.5 bg-sv-red text-white text-xs font-bold rounded-lg hover:bg-sv-crimson transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {usernameSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingUsername(false);
                          setUsernameInput(profile.username || '');
                          setUsernameError(null);
                        }}
                        className="px-2.5 py-1.5 bg-slate-200 dark:bg-sv-burgundy text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    {usernameError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{usernameError}</span>
                      </p>
                    )}
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-sv-red dark:text-sv-warm-orange flex items-center gap-0.5">
                      <AtSign className="w-3.5 h-3.5" />
                      <span>{profile.username || 'set_username'}</span>
                    </span>
                    <button
                      onClick={() => {
                        setUsernameInput(profile.username || '');
                        setUsernameError(null);
                        setIsEditingUsername(true);
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer font-bold"
                    >
                      {profile.username ? 'Change' : 'Claim Unique Username'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Player ID: <span className="font-mono">{profile.id}</span></span>
                <span>·</span>
                <span className={profile.isGuest ? 'text-amber-700 dark:text-sv-gold font-bold' : 'text-emerald-700 dark:text-emerald-400 font-bold'}>
                  {profile.isGuest
                    ? 'Guest Account'
                    : `${profile.authProvider === 'google' ? 'Google' : profile.authProvider === 'email' ? 'Email' : 'Verified'} Account`}
                </span>
                {profile.email && <span className="text-slate-400 font-mono">({profile.email})</span>}
              </div>

              {/* Account Badges Strip */}
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                {profile.isGuest ? (
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-600" />
                    <span>Local Guest Mode</span>
                  </span>
                ) : (
                  <>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{profile.emailVerified ? 'Verified Email' : 'Email Active'}</span>
                    </span>

                    {profile.accountType === 'admin' && (
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Lock className="w-3 h-3 text-purple-600" />
                        <span>Administrator</span>
                      </span>
                    )}
                  </>
                )}

                {/* Account Actions */}
                {!profile.isGuest && profile.email && (
                  <button
                    onClick={() => {
                      authService.setAuthView('forgot_password');
                      setAuthModalOpen(true);
                    }}
                    className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded border border-slate-200 dark:border-sv-burgundy hover:bg-slate-50 dark:hover:bg-sv-navy"
                  >
                    <span>Reset Password</span>
                  </button>
                )}

                {!profile.isGuest && profile.email && authService.getState().sessionToken && (
                  <button
                    onClick={async () => {
                      try {
                        await authService.rotateRecoveryKey();
                        setAuthModalOpen(true);
                      } catch (err: any) {
                        alert(err.message || 'Could not replace the recovery key.');
                      }
                    }}
                    className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded border border-slate-200 dark:border-sv-burgundy hover:bg-slate-50 dark:hover:bg-sv-navy"
                    title="The current key stops working immediately when it is replaced."
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Replace Recovery Key</span>
                  </button>
                )}

                {!profile.isGuest && (
                  <button
                    onClick={handleSignOut}
                    className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Streak Badge */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Active Streak
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                🔥 {profile.currentStreak}
              </div>
            </div>
          </div>

        </div>

        {/* 4-Column Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-sv-burgundy">
          
          <div className="bg-slate-50/70 dark:bg-sv-navy/70 p-4 rounded-xl border border-slate-100 dark:border-sv-burgundy text-center">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Games Played
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {profile.gamesPlayed}
            </div>
          </div>

          <div className="bg-slate-50/70 dark:bg-sv-navy/70 p-4 rounded-xl border border-slate-100 dark:border-sv-burgundy text-center">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Accuracy
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {profile.accuracy}%
            </div>
          </div>

          <div className="bg-slate-50/70 dark:bg-sv-navy/70 p-4 rounded-xl border border-slate-100 dark:border-sv-burgundy text-center">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Best Score
            </div>
            <div className="text-xl font-bold text-sv-red dark:text-sv-gold font-mono tabular-nums">
              {profile.bestScore}
            </div>
          </div>

          <div className="bg-slate-50/70 dark:bg-sv-navy/70 p-4 rounded-xl border border-slate-100 dark:border-sv-burgundy text-center">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Best Streak
            </div>
            <div className="text-xl font-bold text-sv-warm-orange dark:text-sv-amber font-mono tabular-nums">
              {profile.bestStreak}
            </div>
          </div>

        </div>

        {/* Ranked 1v1 Blitz Summary Banner */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-sv-burgundy/40 via-sv-red/10 to-transparent border border-sv-red/20 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sv-red to-sv-orange flex items-center justify-center text-white shadow-md shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Ranked 1v1 Blitz</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-500 font-mono">
                  {blitzStats.tier} Tier
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {blitzStats.wins} Wins • {blitzStats.losses} Losses • {blitzStats.streak} Win Streak
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-sv-red dark:text-sv-warm-orange font-mono">
              {blitzStats.rating} <span className="text-xs font-bold text-slate-400">Elo</span>
            </span>
          </div>
        </div>

      </div>

      {/* Language Preferences Section */}
      <div className="bg-white dark:bg-sv-burgundy-deep border border-slate-200/90 dark:border-sv-burgundy rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-sv-red dark:text-sv-gold" />
              <span>Preferred Song Languages</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select languages you enjoy. We tailor category rounds and discovery suggestions to match.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {AVAILABLE_LANGUAGES.map((lang) => {
            const isSelected = (profile.preferredLanguages || ['English']).includes(lang);
            return (
              <button
                key={lang}
                onClick={() => handleToggleLanguage(lang)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-sv-red text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-sv-navy text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-sv-burgundy'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                <span>{lang}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievement & Milestones System Hub */}
      <AchievementSystem userProfile={profile} />

      {/* Comprehensive Match History Hub */}
      <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200/90 dark:border-sv-burgundy rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-sv-burgundy pb-4">
          <div className="space-y-0.5">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sv-red" />
              <span>Player Match History</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Verified records across solo, competitive and casual games
            </p>
          </div>

          {/* Mode Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-sv-midnight rounded-xl border border-slate-200 dark:border-sv-burgundy text-xs">
            {(['all', 'solo', 'competitive', 'casual'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setHistoryFilter(mode)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer capitalize text-[11px] ${
                  historyFilter === mode
                    ? 'bg-sv-red text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mode === 'all' ? `All (${matchHistory.length})` : mode}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              No matches found for <strong className="capitalize">{historyFilter}</strong> mode. Play a match to build your log!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-sv-burgundy/40">
            {filteredHistory.slice(0, 15).map((match) => (
              (() => {
                const mode = match.gameMode || match.mode || 'solo';
                const playedAt = match.playedAt || new Date(match.completedAt || Date.now()).toISOString();
                const score = match.score ?? match.finalScore ?? 0;
                const totalRounds = match.totalRounds ?? match.roundsCompleted ?? 0;
                return (
              <div key={match.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                    mode === 'competitive'
                      ? 'bg-gradient-to-tr from-sv-amber to-sv-gold text-slate-950'
                      : mode === 'casual'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-sv-red/10 text-sv-red dark:text-sv-warm-orange border border-sv-red/20'
                  }`}>
                    {mode === 'competitive' ? (
                      <Trophy className="w-4 h-4" />
                    ) : mode === 'casual' ? (
                      <Sparkles className="w-4 h-4" />
                    ) : (
                      <Disc3 className="w-4 h-4" />
                    )}
                  </div>

                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white capitalize">
                        {match.details || `${mode} Match`}
                      </span>
                      {match.rank && (
                        <span className="text-[10px] font-black font-mono text-sv-amber bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-1.5 py-0.2 rounded">
                          Rank #{match.rank} {match.totalPlayers ? `of ${match.totalPlayers}` : ''}
                        </span>
                      )}
                      {match.roomCode && (
                        <span className="text-[10px] font-mono text-slate-400">
                          Room: {match.roomCode}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      {new Date(playedAt).toLocaleDateString()} at {new Date(playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {totalRounds} rounds
                    </div>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between text-right shrink-0">
                  <div className="font-black text-sv-red dark:text-sv-gold font-mono text-sm tabular-nums">
                    {score} pts
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {match.roundsWon ?? match.correctGuesses ?? 0} / {totalRounds} correct
                  </div>
                </div>
              </div>
                );
              })()
            ))}
          </div>
        )}
      </div>

      {/* Account Deletion Section (Explicit confirmation requiring typing 'DELETE') */}
      <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-6 space-y-3">
        <div className="flex items-start gap-3">
          <Trash2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              Delete SongVerse Account & Data
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Permanently delete your profile, scores, streaks, unlocked achievements, and preferences. For security and audit compliance, typing <strong className="font-mono text-rose-700">DELETE</strong> is strictly required, and a confirmation notice will be dispatched to your designated Google or Apple account.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleOpenDeleteModal}
            className="px-4 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-300 hover:bg-rose-50 hover:border-rose-400 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Delete Account...
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-rose-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-4">
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Account Deletion
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This action is permanent and immediate. All your gameplay stats, streak of {profile.currentStreak}, and achievements will be erased.
                </p>
              </div>
            </div>

            {/* Email Inbox Notice Card */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-left">
              <Mail className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-rose-800 leading-relaxed">
              Account deletion requires an active signed-in session. Type DELETE below to confirm.
              </div>
            </div>

            {deletionError && (
              <div className="p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{deletionError}</span>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1 text-slate-600">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Account Security:</span>
              </div>
              <p className="text-[11px]">
                {profile.isGuest ? (
                  <span>Guest account: Local storage data will be purged.</span>
                ) : (
                  <span>
                    Your current authenticated session will be used to authorize deletion of the account (<strong className="text-slate-800">{profile.email || 'account'}</strong>).
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Type <span className="font-mono text-rose-700 font-black">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                disabled={deleteInput !== 'DELETE' || isDeleting}
                className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  deleteInput === 'DELETE' && !isDeleting
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Authorize Permanent Deletion'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {signOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-sv-midnight border border-slate-200 dark:border-sv-burgundy rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl relative space-y-5 text-center">
            
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-rose-500/15 to-sv-warm-orange/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <LogOut className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Sign out of SongVerse?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to sign out? You will automatically enter <strong>Guest Mode</strong>. Your stats and gameplay history will remain safely stored on your account for your next sign-in.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSignOutModalOpen(false)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-sv-navy hover:bg-slate-200 dark:hover:bg-sv-burgundy/40 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-sv-burgundy"
              >
                No, Stay
              </button>

              <button
                type="button"
                onClick={handleConfirmSignOut}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-sv-red hover:from-rose-700 hover:to-sv-crimson rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Sign Out</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setProfile(gameEngine.getUserProfile());
          onDataReset();
        }}
      />

    </div>
  );
};
