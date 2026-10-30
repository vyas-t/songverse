import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertCircle,
  Home,
  Award,
  Disc3,
  FastForward,
  Globe
} from 'lucide-react';
import { GameSession, GameRound, Track, GameMode } from '../../types';
import { gameEngine } from '../../services/gameEngine';
import { GAME_LEVELS } from '../../config/gameConfig';
import { AudioPlayer } from './AudioPlayer';
import { SongSearchInput } from './SongSearchInput';
import { audioEngine } from '../../services/audioEngine';

interface GameViewProps {
  mode: GameMode;
  selectedLanguages?: string[];
  onChangeLanguages?: () => void;
  onNavigateHome: () => void;
  onNavigateLeaderboard: () => void;
  categoryFilter?: { type: 'genre' | 'decade' | 'language'; value: string };
}

export const GameView: React.FC<GameViewProps> = ({
  mode,
  selectedLanguages,
  onChangeLanguages,
  onNavigateHome,
  onNavigateLeaderboard,
  categoryFilter
}) => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Initialize or resume session
  useEffect(() => {
    let s = gameEngine.getActiveSession();
    const languagesChanged = selectedLanguages && selectedLanguages.length > 0 &&
      (!s?.selectedLanguages || s.selectedLanguages.slice().sort().join(',') !== [...selectedLanguages].sort().join(','));

    if (!s || s.status !== 'in-progress' || s.mode !== mode || languagesChanged) {
      s = gameEngine.startSession({ mode, categoryFilter, selectedLanguages });
    }
    setSession(s);
    if (s && s.rounds.length > 0) {
      setCurrentRound(s.rounds[s.currentRoundIndex]);
    }
  }, [mode, categoryFilter, selectedLanguages]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      audioEngine.stop();
    };
  }, []);

  const targetTrack = currentRound ? gameEngine.getCurrentTargetTrack(currentRound) : undefined;

  const handleSubmitGuess = () => {
    if (!selectedTrack || !currentRound || currentRound.status !== 'playing') return;

    // Immediately stop any clip playback so only one audio source is active
    audioEngine.stop();

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = gameEngine.submitGuess(selectedTrack.id);
      setSession({ ...result.session });
      setCurrentRound({ ...result.round });
      setSelectedTrack(null);

      if (result.isCorrect) {
        audioEngine.playCorrectSound();
        if (result.round.currentLevel === 1 || result.session.totalScore >= 300) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3500);
        }
      } else {
        if (result.round.status === 'lost') {
          audioEngine.playIncorrectSound();
        } else {
          audioEngine.playLevelUnlockSound();
        }
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipLevel = () => {
    if (!currentRound || currentRound.status !== 'playing') return;

    // Stop active audio before advancing to next level
    audioEngine.stop();

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = gameEngine.skipCurrentLevel();
      setSession({ ...result.session });
      setCurrentRound({ ...result.round });
      setSelectedTrack(null);
      if (result.round.status === 'lost') {
        audioEngine.playIncorrectSound();
      } else {
        audioEngine.playLevelUnlockSound();
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Skip error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipRound = () => {
    if (!currentRound || currentRound.status !== 'playing') return;

    // Stop active audio before round skip
    audioEngine.stop();

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = gameEngine.skipRound();
      setSession({ ...result.session });
      setCurrentRound({ ...result.round });
      setSelectedTrack(null);
      audioEngine.playIncorrectSound();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Skip round error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextRound = () => {
    setErrorMessage(null);
    setSelectedTrack(null);
    audioEngine.stop();

    try {
      const nextRnd = gameEngine.advanceToNextRound();
      const updatedSession = gameEngine.getActiveSession();
      setSession(updatedSession ? { ...updatedSession } : null);
      setCurrentRound(nextRnd ? { ...nextRnd } : null);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    }
  };

  const handleRestartGame = () => {
    audioEngine.stop();
    const newSession = gameEngine.startSession({ mode, categoryFilter, selectedLanguages });
    setSession(newSession);
    setCurrentRound(newSession.rounds[0]);
    setSelectedTrack(null);
    setErrorMessage(null);
  };

  if (session && session.rounds.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-sv-navy border border-indigo-100 dark:border-sv-burgundy text-indigo-600 dark:text-sv-warm-orange flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Disc3 className="w-8 h-8 animate-spin-slow" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          Your playlist is waiting 🎵
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed max-w-md mx-auto">
          Songs will appear here once added to the active catalogue. Add playable recordings to start progressive 4-level guessing rounds!
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onChangeLanguages && (
            <button
              onClick={() => {
                gameEngine.abandonActiveSession();
                onChangeLanguages();
              }}
              className="w-full sm:w-auto px-6 py-3 bg-sv-red hover:bg-sv-crimson text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              Choose Languages
            </button>
          )}
          <button
            onClick={() => {
              gameEngine.abandonActiveSession();
              onNavigateHome();
            }}
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-sv-burgundy-deep dark:hover:bg-sv-burgundy text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (!session || !currentRound || !targetTrack) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-3 border-sv-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Preparing music trivia session...</p>
      </div>
    );
  }

  const isRoundOver = currentRound.status !== 'playing';
  const isSessionOver = session.status === 'completed';
  const currentLevelConfig = GAME_LEVELS[currentRound.currentLevel];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      
      {/* Celebration Confetti Effect Banner */}
      {showCelebration && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-sv-amber via-sv-red to-sv-burgundy text-white text-xs font-black px-7 py-3 rounded-full shadow-2xl shadow-sv-red/30 flex items-center gap-2.5 animate-bounce border border-white/20">
          <Sparkles className="w-4 h-4 text-sv-gold animate-spin" />
          <span>Incredible Ear! 100 Points Awarded at Level 1!</span>
        </div>
      )}

      {/* Top HUD Cockpit Bar */}
      <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200/90 dark:border-sv-burgundy rounded-3xl p-5 sm:p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        
        {/* Round Counter */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sv-red/10 dark:bg-sv-midnight border border-sv-red/20 dark:border-sv-burgundy flex items-center justify-center text-sv-red dark:text-sv-gold font-mono font-black text-sm shadow-xs">
            #{currentRound.roundNumber}
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono">
              Round {currentRound.roundNumber} of {session.rounds.length}
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white capitalize">
              {session.mode} Mode
            </div>
          </div>
        </div>

        {/* Level Progression Indicator Pills */}
        <div className="flex items-center gap-2">
          {([1, 2, 3, 4] as const).map((lvl) => {
            const isCompleted = lvl < currentRound.currentLevel || (isRoundOver && lvl <= currentRound.currentLevel);
            const isCurrent = lvl === currentRound.currentLevel && !isRoundOver;
            const guessAtThisLevel = currentRound.guesses.find(g => g.level === lvl);

            let badgeBg = 'bg-slate-100 dark:bg-sv-midnight/80 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-sv-burgundy';
            if (isCurrent) {
              badgeBg = 'bg-sv-red text-white border-sv-red shadow-sm shadow-sv-red/30 ring-2 ring-sv-red/20 scale-105';
            } else if (guessAtThisLevel?.isCorrect) {
              badgeBg = 'bg-emerald-500 text-white border-emerald-500 shadow-xs';
            } else if (guessAtThisLevel && !guessAtThisLevel.isCorrect) {
              badgeBg = 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900';
            } else if (isCompleted) {
              badgeBg = 'bg-slate-200 dark:bg-sv-burgundy text-slate-600 dark:text-slate-300 border-slate-300 dark:border-sv-burgundy';
            }

            return (
              <div
                key={lvl}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center text-xs font-black font-mono transition-all ${badgeBg}`}
                title={`Level ${lvl} (${GAME_LEVELS[lvl].durationSeconds}s · ${GAME_LEVELS[lvl].points}pts)`}
              >
                {lvl}
              </div>
            );
          })}
        </div>

        {/* Score & Potential Points */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Total Score
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums font-mono">
              {session.totalScore} pts
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-sv-burgundy" />

          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Reward
            </div>
            <div className="text-sm font-black text-sv-red dark:text-sv-gold tabular-nums font-mono">
              +{isRoundOver ? currentRound.pointsAwarded : currentLevelConfig.points} pts
            </div>
          </div>

          {/* Language Preference Quick Button */}
          {onChangeLanguages && (
            <button
              onClick={() => {
                audioEngine.stop();
                onChangeLanguages();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sv-red dark:text-sv-warm-orange bg-sv-red/10 dark:bg-sv-midnight hover:bg-sv-red/20 border border-sv-red/20 dark:border-sv-burgundy rounded-xl transition-all cursor-pointer focus:outline-none ml-1 shadow-2xs"
              title="Change active languages"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Languages</span>
            </button>
          )}
        </div>

      </div>

      {/* Audio Waveform Player */}
      <div className="mb-3">
        <AudioPlayer
          track={targetTrack}
          level={currentRound.currentLevel}
          roundStatus={currentRound.status}
        />
      </div>

      {/* Solo Mode Repositioned Controls: Skip Round & Submit Your Guess (Immediately below audio component) */}
      {!isRoundOver && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={handleSkipRound}
            disabled={isSubmitting}
            className="px-4 py-3 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            title="Skip entire round (0 points awarded for this round)"
          >
            <span>Skip Round</span>
          </button>

          <button
            type="button"
            onClick={handleSubmitGuess}
            disabled={!selectedTrack || isSubmitting}
            className={`px-7 py-3 text-xs font-extrabold text-white rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 ${
              selectedTrack && !isSubmitting
                ? 'bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-amber hover:from-sv-crimson hover:to-sv-red active:scale-95 cursor-pointer shadow-sv-red/30'
                : 'bg-slate-300 dark:bg-sv-burgundy/50 dark:text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            <span>Submit Your Guess</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Answer Submission or Result Section */}
      {!isRoundOver ? (
        <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200/90 dark:border-sv-burgundy rounded-3xl p-6 sm:p-8 shadow-sm">
          
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Who is playing this track?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Type the song title or artist to search the authorized music catalogue, then submit your guess.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            <SongSearchInput
              selectedTrack={selectedTrack}
              onSelectTrack={(t) => setSelectedTrack(t)}
              onClearSelection={() => setSelectedTrack(null)}
              disabled={isSubmitting}
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleSkipLevel}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-sv-midnight/80 dark:hover:bg-sv-burgundy border border-transparent dark:border-sv-burgundy/50 rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                title="Unlock next level with more audio while reducing available points"
              >
                <FastForward className="w-3.5 h-3.5 text-sv-red dark:text-sv-warm-orange" />
                <span>
                  {currentRound.currentLevel === 1 && 'Skip Level 1 (Deduct: 100 → 70 pts)'}
                  {currentRound.currentLevel === 2 && 'Skip Level 2 (Deduct: 70 → 40 pts)'}
                  {currentRound.currentLevel === 3 && 'Skip Level 3 (Deduct: 40 → 20 pts)'}
                  {currentRound.currentLevel === 4 && 'Skip Level 4 (Forfeit · 0 pts)'}
                </span>
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* Round Completed Card */
        <div className={`rounded-3xl p-6 sm:p-8 border shadow-md transition-all ${
          currentRound.status === 'won'
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
        }`}>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            
            <div className="flex items-center gap-5">
              <div
                className={`w-20 h-20 rounded-3xl bg-gradient-to-tr ${targetTrack.artworkGradient || 'from-sv-red to-sv-orange'} flex items-center justify-center text-white shrink-0 shadow-lg`}
              >
                <Disc3 className="w-10 h-10 animate-spin" style={{ animationDuration: '6s' }} />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {currentRound.status === 'won' ? (
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct! +{currentRound.pointsAwarded} pts
                    </span>
                  ) : (
                    <span className="text-xs font-black text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Round Ended · 0 pts
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {targetTrack.genre} · {targetTrack.releaseYear}
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {targetTrack.title}
                </h3>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                  {targetTrack.artist} — {targetTrack.album}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Licence: {targetTrack.licenceType}
                </p>
              </div>
            </div>

            {/* Next Action */}
            <div className="w-full sm:w-auto shrink-0">
              {!isSessionOver ? (
                <button
                  onClick={handleNextRound}
                  className="w-full sm:w-auto px-7 py-3.5 text-xs font-black text-white bg-gradient-to-r from-sv-red to-sv-red-orange hover:from-sv-crimson hover:to-sv-red rounded-2xl shadow-md shadow-sv-red/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Next Round</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleRestartGame}
                  className="w-full sm:w-auto px-7 py-3.5 text-xs font-black text-white bg-gradient-to-r from-sv-red to-sv-red-orange hover:from-sv-crimson hover:to-sv-red rounded-2xl shadow-md shadow-sv-red/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again</span>
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Session Completed Final Summary Modal */}
      {isSessionOver && (
        <div className="mt-8 bg-white/95 dark:bg-sv-burgundy-deep/95 border border-slate-200/90 dark:border-sv-burgundy rounded-3xl p-6 sm:p-9 shadow-xl">
          <div className="text-center max-w-md mx-auto space-y-5">
            <div className="w-16 h-16 bg-gradient-to-tr from-sv-amber/20 to-sv-gold/30 dark:bg-sv-midnight border border-sv-gold/40 text-sv-gold rounded-3xl flex items-center justify-center mx-auto shadow-md">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Session Complete!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 font-medium">
                You scored <strong className="text-sv-red dark:text-sv-gold text-sm tabular-nums font-mono">{session.totalScore} points</strong> across {session.rounds.length} rounds.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 py-4 border-y border-slate-100 dark:border-sv-burgundy/60">
              <div className="p-2">
                <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums font-mono">
                  {session.rounds.filter(r => r.status === 'won').length} / {session.rounds.length}
                </div>
                <div className="text-[11px] font-bold text-slate-400">Rounds Won</div>
              </div>
              <div className="p-2">
                <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums font-mono">
                  {Math.round((session.rounds.filter(r => r.status === 'won').length / session.rounds.length) * 100)}%
                </div>
                <div className="text-[11px] font-bold text-slate-400">Accuracy</div>
              </div>
              <div className="p-2">
                <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums font-mono">
                  {session.totalScore}
                </div>
                <div className="text-[11px] font-bold text-slate-400">Total Score</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRestartGame}
                className="w-full sm:w-auto px-6 py-3 text-xs font-black text-white bg-sv-red hover:bg-sv-crimson rounded-2xl transition-colors cursor-pointer shadow-md shadow-sv-red/25"
              >
                Play Another Game
              </button>
              {onChangeLanguages && (
                <button
                  onClick={() => {
                    audioEngine.stop();
                    onChangeLanguages();
                  }}
                  className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-sv-red dark:text-sv-warm-orange bg-sv-red/10 dark:bg-sv-midnight hover:bg-sv-red/20 border border-sv-red/20 dark:border-sv-burgundy rounded-2xl transition-colors cursor-pointer"
                >
                  Change Languages
                </button>
              )}
              <button
                onClick={onNavigateLeaderboard}
                className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-sv-midnight/80 dark:hover:bg-sv-burgundy rounded-2xl transition-colors cursor-pointer"
              >
                Leaderboard
              </button>
              <button
                onClick={onNavigateHome}
                className="w-full sm:w-auto px-4 py-3 text-xs font-bold text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
