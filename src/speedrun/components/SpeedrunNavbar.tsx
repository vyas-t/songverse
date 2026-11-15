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
    <header className="sticky top-0 z-50 w-full bg-[#070414]/90 backdrop-blur-xl border-b border-purple-500/20 select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand Logo & Back Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('arena')}
            className="flex items-center gap-2 group cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(245,158,66,0.45)] group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-current animate-pulse text-amber-200" />
            </div>
            <div className="flex flex-col">
              <span className="font-cinzel text-base sm:text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-purple-300">
                SPEEDRUN
              </span>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-amber-400 font-bold -mt-1">
                EVERYTHING
              </span>
            </div>
          </button>

          {/* Quick Exit Back to SongVerse */}
          <button
            onClick={onExitToSongverse}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono transition-all cursor-pointer ml-2"
            title="Return to SongVerse Music Platform"
          >
            <ArrowLeft className="w-3 h-3 text-rose-400" />
            <span>SongVerse</span>
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
                    ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,66,0.25)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Player Level & Sound Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak Indicator */}
          {stats.currentStreak > 0 && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono font-black">
              <Flame className="w-3.5 h-3.5 fill-current text-rose-400 animate-bounce" />
              <span>{stats.currentStreak}x</span>
            </div>
          )}

          {/* Player Level Pill */}
          <button
            onClick={() => onSelectTab('profile')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs font-mono font-bold hover:bg-purple-500/30 transition-all cursor-pointer"
          >
            <span className="text-amber-400">Lv.{stats.level}</span>
            <span className="hidden sm:inline text-slate-300">({stats.totalScore} pts)</span>
          </button>

          {/* Audio Mute Button */}
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Mobile Back to Songverse */}
          <button
            onClick={onExitToSongverse}
            className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Return to SongVerse"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
