// =========================================================================
// MEME KOMBAT — MAGICAL SPELL EFFECTS & COMBAT OVERLAY
// =========================================================================

import React, { useEffect, useState } from 'react';
import { ActiveSpell } from '../types';
import { memeAudio } from '../audio';

interface SpellEffectsOverlayProps {
  spell: ActiveSpell | null;
  onEffectEnd: () => void;
}

export const SpellEffectsOverlay: React.FC<SpellEffectsOverlayProps> = ({ spell, onEffectEnd }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!spell) {
      setVisible(false);
      return;
    }

    setVisible(true);

    // Trigger associated sound
    switch (spell.type) {
      case 'airhorn':
        memeAudio.playAirhorn();
        break;
      case 'bonk':
        memeAudio.playBonk();
        break;
      case 'violin':
        memeAudio.playSadViolin();
        break;
      case 'laser':
        memeAudio.playLaser();
        break;
      case 'mud_splash':
      case 'eggplant':
        memeAudio.playBoing();
        break;
      case 'explosion':
      case 'helicopter':
      case 'binod_flood':
        memeAudio.playExplosion();
        break;
      case 'rainbow':
      default:
        memeAudio.playRainbowChime();
        break;
    }

    const timer = setTimeout(() => {
      setVisible(false);
      onEffectEnd();
    }, 1400);

    return () => clearTimeout(timer);
  }, [spell]);

  if (!spell || !visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      
      {/* 1. Full Screen Tint Flash */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 animate-pulse ${
          spell.isCritical ? 'bg-amber-500/20' : 'bg-red-500/15'
        }`}
      />

      {/* 2. Effect Graphics based on type */}
      {spell.type === 'laser' && (
        <div className="relative w-full flex items-center justify-center">
          <div className="w-full h-8 bg-gradient-to-r from-cyan-400 via-white to-pink-500 shadow-[0_0_60px_#06b6d4] animate-pulse" />
          <div className="absolute text-6xl animate-ping">⚡</div>
        </div>
      )}

      {spell.type === 'airhorn' && (
        <div className="flex flex-col items-center justify-center space-y-4 animate-in zoom-in-75 duration-200">
          <div className="flex items-center gap-6 text-7xl animate-bounce">
            <span>📢</span>
            <span className="text-8xl">🔥</span>
            <span>📢</span>
          </div>
          <span className="font-mono text-3xl font-black text-amber-300 tracking-widest uppercase bg-black/80 px-6 py-2 rounded-2xl border-2 border-amber-400 shadow-[0_0_30px_#f59e0b]">
            MLG AIRHORN BLAST!
          </span>
        </div>
      )}

      {spell.type === 'bonk' && (
        <div className="flex flex-col items-center justify-center animate-in zoom-in-50 duration-150">
          <div className="text-9xl transform -rotate-12 animate-bounce">🩴</div>
          <span className="font-black text-5xl font-cinzel text-red-500 drop-shadow-[0_0_30px_#ef4444] mt-2">
            SLIPPER THWACK!
          </span>
        </div>
      )}

      {spell.type === 'violin' && (
        <div className="flex flex-col items-center justify-center space-y-3 bg-black/40 backdrop-blur-sm p-8 rounded-3xl animate-in fade-in duration-300">
          <div className="text-8xl animate-pulse">🎻</div>
          <span className="font-mono text-3xl font-black text-purple-300 italic tracking-wider">
            ~ Moye Moye Melodrama ~
          </span>
          <span className="text-xs font-mono text-slate-300">Violin plays in slow-motion grayscale...</span>
        </div>
      )}

      {spell.type === 'mud_splash' && (
        <div className="flex flex-col items-center justify-center space-y-2 animate-in zoom-in-90 duration-200">
          <div className="text-9xl animate-bounce">🌊💩</div>
          <span className="font-black text-4xl text-amber-500 bg-black/80 px-6 py-2 rounded-2xl border border-amber-400">
            LORD PUNEET MUD SPLASH!
          </span>
        </div>
      )}

      {spell.type === 'eggplant' && (
        <div className="flex flex-col items-center justify-center space-y-3 animate-in spin-in-180 duration-300">
          <div className="text-9xl animate-bounce">🍆❓</div>
          <span className="font-black text-4xl text-purple-400 bg-black/80 px-6 py-2 rounded-2xl border border-purple-500">
            AAYEIN? BAIGAN!
          </span>
        </div>
      )}

      {spell.type === 'binod_flood' && (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute inset-0 grid grid-cols-4 gap-4 p-8 opacity-60">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="bg-emerald-500 text-black font-black text-xl px-4 py-2 rounded-xl text-center shadow-lg animate-bounce">
                BINOD
              </div>
            ))}
          </div>
          <span className="relative z-10 text-6xl font-black text-emerald-300 bg-black/90 px-8 py-4 rounded-3xl border-2 border-emerald-400">
            BINOD TSUNAMI!
          </span>
        </div>
      )}

      {spell.type === 'helicopter' && (
        <div className="flex flex-col items-center justify-center space-y-3 animate-in zoom-in-75 duration-200">
          <div className="text-9xl animate-spin">🏏🚁</div>
          <span className="font-mono text-4xl font-black text-sky-400 bg-black/80 px-6 py-2 rounded-2xl border-2 border-sky-400 shadow-[0_0_30px_#38bdf8]">
            7 LETTERS: THALA FOR A REASON!
          </span>
        </div>
      )}

      {spell.type === 'explosion' && (
        <div className="flex flex-col items-center justify-center space-y-3 animate-in zoom-in-50 duration-150">
          <div className="text-9xl animate-ping">💥🔥</div>
          <span className="font-cinzel text-5xl font-black text-orange-400 drop-shadow-[0_0_40px_#f97316]">
            KABOOM!
          </span>
        </div>
      )}

      {spell.type === 'rainbow' && (
        <div className="flex flex-col items-center justify-center space-y-3 animate-in zoom-in-75 duration-200">
          <div className="text-8xl animate-bounce">🌈✨</div>
          <span className="font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 bg-black/80 px-6 py-2 rounded-2xl border border-white/20">
            NEVER GONNA GIVE YOU UP!
          </span>
        </div>
      )}

      {/* 3. Floating Damage Pop-Up */}
      <div className="absolute top-1/3 flex flex-col items-center animate-in slide-in-from-bottom-6 duration-200">
        <span
          className={`font-cinzel text-6xl sm:text-8xl font-black tracking-wider ${
            spell.isCritical
              ? 'text-amber-300 drop-shadow-[0_0_35px_rgba(251,191,36,0.9)]'
              : 'text-red-500 drop-shadow-[0_0_35px_rgba(239,68,68,0.9)]'
          }`}
        >
          -{spell.damage}
        </span>
        <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.3em] font-black text-white bg-black/80 px-4 py-1 rounded-full border border-white/20 mt-1">
          {spell.isCritical ? '⚡ CRITICAL COMEDY COMBO!' : 'EMOTIONAL DAMAGE'}
        </span>
      </div>

    </div>
  );
};
