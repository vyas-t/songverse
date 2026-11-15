// =========================================================================
// MEME KOMBAT — MULTIPLAYER ROOM LOBBY
// =========================================================================

import React, { useState } from 'react';
import { Fighter } from '../types';
import { FIGHTERS } from '../data/fighters';
import { Globe, Users, Copy, Check, Play, ArrowLeft, Sparkles, Shield, Bot } from 'lucide-react';
import { memeAudio } from '../audio';

interface MultiplayerLobbyProps {
  onStartBattle: (playerFighter: Fighter, opponentFighter: Fighter, mode: 'local_2p' | 'multiplayer_room') => void;
  onBackToSelect: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  onStartBattle,
  onBackToSelect,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'local'>('create');
  const [createdRoomCode, setCreatedRoomCode] = useState(() => `MK-${Math.floor(1000 + Math.random() * 9000)}`);
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedHostFighter, setSelectedHostFighter] = useState<Fighter>(FIGHTERS[0]);
  const [selectedGuestFighter, setSelectedGuestFighter] = useState<Fighter>(FIGHTERS[1]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(createdRoomCode);
    setCopied(true);
    memeAudio.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchRoomBattle = () => {
    memeAudio.playAirhorn();
    onStartBattle(selectedHostFighter, selectedGuestFighter, 'multiplayer_room');
  };

  const handleLaunchLocal2P = () => {
    memeAudio.playAirhorn();
    onStartBattle(selectedHostFighter, selectedGuestFighter, 'local_2p');
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 select-none space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToSelect}
          className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Fighter Select</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-mono font-bold">
          <Globe className="w-3.5 h-3.5" />
          <span>MULTIPLAYER ARENA</span>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="font-cinzel text-3xl sm:text-5xl font-black uppercase text-white tracking-wider">
          LIVE MEME COMBAT
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          Challenge friends locally or connect via private room codes to settle who has the funnier memes.
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'create'
              ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
          }`}
        >
          Create Room
        </button>

        <button
          onClick={() => setActiveTab('join')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'join'
              ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
          }`}
        >
          Join With Code
        </button>

        <button
          onClick={() => setActiveTab('local')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'local'
              ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
          }`}
        >
          2-Player Same Screen
        </button>
      </div>

      {/* Tab 1: Create Room */}
      {activeTab === 'create' && (
        <div className="p-7 sm:p-9 rounded-3xl bg-[#0e1117] border-2 border-amber-400/50 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <p className="text-xs font-mono uppercase text-slate-400">Share this Room Code with your rival:</p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-4xl sm:text-5xl font-black text-amber-300 tracking-widest bg-black/60 px-6 py-2.5 rounded-2xl border border-white/10">
                {createdRoomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title="Copy Room Code"
              >
                {copied ? <Check className="w-6 h-6 text-emerald-400" /> : <Copy className="w-6 h-6" />}
              </button>
            </div>
            {copied && (
              <p className="text-xs font-mono text-emerald-400 font-bold">✓ Copied to clipboard!</p>
            )}
          </div>

          {/* Fighter Selection for Host */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <p className="text-xs font-mono uppercase text-slate-300 font-bold text-center">
              Choose Your Fighter:
            </p>
            <div className="grid grid-cols-4 gap-2">
              {FIGHTERS.slice(0, 8).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedHostFighter(f)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    selectedHostFighter.id === f.id
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-md scale-105'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-2xl">{f.avatar}</span>
                  <span className="text-[10px] font-mono font-black truncate w-full">{f.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Launch Button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleLaunchRoomBattle}
              className="px-10 py-4 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_35px_rgba(251,191,36,0.6)] hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START ROOM BATTLE</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Join Code */}
      {activeTab === 'join' && (
        <div className="p-7 sm:p-9 rounded-3xl bg-[#0e1117] border-2 border-rose-500/50 shadow-2xl space-y-6 text-center">
          <div className="space-y-3 max-w-xs mx-auto">
            <p className="text-xs font-mono uppercase text-slate-400">Enter Host Room Code:</p>
            <input
              type="text"
              placeholder="e.g. MK-4820"
              value={inputRoomCode}
              onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
              className="w-full text-center font-mono text-2xl font-black px-4 py-3 rounded-2xl bg-black/60 border-2 border-rose-500/50 text-white outline-none focus:border-rose-400 shadow-lg"
            />
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => {
                if (!inputRoomCode.trim()) return;
                handleLaunchRoomBattle();
              }}
              disabled={!inputRoomCode.trim()}
              className="px-10 py-4 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              JOIN & FIGHT
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Local 2-Player */}
      {activeTab === 'local' && (
        <div className="p-7 sm:p-9 rounded-3xl bg-[#0e1117] border-2 border-purple-500/50 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h3 className="font-bold text-lg text-white">Same-Screen Pass & Play Duel</h3>
            <p className="text-xs text-slate-300">Player 1 and Player 2 take turns selecting meme cards from the same device.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-sky-400/40 text-center space-y-2">
              <span className="text-[10px] font-mono uppercase text-sky-400 font-bold">Player 1</span>
              <div className="text-4xl">{selectedHostFighter.avatar}</div>
              <h4 className="font-black text-white text-sm">{selectedHostFighter.name}</h4>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-rose-400/40 text-center space-y-2">
              <span className="text-[10px] font-mono uppercase text-rose-400 font-bold">Player 2</span>
              <div className="text-4xl">{selectedGuestFighter.avatar}</div>
              <h4 className="font-black text-white text-sm">{selectedGuestFighter.name}</h4>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={handleLaunchLocal2P}
              className="px-10 py-4 rounded-full bg-gradient-to-r from-sky-400 via-purple-500 to-rose-500 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_35px_rgba(168,85,247,0.6)] hover:scale-105 active:scale-95 cursor-pointer"
            >
              START 2-PLAYER DUEL
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
