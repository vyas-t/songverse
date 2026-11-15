import React, { useState, useEffect } from 'react';
import {
  Zap,
  Swords,
  Trophy,
  X,
  Sparkles,
  Flame,
  RotateCcw,
  Share2,
  CheckCircle2,
  XCircle,
  Radio
} from 'lucide-react';
import {
  rankedBlitzService,
  BlitzMatchState,
  BlitzRankInfo
} from '../../services/rankedBlitzService';
import { gameEngine } from '../../services/gameEngine';
import { musicCatalogue } from '../../services/musicCatalogue';
import { Track } from '../../types';
import { AudioPlayer } from '../game/AudioPlayer';
import { SongSearchInput } from '../game/SongSearchInput';
import { audioEngine } from '../../services/audioEngine';
import { soundEffectsService } from '../../services/soundEffectsService';
import { ShareResultModal } from '../common/ShareResultModal';

interface RankedBlitzModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
}

type BlitzStage = 'queueing' | 'matched' | 'playing' | 'completed';

export const RankedBlitzModal: React.FC<RankedBlitzModalProps> = ({
  isOpen,
  onClose,
  playerName
}) => {
  const [stage, setStage] = useState<BlitzStage>('queueing');
  const [statusMessage, setStatusMessage] = useState<string>('Searching for challenger in your Elo bracket...');
  const [matchState, setMatchState] = useState<BlitzMatchState | null>(null);
  const [matchCountdown, setMatchCountdown] = useState<number>(3);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [roundPoints, setRoundPoints] = useState<number>(100);
  const [roundAnswered, setRoundAnswered] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [stats, setStats] = useState(rankedBlitzService.getStats());

  useEffect(() => {
    return rankedBlitzService.subscribe(() => {
      setStats(rankedBlitzService.getStats());
    });
  }, []);

  // Matchmaking initialization
  useEffect(() => {
    if (!isOpen) {
      setStage('queueing');
      setMatchState(null);
      audioEngine.stop();
      return;
    }

    let isMounted = true;
    setStage('queueing');
    setStatusMessage('Searching for 1v1 challenger...');

    rankedBlitzService.findMatch((msg) => {
      if (isMounted) setStatusMessage(msg);
    }).then((match) => {
      if (!isMounted) return;
      setMatchState(match);
      setStage('matched');
      soundEffectsService.playCorrectChime(1);

      // 3-second countdown to match start
      let count = 3;
      setMatchCountdown(3);
      const interval = setInterval(() => {
        count -= 1;
        setMatchCountdown(count);
        if (count <= 0) {
          clearInterval(interval);
          if (isMounted) {
            startBlitzRound(1);
          }
        }
      }, 1000);
    }).catch(() => {});

    return () => {
      isMounted = false;
      audioEngine.stop();
    };
  }, [isOpen]);

  const startBlitzRound = (roundNum: number) => {
    const allTracks = musicCatalogue.getAllTracks();
    const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
    setCurrentTrack(randomTrack);
    setSelectedTrack(null);
    setRoundPoints(100);
    setRoundAnswered(false);
    setStage('playing');
  };

  const handleGuess = (isCorrect: boolean) => {
    if (roundAnswered || !matchState) return;
    setRoundAnswered(true);
    audioEngine.stop();

    const points = isCorrect ? roundPoints : 0;
    if (isCorrect) {
      soundEffectsService.playCorrectChime(2);
    } else {
      soundEffectsService.playWrongBuzz();
    }

    const updated = rankedBlitzService.recordRound(points);
    setMatchState({ ...updated });

    setTimeout(() => {
      if (updated.isCompleted) {
        setStage('completed');
      } else {
        startBlitzRound(updated.currentRound);
      }
    }, 1800);
  };

  if (!isOpen) return null;

  const playerTier = stats.tierInfo;

  return (
    <div className="sv-modal-viewport fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="sv-modal-surface bg-white dark:bg-sv-midnight border border-slate-200 dark:border-sv-burgundy rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-sv-burgundy">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4 fill-white" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Ranked 1v1 Blitz</span>
                <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-sv-gold px-2 py-0.5 rounded-full border border-amber-500/20">
                  {playerTier.badge} {playerTier.tier} · {stats.elo} Elo
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              audioEngine.stop();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-sv-navy hover:bg-slate-200 text-slate-500 hover:text-slate-900 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ============================================================ */}
        {/* STAGE 1: QUEUEING (PULSE RADAR MATCHMAKING)                  */}
        {/* ============================================================ */}
        {stage === 'queueing' && (
          <div className="text-center py-8 space-y-6">
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-sv-red/10 animate-ping" />
              <div className="absolute inset-3 rounded-full bg-sv-warm-orange/20 animate-pulse" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sv-red to-sv-orange text-white flex items-center justify-center shadow-lg relative z-10">
                <Swords className="w-8 h-8 animate-bounce" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                Finding Your 1v1 Opponent
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {statusMessage}
              </p>
            </div>

            <div className="inline-flex items-center gap-3 bg-slate-50 dark:bg-sv-navy/70 border border-slate-200 dark:border-sv-burgundy px-4 py-2 rounded-2xl text-xs font-mono">
              <span className="text-slate-400">Your Bracket:</span>
              <span className="font-bold text-sv-red dark:text-sv-warm-orange">
                {playerTier.badge} {playerTier.tier} ({stats.elo} Elo)
              </span>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 2: MATCHED (VS SCREEN & 3-SECOND COUNTDOWN)           */}
        {/* ============================================================ */}
        {stage === 'matched' && matchState && (
          <div className="text-center py-6 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-around gap-4">
              {/* Player Side */}
              <div className="space-y-2 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sv-red to-sv-orange text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md">
                  {playerName.charAt(0).toUpperCase()}
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">{playerName}</div>
                <div className="text-[10px] font-mono text-sv-red font-semibold">{stats.elo} Elo</div>
              </div>

              {/* VS Badge */}
              <div className="text-center space-y-1">
                <div className="text-2xl font-black text-amber-500 font-mono tracking-widest">VS</div>
                <div className="w-9 h-9 rounded-full bg-black text-white font-black text-sm flex items-center justify-center mx-auto font-mono">
                  {matchCountdown}
                </div>
              </div>

              {/* Opponent Side */}
              <div className="space-y-2 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md">
                  {matchState.opponent.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">{matchState.opponent.displayName}</div>
                <div className="text-[10px] font-mono text-indigo-400 font-semibold">{matchState.opponent.elo} Elo</div>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Best of 3 Rounds • Guess fastest to win Elo rating!
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 3: ACTIVE 1V1 DUEL PLAYING                             */}
        {/* ============================================================ */}
        {stage === 'playing' && matchState && currentTrack && (
          <div className="space-y-5 animate-in fade-in">
            {/* Live Duel HUD Scoreboard */}
            <div className="grid grid-cols-3 items-center bg-slate-50 dark:bg-sv-navy/80 border border-slate-200 dark:border-sv-burgundy rounded-2xl p-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">You</span>
                <div className="text-xl font-black font-mono text-sv-red dark:text-sv-warm-orange">
                  {matchState.playerScore} pts
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold bg-sv-red/10 text-sv-red px-2 py-0.5 rounded-full">
                  Round {matchState.currentRound} / 3
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">{matchState.opponent.displayName}</span>
                <div className="text-xl font-black font-mono text-indigo-400">
                  {matchState.opponentScore} pts
                </div>
              </div>
            </div>

            {/* Audio Clip Player */}
            <AudioPlayer
              track={currentTrack}
              level={1}
              roundStatus={roundAnswered ? 'won' : 'playing'}
            />

            {/* Fast Guess Search Input */}
            {!roundAnswered ? (
              <div className="space-y-3">
                <SongSearchInput
                  selectedTrack={selectedTrack}
                  onClearSelection={() => setSelectedTrack(null)}
                  onSelectTrack={(track) => {
                    setSelectedTrack(track);
                    const isCorrect = track.id === currentTrack?.id;
                    handleGuess(isCorrect);
                  }}
                  disabled={roundAnswered}
                />
                <button
                  type="button"
                  onClick={() => handleGuess(false)}
                  className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-center"
                >
                  Skip this track (0 pts)
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-2xl text-center space-y-1">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  {selectedTrack?.id === currentTrack.id ? '✓ Correct Guess!' : 'Round Resolved'}
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {currentTrack.title} — {currentTrack.artist}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 4: MATCH COMPLETED                                     */}
        {/* ============================================================ */}
        {stage === 'completed' && matchState && (
          <div className="text-center py-6 space-y-6 animate-in zoom-in-95">
            <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-lg ${
              matchState.winnerId === 'player'
                ? 'bg-gradient-to-tr from-amber-400 to-yellow-500 text-white shadow-amber-500/30'
                : 'bg-slate-800 text-slate-300'
            }`}>
              {matchState.winnerId === 'player' ? <Trophy className="w-8 h-8" /> : <Swords className="w-8 h-8" />}
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {matchState.winnerId === 'player'
                  ? 'Victory!'
                  : matchState.winnerId === 'tie'
                  ? 'Draw Match'
                  : 'Defeat'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Final Score: You {matchState.playerScore} pts vs {matchState.opponentScore} pts {matchState.opponent.displayName}
              </p>
            </div>

            {/* Elo Change Pill */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-50 dark:bg-sv-navy border border-slate-200 dark:border-sv-burgundy">
              <span className="text-xs font-bold text-slate-400">Elo Rating:</span>
              <span className={`text-base font-black font-mono ${
                matchState.eloChange >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {matchState.eloChange >= 0 ? `+${matchState.eloChange}` : matchState.eloChange} Elo
              </span>
              <span className="text-xs text-slate-400 font-mono">({stats.elo} Total)</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShareModalOpen(true)}
                className="w-full sm:w-auto px-5 py-3 text-xs font-black text-white bg-gradient-to-r from-sv-warm-orange to-sv-gold hover:brightness-110 rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>Share 1v1 Result</span>
              </button>

              <button
                onClick={() => {
                  setStage('queueing');
                  rankedBlitzService.findMatch((msg) => setStatusMessage(msg)).then((m) => {
                    setMatchState(m);
                    setStage('matched');
                  });
                }}
                className="w-full sm:w-auto px-6 py-3 text-xs font-black text-white bg-sv-red hover:bg-sv-crimson rounded-2xl shadow-xs transition-all cursor-pointer"
              >
                Play Another 1v1
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Wordle Share Result Modal */}
      {matchState && (
        <ShareResultModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          gameMode="1v1_blitz"
          score={matchState.playerScore}
          accuracy={matchState.winnerId === 'player' ? 100 : 50}
          streak={stats.currentStreak}
          totalRounds={matchState.totalRounds}
          roundsWon={matchState.winnerId === 'player' ? 2 : 1}
          playerName={playerName}
        />
      )}
    </div>
  );
};
