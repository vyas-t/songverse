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
  Info
} from 'lucide-react';
import { gameEngine } from '../../services/gameEngine';
import { authService } from '../../services/authService';
import { AchievementSystem } from './AchievementSystem';
import { AuthModal } from '../auth/AuthModal';

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
  
  // Account deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionSuccessNotice, setDeletionSuccessNotice] = useState<{
    message: string;
    designatedAccount?: string;
    dispatchId?: string;
  } | null>(null);

  // Local auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const completedGames = gameEngine.getCompletedGames();

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const updated = gameEngine.updateUserProfile({ displayName: nameInput.trim() });
    setProfile(updated);
    setIsEditingName(false);
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

  const handleSignOut = async () => {
    await authService.signOut();
    const fresh = gameEngine.getUserProfile();
    setProfile(fresh);
    onDataReset();
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;

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
      alert(err.message || 'Error deleting account');
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

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Player ID: <span className="font-mono">{profile.id}</span> ·{' '}
                <span className={profile.isGuest ? 'text-amber-700 dark:text-sv-gold font-medium' : 'text-emerald-700 dark:text-emerald-400 font-medium'}>
                  {profile.isGuest ? 'Guest Account' : `Verified ${profile.authProvider === 'apple' ? 'Apple' : 'Google'} Account`}
                </span>
                {profile.email && ` (${profile.email})`}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-medium">
                  {profile.isGuest ? 'Local Sandbox Protected' : 'Server Account Synced'}
                </div>
                {!profile.isGuest && (
                  <button
                    onClick={handleSignOut}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded border border-slate-200 dark:border-sv-burgundy hover:bg-slate-50 dark:hover:bg-sv-navy"
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

      {/* Recent Matches Log */}
      {completedGames.length > 0 && (
        <div className="bg-white dark:bg-sv-burgundy-deep border border-slate-200/90 dark:border-sv-burgundy rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Recent Match History
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-sv-burgundy/40">
            {completedGames.slice(0, 5).map((game) => (
              <div key={game.sessionId} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white capitalize">
                    {game.mode} Mode
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-400">
                    {new Date(game.startedAt).toLocaleDateString()} · {game.rounds.length} rounds
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sv-red dark:text-sv-gold font-mono text-sm tabular-nums">
                    {game.totalScore} pts
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {game.rounds.filter(r => r.status === 'won').length} / {game.rounds.length} won
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            onClick={() => {
              setDeleteInput('');
              setDeleteModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-300 hover:bg-rose-50 hover:border-rose-400 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Delete Account...
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-rose-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-5">
            
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

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1.5 text-slate-600">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Security Confirmation Notice:</span>
              </div>
              <p className="text-[11px]">
                {profile.isGuest ? (
                  <span>Guest account: Local storage data will be purged.</span>
                ) : (
                  <span>
                    A confirmation notification will be dispatched to your designated {profile.authProvider === 'apple' ? 'Apple' : 'Google'} account (<strong className="text-slate-800">{profile.email || 'linked account'}</strong>).
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                To confirm, type <span className="font-mono text-rose-700 font-bold">DELETE</span> below:
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                autoComplete="off"
                autoFocus
              />
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
                <span>{isDeleting ? 'Deleting...' : 'Permanently Delete Account'}</span>
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
