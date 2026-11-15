// =========================================================================
// MEME KOMBAT — CHARACTER SELECTION ARENA
// =========================================================================

import React, { useState } from 'react';
import { FIGHTERS } from '../data/fighters';
import { Fighter, BattleMode, MemeOrigin } from '../types';
import { Swords, Bot, Users, Globe, Shield, Sparkles, Volume2, ArrowRight } from 'lucide-react';
import { memeAudio } from '../audio';

interface CharacterSelectProps {
  onSelectFighters: (playerFighter: Fighter, opponentFighter: Fighter, mode: BattleMode) => void;
  onOpenMultiplayerLobby: () => void;
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({
  onSelectFighters,
  onOpenMultiplayerLobby,
}) => {
  const [selectedPlayerFighter, setSelectedPlayerFighter] = useState<Fighter>(FIGHTERS[0]);
  const [selectedOpponentFighter, setSelectedOpponentFighter] = useState<Fighter>(FIGHTERS[1]);
  const [selectedMode, setSelectedMode] = useState<BattleMode>('bot');
  const [originFilter, setOriginFilter] = useState<'all' | MemeOrigin>('all');

  const filteredFighters = originFilter === 'all'
    ? FIGHTERS
    : FIGHTERS.filter((f) => f.origin === originFilter);

  const handleStartMatch = () => {
    memeAudio.playAirhorn();
    if (selectedMode === 'multiplayer_room') {
      onOpenMultiplayerLobby();
    } else {
      onSelectFighters(selectedPlayerFighter, selectedOpponentFighter, selectedMode);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 select-none space-y-8 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div className="text-center space-y-2">
        <p className="text-xs font-mono tracking-[0.3em] uppercase text-amber-400 font-bold">
          INDIAN NOSTALGIA VS INTERNATIONAL BRAINROT
        </p>
        <h2 className="font-cinzel text-4xl sm:text-6xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-400 to-purple-400 tracking-wider">
          MEME KOMBAT
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
          Whose meme is more comedy deals massive emotional damage! Choose your champion.
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => {
            memeAudio.playClick();
            setSelectedMode('bot');
          }}
          className={`px-5 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            selectedMode === 'bot'
              ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.5)] scale-105'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>VS Meme Bot</span>
        </button>

        <button
          onClick={() => {
            memeAudio.playClick();
            setSelectedMode('local_2p');
          }}
          className={`px-5 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            selectedMode === 'local_2p'
              ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] scale-105'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>2-Player Local Duel</span>
        </button>

        <button
          onClick={() => {
            memeAudio.playClick();
            setSelectedMode('multiplayer_room');
            onOpenMultiplayerLobby();
          }}
          className={`px-5 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            selectedMode === 'multiplayer_room'
              ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-105'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Multiplayer Rooms</span>
        </button>
      </div>

      {/* Origin Filter Pill Group */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setOriginFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
            originFilter === 'all'
              ? 'bg-white/20 text-white border border-white/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All Champions ({FIGHTERS.length})
        </button>
        <button
          onClick={() => setOriginFilter('india')}
          className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
            originFilter === 'india'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🇮🇳 Indian Memes (5)
        </button>
        <button
          onClick={() => setOriginFilter('international')}
          className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
            originFilter === 'international'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🌐 Global Viral (3)
        </button>
      </div>

      {/* Character Roster Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredFighters.map((fighter) => {
          const isSelectedPlayer = selectedPlayerFighter.id === fighter.id;
          const isSelectedOpponent = selectedOpponentFighter.id === fighter.id;

          return (
            <div
              key={fighter.id}
              onClick={() => {
                memeAudio.playClick();
                setSelectedPlayerFighter(fighter);
                // In bot mode, pick a different opponent automatically if collision
                if (selectedOpponentFighter.id === fighter.id) {
                  const other = FIGHTERS.find((f) => f.id !== fighter.id) || FIGHTERS[0];
                  setSelectedOpponentFighter(other);
                }
              }}
              className={`group relative p-5 rounded-3xl bg-[#0e1117] border-2 transition-all duration-200 cursor-pointer shadow-lg hover:-translate-y-1.5 flex flex-col justify-between ${
                isSelectedPlayer
                  ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.35)] scale-[1.02]'
                  : isSelectedOpponent
                  ? 'border-rose-500/70'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              {/* Header Badges */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  {fighter.origin === 'india' ? '🇮🇳 DESI' : '🌐 GLOBAL'}
                </span>
                {isSelectedPlayer && (
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black shadow-md">
                    YOU (P1)
                  </span>
                )}
                {isSelectedOpponent && !isSelectedPlayer && (
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-black shadow-md">
                    OPPONENT
                  </span>
                )}
              </div>

              {/* Avatar & Title */}
              <div className="flex flex-col items-center justify-center my-3 text-center">
                <div className="w-20 h-20 rounded-3xl bg-white/5 border-2 border-white/10 flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                  {fighter.avatar}
                </div>
                <h3 className="font-black text-base text-white mt-2 group-hover:text-amber-300 transition-colors">
                  {fighter.name}
                </h3>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  {fighter.title}
                </p>
                <p className="text-[10px] font-serif italic text-amber-200/80 mt-1 line-clamp-2 px-1">
                  "{fighter.catchphrase}"
                </p>
              </div>

              {/* Stats & Ultimate Move Preview */}
              <div className="space-y-1.5 border-t border-white/10 pt-3 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>HP: <strong className="text-white">{fighter.maxHp}</strong></span>
                  <span>Energy: <strong className="text-amber-300">{fighter.baseEnergy}</strong></span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-[10px] text-slate-300 truncate">
                  ⚡ <strong>{fighter.ultimateMove.name}</strong> ({fighter.ultimateMove.damage} DMG)
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Matchup Summary & Launch Action Bar */}
      <div className="p-6 rounded-3xl bg-black/80 backdrop-blur-2xl border-2 border-amber-500/40 shadow-[0_0_50px_rgba(251,191,36,0.2)] flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* Matchup Preview */}
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="text-4xl">{selectedPlayerFighter.avatar}</span>
            <div>
              <p className="text-[10px] font-mono uppercase text-amber-400 font-bold">YOUR FIGHTER</p>
              <h4 className="font-black text-base text-white">{selectedPlayerFighter.name}</h4>
            </div>
          </div>

          <div className="font-cinzel text-xl font-black text-rose-400 px-2">VS</div>

          <div className="flex items-center gap-2">
            <span className="text-4xl">{selectedOpponentFighter.avatar}</span>
            <div>
              <p className="text-[10px] font-mono uppercase text-rose-400 font-bold">
                {selectedMode === 'bot' ? 'BOT FOE' : 'PLAYER 2'}
              </p>
              <h4 className="font-black text-base text-white">{selectedOpponentFighter.name}</h4>
            </div>
          </div>
        </div>

        {/* Lock In Button */}
        <button
          onClick={handleStartMatch}
          className="w-full sm:w-auto px-10 py-4 rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:from-amber-300 hover:via-rose-400 hover:to-purple-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_35px_rgba(251,191,36,0.6)] hover:shadow-[0_0_50px_rgba(251,191,36,0.9)] transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Swords className="w-5 h-5 fill-current" />
          <span>START MEME BATTLE</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>

    </div>
  );
};
