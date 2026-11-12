import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  Trophy,
  Flame,
  Award,
  Music,
  ExternalLink,
  MessageCircle,
  Twitter
} from 'lucide-react';

export interface RoundShareItem {
  roundNumber: number;
  level: number;
  isWon: boolean;
  points: number;
  title?: string;
  artist?: string;
}

interface ShareResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameMode: 'solo' | 'daily' | 'multiplayer' | '1v1_blitz';
  score: number;
  accuracy: number;
  streak: number;
  totalRounds: number;
  roundsWon: number;
  roundHistory?: RoundShareItem[];
  playerName?: string;
}

export function formatShareCardText(params: {
  gameMode: string;
  score: number;
  accuracy?: number;
  totalScore?: number;
  streak: number;
  totalRounds?: number;
  roundsWon?: number;
  history?: { round: number; won: boolean; attempts: number }[];
  roundHistory?: RoundShareItem[];
}): string {
  const modeTitles: Record<string, string> = {
    daily: 'Daily Music Challenge',
    solo: 'Solo Classic Arena',
    multiplayer: 'Multiplayer Party Duel',
    '1v1_blitz': 'Ranked 1v1 Blitz'
  };
  const modeTitle = modeTitles[params.gameMode] || 'SongVerse Arena';

  const matrixLines: string[] = [];
  if (params.roundHistory && params.roundHistory.length > 0) {
    params.roundHistory.forEach((r) => {
      let emoji = '🟥';
      if (r.isWon) {
        if (r.level === 1) emoji = '🟩';
        else if (r.level === 2) emoji = '🟩';
        else if (r.level === 3) emoji = '🟧';
        else emoji = '🟨';
      }
      matrixLines.push(`R${r.roundNumber}: ${emoji} (${r.isWon ? `${r.points} pts • L${r.level}` : 'Missed'})`);
    });
  } else if (params.history && params.history.length > 0) {
    params.history.forEach((h) => {
      matrixLines.push(`R${h.round}: ${h.won ? '🟩' : '🟥'}`);
    });
  } else {
    const total = params.totalRounds || 5;
    const won = params.roundsWon || 0;
    matrixLines.push('🟩 '.repeat(won) + '🟥 '.repeat(Math.max(0, total - won)));
  }

  const scoreDisplay = params.totalScore
    ? `${params.score} / ${params.totalScore} pts`
    : `${params.score} pts`;

  return [
    `🎵 SongVerse — ${modeTitle}`,
    `Score: ${scoreDisplay} | Streak: 🔥 ${params.streak}`,
    ...(params.roundsWon !== undefined && params.totalRounds !== undefined
      ? [`Rounds Won: ${params.roundsWon}/${params.totalRounds}`]
      : []),
    '',
    ...matrixLines,
    '',
    'Can your ear beat my score? 🎧 Play free:',
    'https://songverse.pages.dev'
  ].join('\n');
}

export const ShareResultModal: React.FC<ShareResultModalProps> = ({
  isOpen,
  onClose,
  gameMode,
  score,
  accuracy,
  streak,
  totalRounds,
  roundsWon,
  roundHistory = [],
  playerName = 'Player'
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const modeTitles: Record<string, string> = {
    daily: 'Daily Music Challenge',
    solo: 'Solo Classic Arena',
    multiplayer: 'Multiplayer Party Duel',
    '1v1_blitz': 'Ranked 1v1 Blitz'
  };

  const modeTitle = modeTitles[gameMode] || 'SongVerse Arena';

  const shareText = formatShareCardText({
    gameMode,
    score,
    accuracy,
    streak,
    totalRounds,
    roundsWon,
    roundHistory
  });

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `SongVerse — ${modeTitle}`,
          text: shareText,
          url: 'https://songverse.pages.dev'
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleTwitterShare = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-sv-midnight border border-slate-200 dark:border-sv-burgundy rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-sv-navy hover:bg-slate-200 dark:hover:bg-sv-burgundy/40 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sv-red to-sv-orange text-white flex items-center justify-center shrink-0 shadow-md">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
              Share Your Score
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Brag to friends and challenge them to beat your ear!
            </p>
          </div>
        </div>

        {/* Card Preview Container */}
        <div className="p-4 bg-gradient-to-b from-slate-900 to-sv-midnight border-2 border-sv-warm-orange/30 rounded-2xl text-white space-y-3 shadow-inner">
          
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-sv-warm-orange">🎵 SongVerse</span>
              <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                {modeTitle}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-sv-gold">
              🔥 {streak} Streak
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center py-1">
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Score</div>
              <div className="text-base font-black text-sv-gold font-mono">{score}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Accuracy</div>
              <div className="text-base font-black text-emerald-400 font-mono">{accuracy}%</div>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Won</div>
              <div className="text-base font-black text-white font-mono">{roundsWon}/{totalRounds}</div>
            </div>
          </div>

          {/* Emoji Matrix Box */}
          <div className="bg-black/40 rounded-xl p-3 font-mono text-xs space-y-1 text-slate-200 border border-white/5">
            {matrixLines.map((line, idx) => (
              <div key={idx} className="tracking-wide">{line}</div>
            ))}
          </div>

          <div className="text-[11px] text-center text-slate-400 pt-1">
            songverse.pages.dev &bull; Can you beat @{playerName}?
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-sv-red to-sv-orange hover:brightness-110 text-white'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Result Card'}</span>
            </button>

            {typeof navigator !== 'undefined' && Boolean((navigator as any).share) && (
              <button
                onClick={handleNativeShare}
                className="py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 dark:bg-sv-navy hover:bg-slate-200 dark:hover:bg-sv-burgundy/40 text-slate-800 dark:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-sv-burgundy"
                title="Open system share"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleTwitterShare}
              className="flex-1 py-2.5 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Twitter className="w-4 h-4" />
              <span>Share on X</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
