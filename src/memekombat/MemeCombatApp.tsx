// =========================================================================
// MEME KOMBAT — MAIN APPLICATION CONTAINER
// =========================================================================

import React, { useState } from 'react';
import { Fighter, BattleMode } from './types';
import { FIGHTERS } from './data/fighters';
import { CharacterSelect } from './components/CharacterSelect';
import { BattleArena } from './components/BattleArena';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { Swords, Zap, Volume2, VolumeX, ArrowLeft, Gamepad2, Sparkles } from 'lucide-react';
import { memeAudio } from './audio';

interface MemeCombatAppProps {
  onExitToSongverse: () => void;
  onOpenSpeedrun: () => void;
}

export const MemeCombatApp: React.FC<MemeCombatAppProps> = ({
  onExitToSongverse,
  onOpenSpeedrun,
}) => {
  const [currentView, setCurrentView] = useState<'character_select' | 'battle' | 'multiplayer_lobby'>('character_select');
  const [playerFighter, setPlayerFighter] = useState<Fighter>(FIGHTERS[0]);
  const [opponentFighter, setOpponentFighter] = useState<Fighter>(FIGHTERS[1]);
  const [battleMode, setBattleMode] = useState<BattleMode>('bot');
  const [muted, setMuted] = useState(memeAudio.isMuted());

  const handleToggleMute = () => {
    const isMutedNow = memeAudio.toggleMute();
    setMuted(isMutedNow);
    if (!isMutedNow) {
      memeAudio.playClick();
    }
  };

  const handleStartBattle = (p1: Fighter, p2: Fighter, mode: BattleMode) => {
    setPlayerFighter(p1);
    setOpponentFighter(p2);
    setBattleMode(mode);
    setCurrentView('battle');
  };

  return (
    <div className="min-h-screen w-full bg-[#08070d] text-white flex flex-col font-sans selection:bg-amber-400/30 selection:text-amber-200 overflow-x-hidden">
      
      {/* Dynamic Animated Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-amber-500/12 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-rose-600/12 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 left-1/3 w-[550px] h-[550px] bg-purple-600/12 rounded-full blur-[150px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#0b0a12]/95 backdrop-blur-xl border-b border-white/10 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Logo & Platform Switchers */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('character_select')}
              className="flex items-center gap-2 group cursor-pointer text-left"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.5)] group-hover:scale-105 transition-transform">
                <Swords className="w-5 h-5 fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="font-cinzel text-base sm:text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-purple-300">
                  MEME KOMBAT
                </span>
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-amber-400 font-bold -mt-1">
                  BATTLE ROYALE
                </span>
              </div>
            </button>

            {/* Quick Link to Return to SongVerse */}
            <button
              onClick={onExitToSongverse}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono transition-all cursor-pointer ml-2"
              title="Return to SongVerse Music Platform"
            >
              <ArrowLeft className="w-3 h-3 text-rose-400" />
              <span>SongVerse</span>
            </button>

            {/* Quick Link to Speedrun Everything */}
            <button
              onClick={onOpenSpeedrun}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#84cc16]/15 hover:bg-[#84cc16]/30 border border-[#84cc16]/40 text-[#a3e635] text-xs font-mono transition-all cursor-pointer"
              title="Open Speedrun Everything"
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>Speedrun Everything</span>
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Audio Mute Switch */}
            <button
              onClick={handleToggleMute}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
              title={muted ? 'Unmute Meme Soundboard' : 'Mute Soundboard'}
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Mobile Exit to SongVerse */}
            <button
              onClick={onExitToSongverse}
              className="lg:hidden p-2 rounded-xl bg-white/5 text-slate-300 border border-white/10 hover:text-white cursor-pointer"
              title="Back to SongVerse"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Main View Router */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start pb-16">
        {currentView === 'character_select' && (
          <CharacterSelect
            onSelectFighters={handleStartBattle}
            onOpenMultiplayerLobby={() => setCurrentView('multiplayer_lobby')}
          />
        )}

        {currentView === 'battle' && (
          <BattleArena
            playerFighter={playerFighter}
            opponentFighter={opponentFighter}
            mode={battleMode}
            onExitToSelect={() => setCurrentView('character_select')}
          />
        )}

        {currentView === 'multiplayer_lobby' && (
          <MultiplayerLobby
            onStartBattle={handleStartBattle}
            onBackToSelect={() => setCurrentView('character_select')}
          />
        )}
      </main>

    </div>
  );
};
