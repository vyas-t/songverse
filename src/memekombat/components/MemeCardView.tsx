// =========================================================================
// MEME KOMBAT — HOLOGRAPHIC MEME CARD COMPONENT
// =========================================================================

import React from 'react';
import { MemeCard } from '../types';
import { Zap, Shield, Heart, Sparkles } from 'lucide-react';
import { memeAudio } from '../audio';

interface MemeCardViewProps {
  card: MemeCard;
  isPlayable: boolean;
  onSelect: (card: MemeCard) => void;
  isCompact?: boolean;
}

export const MemeCardView: React.FC<MemeCardViewProps> = ({
  card,
  isPlayable,
  onSelect,
  isCompact = false,
}) => {
  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.35)]';
      case 'epic':
        return 'border-purple-400/70 shadow-[0_0_15px_rgba(192,132,252,0.25)]';
      case 'rare':
        return 'border-sky-400/60 shadow-[0_0_12px_rgba(56,189,248,0.2)]';
      default:
        return 'border-white/20';
    }
  };

  const handleClick = () => {
    if (!isPlayable) return;
    memeAudio.playClick();
    onSelect(card);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative rounded-2xl bg-[#0e1117] border-2 transition-all duration-200 select-none flex flex-col justify-between ${
        getRarityBorder(card.rarity)
      } ${
        isPlayable
          ? 'cursor-pointer hover:-translate-y-2 hover:scale-105 active:scale-95'
          : 'opacity-40 cursor-not-allowed filter grayscale-[40%]'
      } ${isCompact ? 'p-3 w-36 h-52' : 'p-4 w-44 sm:w-48 h-64 sm:h-72'}`}
    >
      {/* Top Banner: Origin & Energy Cost */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 font-bold text-slate-300">
          {card.origin === 'india' ? '🇮🇳 DESI' : '🌐 GLOBAL'}
        </span>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-mono font-black">
          <Zap className="w-3 h-3 fill-current" />
          <span>{card.energyCost}</span>
        </div>
      </div>

      {/* Visual Meme Icon */}
      <div className="flex flex-col items-center justify-center my-1">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl sm:text-4xl shadow-inner group-hover:scale-110 transition-transform">
          {card.visualEmoji}
        </div>
        <h4 className="font-black text-xs sm:text-sm text-white text-center mt-2 truncate w-full group-hover:text-amber-300 transition-colors">
          {card.title}
        </h4>
        <p className="text-[10px] font-serif italic text-slate-400 text-center line-clamp-2 px-1 mt-0.5">
          "{card.quote}"
        </p>
      </div>

      {/* Bottom Stats Footer: Damage / Heals / Comedy Score */}
      <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[11px] font-mono font-black">
        <div className="flex items-center gap-1 text-red-400">
          <span>⚔️</span>
          <span>{card.baseDamage} DMG</span>
        </div>

        {card.healAmount && (
          <div className="flex items-center gap-0.5 text-emerald-400">
            <Heart className="w-3 h-3 fill-current" />
            <span>+{card.healAmount}</span>
          </div>
        )}

        {card.shieldAmount && (
          <div className="flex items-center gap-0.5 text-sky-400">
            <Shield className="w-3 h-3 fill-current" />
            <span>+{card.shieldAmount}</span>
          </div>
        )}

        <div className="text-[10px] text-amber-300/80">
          ⭐{card.comedyScore}
        </div>
      </div>
    </div>
  );
};
