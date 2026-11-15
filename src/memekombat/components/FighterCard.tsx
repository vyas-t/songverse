// =========================================================================
// MEME KOMBAT — FIGHTER HUD DISPLAY
// =========================================================================

import React from 'react';
import { BattleFighterState } from '../types';
import { Heart, Zap, Shield, Crown, Sparkles, MessageCircle } from 'lucide-react';

interface FighterCardProps {
  state: BattleFighterState;
  isPlayer: boolean;
  onCastUltimate?: () => void;
  canCastUltimate?: boolean;
}

export const FighterCard: React.FC<FighterCardProps> = ({
  state,
  isPlayer,
  onCastUltimate,
  canCastUltimate = false,
}) => {
  const hpPercent = Math.max(0, Math.min(100, Math.floor((state.currentHp / state.fighter.maxHp) * 100)));
  const energyPercent = Math.max(0, Math.min(100, Math.floor((state.currentEnergy / 100) * 100)));

  return (
    <div
      className={`relative p-5 rounded-3xl bg-[#0e1117] border-2 shadow-2xl flex flex-col justify-between w-full max-w-sm sm:max-w-md ${
        isPlayer ? 'border-sky-500/40' : 'border-red-500/40'
      }`}
    >
      {/* Speech Taunt Bubble */}
      {state.tauntBubble && (
        <div className="absolute -top-12 left-4 right-4 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-2.5 rounded-2xl bg-black/90 border border-white/20 text-white font-mono text-xs flex items-center gap-2 shadow-xl">
            <MessageCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate italic">"{state.tauntBubble}"</span>
          </div>
        </div>
      )}

      {/* Top Profile Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border-2 border-white/20 bg-gradient-to-tr from-white/10 to-white/5"
          style={{ borderColor: state.fighter.themeColor }}
        >
          {state.fighter.avatar}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-black text-base sm:text-lg text-white truncate">
              {state.fighter.name}
            </h3>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              {state.fighter.origin === 'india' ? '🇮🇳' : '🌐'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 truncate">
            {state.fighter.title}
          </p>
        </div>

        {/* Shield Counter if present */}
        {state.shield > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 text-xs font-mono font-bold">
            <Shield className="w-3.5 h-3.5 fill-current" />
            <span>{state.shield}</span>
          </div>
        )}
      </div>

      {/* Health Bar */}
      <div className="space-y-1 my-3">
        <div className="flex justify-between items-center text-xs font-mono font-bold">
          <span className="flex items-center gap-1 text-red-400">
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>HP</span>
          </span>
          <span className="text-white">
            {state.currentHp} / {state.fighter.maxHp}
          </span>
        </div>
        <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              hpPercent < 25
                ? 'bg-red-500 shadow-[0_0_12px_#ef4444]'
                : hpPercent < 55
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* Energy Bar */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between items-center text-xs font-mono font-bold">
          <span className="flex items-center gap-1 text-amber-300">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>AURA ENERGY</span>
          </span>
          <span className="text-white">{state.currentEnergy} / 100</span>
        </div>
        <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-300"
            style={{ width: `${energyPercent}%` }}
          />
        </div>
      </div>

      {/* Ultimate Move Cast Button for Player */}
      {isPlayer && onCastUltimate && (
        <button
          onClick={onCastUltimate}
          disabled={!canCastUltimate}
          className={`w-full py-2.5 px-4 rounded-2xl font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            canCastUltimate
              ? 'bg-gradient-to-r from-amber-400 to-rose-500 text-black shadow-[0_0_25px_rgba(251,191,36,0.5)] hover:scale-105 active:scale-95 cursor-pointer animate-pulse'
              : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-4 h-4 fill-current" />
          <span>ULTIMATE: {state.fighter.ultimateMove.name} ({state.fighter.ultimateMove.energyCost} NRG)</span>
        </button>
      )}

      {/* Opponent Ultimate Status */}
      {!isPlayer && (
        <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-white/10">
          <span>Ultimate: {state.fighter.ultimateMove.name}</span>
          <span className={state.currentEnergy >= state.fighter.ultimateMove.energyCost ? 'text-amber-400 font-bold animate-pulse' : 'text-slate-500'}>
            {state.currentEnergy >= state.fighter.ultimateMove.energyCost ? 'READY 🔥' : 'CHARGING'}
          </span>
        </div>
      )}

    </div>
  );
};
