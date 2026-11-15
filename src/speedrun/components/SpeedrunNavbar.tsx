import React from 'react';
import { Zap, Volume2, VolumeX, Flame, Trophy, User, ArrowLeft, Gamepad2, Calendar } from 'lucide-react';
import { speedrunAudio } from '../audio';
import { speedrunEngine } from '../engine/speedrunEngine';

interface SpeedrunNavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onExitToSongverse: () => void;
}

export const SpeedrunNavbar: React.FC<SpeedrunNavbarProps> = ({
  currentTab,
  onSelectTab,
  onExitToSongverse,
}) => {
  const [muted, setMuted] = React.useState(speedrunAudio.isMuted());
  const stats = speedrunEngine.getStats();

  const handleToggleMute = () => {
    const isMutedNow = speedrunAudio.toggleMute();
    setMuted(isMutedNow);
    if (!isMutedNow) {
      speedrunAudio.playClick();
    }
  };

  const navItems = [
    { id: 'arena', label: 'Play', icon: Gamepad2 },
    { id: 'modes', label: 'Modes', icon: Zap },
    { id: 'daily', label: 'Daily Drop', icon: Calendar },
    { id: 'leaderboard', label: 'Rankings', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#08090a]/95 backdrop-blur-xl border-b border-[#84cc16]/25 select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand Logo & Back Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('arena')}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#84cc16] to-[#a3e635] flex items-center justify-center text-black shadow-[0_0_20px_rgba(163,230,53,0.45)] group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-current animate-pulse text-black" />
            </div>
            <div className="flex flex-col">
              <span className="font-cinzel text-base sm:text-lg font-black tracking-widest text-white group-hover:text-[#a3e635] transition-colors">
                SPEEDRUN
              </span>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#ef4444] font-black -mt-1">
                EVERYTHING
              </span>
            </div>
          </button>

          {/* Quick Exit Back to SongVerse */}
          <button
            onClick={onExitToSongverse}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ef4444]/15 hover:bg-[#ef4444] text-[#f87171] hover:text-white border border-[#ef4444]/40 text-xs font-mono font-bold transition-all cursor-pointer ml-2 shadow-sm"
            title="Return to SongVerse Music Platform"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Return to SongVerse</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  speedrunAudio.playClick();
                  onSelectTab(item.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#84cc16]/20 text-[#a3e635] border border-[#a3e635]/50 shadow-[0_0_15px_rgba(163,230,53,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#a3e635]' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Badges & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Streak Counter */}
          {stats.currentStreak > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/50 text-[#f87171] text-xs font-mono font-bold animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-current text-[#ef4444]" />
              <span>{stats.currentStreak} Streak</span>
            </div>
          )}

          {/* Level Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#84cc16]/20 border border-[#a3e635]/40 text-[#a3e635] text-xs font-mono font-bold">
            <span>Lv.{stats.level}</span>
          </div>

          {/* Audio Mute Switch */}
          <button
            onClick={handleToggleMute}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-[#a3e635] transition-colors cursor-pointer"
            title={muted ? 'Unmute Sound FX' : 'Mute Sound FX'}
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-[#ef4444]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#a3e635]" />
            )}
          </button>

          {/* Mobile Back to Songverse */}
          <button
            onClick={onExitToSongverse}
            className="lg:hidden p-2 rounded-xl bg-[#ef4444]/20 text-[#f87171] border border-[#ef4444]/40 hover:bg-[#ef4444] hover:text-white transition-all cursor-pointer"
            title="Exit to SongVerse"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
};
